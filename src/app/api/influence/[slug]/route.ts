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
    .select("id,name,slug,country_code,description,attributes,subsector_id,entity_type_id,entity_types(label,icon,code),subsectors(name)")
    .eq("slug", slug)
    .maybeSingle()
    .returns<{
      id: string;
      name: string;
      slug: string;
      country_code: string | null;
      description: string | null;
      subsector_id: string | null;
      entity_type_id: string;
      attributes: {
        influence?: number | string;
        title?: string;
        wiki?: string;
        influence_breakdown?: { degree?: number; event_impact?: number; market_cap_usd_bn?: number | null };
        insights?: Insight[];
        gallery?: { url: string; caption?: string | null }[];
        operator?: string;
        stake?: string;
        fg500_rank?: number;
        domain?: string;
      } | null;
      entity_types: { label: string; icon: string | null; code: string } | null;
      subsectors: { name: string } | null;
    }>();

  if (!e) return NextResponse.json({ error: "not found" }, { status: 404 });

  // ===== Competitive positioning: peers in the same GICS industry (companies)
  // or the same entity type (countries, commodities, …) =====
  type PeerRow = {
    name: string; slug: string; country_code: string | null;
    attributes: { influence?: number | string; market_cap?: number; fg500_rank?: number; domain?: string } | null;
  };
  const scopeIsGics = e.entity_types?.code === "company" && !!e.subsector_id;
  let peersQ = supabase.from("entities").select("name,slug,country_code,attributes");
  peersQ = scopeIsGics
    ? peersQ.eq("subsector_id", e.subsector_id!)
    : peersQ.eq("entity_type_id", e.entity_type_id).not("attributes->>influence", "is", null);
  const { data: peersRaw } = await peersQ.returns<PeerRow[]>();

  type Peer = { name: string; slug: string; cc: string | null; domain: string | null; marketCap: number | null; influence: number; fg500: number | null; self: boolean };
  const peers: Peer[] = (peersRaw ?? []).map((p) => ({
    name: p.name, slug: p.slug, cc: p.country_code, domain: p.attributes?.domain ?? null,
    marketCap: p.attributes?.market_cap != null ? Number(p.attributes.market_cap) : null,
    influence: Number(p.attributes?.influence ?? 0),
    fg500: p.attributes?.fg500_rank != null ? Number(p.attributes.fg500_rank) : null,
    self: p.slug === e.slug,
  }));
  const selfPeer = peers.find((p) => p.self);

  function computeDim(getVal: (p: Peer) => number | null, betterLow: boolean) {
    if (!selfPeer || getVal(selfPeer) == null) return null;
    const withVal = peers.filter((p) => getVal(p) != null);
    if (withVal.length < 2) return null;
    const sorted = [...withVal].sort((a, b) => (betterLow ? getVal(a)! - getVal(b)! : getVal(b)! - getVal(a)!));
    const rank = sorted.findIndex((p) => p.self) + 1;
    const of = sorted.length;
    const percentile = of > 1 ? Math.round(((of - rank) / (of - 1)) * 100) : 100;
    return { rank, of, percentile, value: getVal(selfPeer)!, leaderName: sorted[0].name, leaderValue: getVal(sorted[0])!, betterLow };
  }

  const dims: { key: string; label: string; rank: number; of: number; percentile: number; value: number; leaderName: string; leaderValue: number; betterLow: boolean }[] = [];
  const dInf = computeDim((p) => p.influence, false); if (dInf) dims.push({ key: "influence", label: "Influence", ...dInf });
  const dMc = computeDim((p) => p.marketCap, false); if (dMc) dims.push({ key: "market_cap", label: "Market Cap ($bn)", ...dMc });
  const dFg = computeDim((p) => p.fg500, true); if (dFg) dims.push({ key: "fg500", label: "FG500 Rank", ...dFg });

  const topPeers = [...peers].sort((a, b) => b.influence - a.influence).slice(0, 6);
  if (selfPeer && !topPeers.some((p) => p.self)) topPeers.push(selfPeer);

  const benchmark = peers.length >= 3 && dims.length > 0
    ? { scope: scopeIsGics ? e.subsectors?.name ?? "Peer" : e.entity_types?.label ?? "Peer", count: peers.length, dims, peers: topPeers }
    : null;

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
    fg500_rank: e.attributes?.fg500_rank ?? null,
    domain: e.attributes?.domain ?? null,
    breakdown: e.attributes?.influence_breakdown ?? null,
    type: e.entity_types?.label ?? null,
    icon: e.entity_types?.icon ?? "user",
    wiki: e.attributes?.wiki ?? null,
    photo: e.attributes?.wiki ? photos[e.attributes.wiki] ?? null : null,
    gallery,
    insights,
    benchmark,
    leads,
    relationships,
    events,
  });
}
