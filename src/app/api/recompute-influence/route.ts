import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase/server";
import { getMarketCaps } from "@/lib/marketcap";

// POST /api/recompute-influence
// Auth: admin session OR  Authorization: Bearer <GSIP_INGEST_TOKEN>  (for schedulers).
// Refreshes market caps (best effort) then recomputes blended influence in-DB.
export async function POST(req: Request) {
  const token = process.env.GSIP_INGEST_TOKEN;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = await getSessionUser().catch(() => null);
  const authed = user?.role === "admin" || (!!token && bearer === token);
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!token) return NextResponse.json({ error: "GSIP_INGEST_TOKEN not configured" }, { status: 500 });

  // company entities that carry a ticker
  const { data: companies } = await supabase
    .from("entities")
    .select("slug,attributes")
    .not("attributes->>ticker", "is", null)
    .returns<{ slug: string; attributes: { ticker?: string } | null }[]>();

  const symToSlug = new Map<string, string>();
  (companies ?? []).forEach((c) => {
    if (c.attributes?.ticker) symToSlug.set(c.attributes.ticker, c.slug);
  });

  const caps = await getMarketCaps([...symToSlug.keys()]);
  const capsBySlug: Record<string, number> = {};
  for (const [sym, cap] of Object.entries(caps)) {
    const slug = symToSlug.get(sym);
    if (slug) capsBySlug[slug] = cap;
  }

  const { data, error } = await supabase.rpc("gsip_recompute_influence", {
    p_token: token,
    p_market_caps: capsBySlug,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    market_caps_refreshed: Object.keys(capsBySlug).length,
    result: data,
  });
}
