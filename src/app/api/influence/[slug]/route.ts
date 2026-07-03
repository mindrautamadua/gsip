import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase/server";
import { getPhotos, getGallery } from "@/lib/wiki";

type Insight = { label: string; value: string };

// Full influencer profile for the modal on /influence. Login-required
// (consistent with the app being gated); returns public entity data.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;

  const { data: e } = await supabase
    .from("entities")
    .select("id,name,slug,country_code,description,attributes,entity_types(label,icon)")
    .eq("slug", slug)
    .maybeSingle()
    .returns<{
      id: string;
      name: string;
      slug: string;
      country_code: string | null;
      description: string | null;
      attributes: {
        influence?: number | string;
        title?: string;
        wiki?: string;
        influence_breakdown?: { degree?: number; event_impact?: number; market_cap_usd_bn?: number | null };
        insights?: Insight[];
        gallery?: { url: string; caption?: string | null }[];
        operator?: string;
        stake?: string;
      } | null;
      entity_types: { label: string; icon: string | null } | null;
    }>();

  if (!e) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [{ data: edges }, { data: evLinks }, photos] = await Promise.all([
    supabase
      .from("entity_edges")
      .select("source_entity_id,target_entity_id,relationship_types(code,label)")
      .or(`source_entity_id.eq.${e.id},target_entity_id.eq.${e.id}`)
      .returns<{ source_entity_id: string; target_entity_id: string; relationship_types: { code: string; label: string } | null }[]>(),
    supabase
      .from("event_entities")
      .select("role,events(id,title,event_date,domains(icon))")
      .eq("entity_id", e.id)
      .returns<{ role: string; events: { id: string; title: string; event_date: string | null; domains: { icon: string | null } | null } | null }[]>(),
    getPhotos([e.attributes?.wiki]),
  ]);

  // location photos: curated gallery wins, else derive from Wikipedia media
  const curated = Array.isArray(e.attributes?.gallery) ? e.attributes!.gallery! : [];
  const gallery = curated.length
    ? curated.map((g) => ({ url: g.url, caption: g.caption ?? null }))
    : await getGallery(e.attributes?.wiki);

  // strategic insights: curated list, with sensible fallbacks from attributes
  const insights: Insight[] = Array.isArray(e.attributes?.insights) ? e.attributes!.insights! : [];

  const rows = edges ?? [];
  const otherIds = [...new Set(rows.flatMap((x) => [x.source_entity_id, x.target_entity_id]).filter((id) => id !== e.id))];
  const { data: others } = otherIds.length
    ? await supabase
        .from("entities")
        .select("id,name,slug,entity_types(icon)")
        .in("id", otherIds)
        .returns<{ id: string; name: string; slug: string; entity_types: { icon: string | null } | null }[]>()
    : { data: [] as { id: string; name: string; slug: string; entity_types: { icon: string | null } | null }[] };
  const oMap = new Map((others ?? []).map((o) => [o.id, o]));

  const leads: { name: string; slug: string; icon: string | null }[] = [];
  const relationships: { rel: string; name: string; slug: string; icon: string | null; outgoing: boolean }[] = [];
  for (const x of rows) {
    const outgoing = x.source_entity_id === e.id;
    const other = oMap.get(outgoing ? x.target_entity_id : x.source_entity_id);
    if (!other) continue;
    const code = x.relationship_types?.code;
    if (outgoing && (code === "leads" || code === "founder_of")) {
      leads.push({ name: other.name, slug: other.slug, icon: other.entity_types?.icon ?? null });
    }
    relationships.push({
      rel: x.relationship_types?.label ?? "related",
      name: other.name,
      slug: other.slug,
      icon: other.entity_types?.icon ?? null,
      outgoing,
    });
  }

  const events = (evLinks ?? [])
    .filter((x) => x.events)
    .map((x) => ({
      id: x.events!.id,
      title: x.events!.title,
      event_date: x.events!.event_date,
      role: x.role,
      icon: x.events!.domains?.icon ?? "radar",
    }));

  return NextResponse.json({
    name: e.name,
    slug: e.slug,
    country_code: e.country_code,
    description: e.description,
    title: e.attributes?.title ?? null,
    influence: Number(e.attributes?.influence ?? 0),
    breakdown: e.attributes?.influence_breakdown ?? null,
    type: e.entity_types?.label ?? null,
    icon: e.entity_types?.icon ?? "user",
    wiki: e.attributes?.wiki ?? null,
    photo: e.attributes?.wiki ? photos[e.attributes.wiki] ?? null : null,
    gallery,
    insights,
    leads,
    relationships,
    events,
  });
}
