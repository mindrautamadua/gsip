import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase/server";

// POST /api/actions — create/update a Layer-5 action (mitigation/owner/status).
// Auth: signed-in analyst/admin, or Authorization: Bearer <GSIP_INGEST_TOKEN>.
export async function POST(req: Request) {
  const token = process.env.GSIP_INGEST_TOKEN;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = await getSessionUser().catch(() => null);
  const roleOk = user?.role === "admin" || user?.role === "analyst";
  const authed = roleOk || (!!token && bearer === token);
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!token) return NextResponse.json({ error: "GSIP_INGEST_TOKEN not configured" }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // require an event + type for new rows; title required always
  if (!body.id && !body.event_id) return NextResponse.json({ error: "event_id required" }, { status: 400 });
  if (!body.action_type_code) return NextResponse.json({ error: "action_type_code required" }, { status: 400 });
  if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const { data, error } = await supabase.rpc("gsip_upsert_action", { p_token: token, p_action: body });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...(data as object) });
}
