import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { getPhotos } from "@/lib/wiki";
import { countryName } from "@/lib/countries";
import { InfluencerCards, type InfluencerCard } from "@/components/influence/InfluencerCards";
import { RankList, type RankRow } from "@/components/influence/RankList";

export const revalidate = 0;

type Attrs = {
  influence?: number | string;
  title?: string;
  wiki?: string;
  kind?: string;
  influence_breakdown?: { degree?: number; event_impact?: number; market_cap_usd_bn?: number | null };
} | null;
type Row = {
  id: string;
  name: string;
  slug: string;
  country_code: string | null;
  attributes: Attrs;
  entity_types: { code: string; category: string | null; icon: string | null } | null;
};

const inf = (a: Attrs) => Number(a?.influence ?? 0);

// "why" — the measurable signals behind the score
function whyOf(a: Attrs): string | null {
  const b = a?.influence_breakdown;
  if (!b) return null;
  const parts = [`graph ${b.degree ?? 0}`, `events ${b.event_impact ?? 0}`];
  if (b.market_cap_usd_bn) parts.push(`$${b.market_cap_usd_bn}bn`);
  return parts.join(" · ");
}

function Bar({ value, tone = "emerald" }: { value: number; tone?: string }) {
  const grad = tone === "amber" ? "from-amber-400 to-orange-500" : "from-emerald-400 to-green-600";
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
      <div className={`h-full rounded-full bg-gradient-to-r ${grad}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default async function InfluencePage() {
  const [{ data: personsRaw }, { data: scoredRaw }, { data: leadsRaw }] = await Promise.all([
    supabase
      .from("entities")
      .select("id,name,slug,country_code,attributes,entity_types!inner(code,category,icon)")
      .eq("entity_types.code", "person")
      .returns<Row[]>(),
    supabase
      .from("entities")
      .select("id,name,slug,country_code,attributes,entity_types(code,category,icon)")
      .not("attributes->>influence", "is", null)
      .returns<Row[]>(),
    supabase
      .from("entity_edges")
      .select("source_entity_id,target_entity_id,relationship_types!inner(code)")
      .in("relationship_types.code", ["leads", "founder_of"])
      .returns<{ source_entity_id: string; target_entity_id: string }[]>(),
  ]);

  const persons = (personsRaw ?? []).sort((a, b) => inf(b.attributes) - inf(a.attributes));
  const scored = scoredRaw ?? [];
  const leads = leadsRaw ?? [];

  // resolve "leads" targets
  const targetIds = [...new Set(leads.map((l) => l.target_entity_id))];
  const { data: targetsRaw } = targetIds.length
    ? await supabase
        .from("entities")
        .select("id,name,slug,entity_types(icon)")
        .in("id", targetIds)
        .returns<{ id: string; name: string; slug: string; entity_types: { icon: string | null } | null }[]>()
    : { data: [] };
  const targetMap = new Map((targetsRaw ?? []).map((t) => [t.id, t]));
  const leadMap = new Map<string, { name: string; slug: string; icon: string | null }>();
  for (const l of leads) {
    if (!leadMap.has(l.source_entity_id)) {
      const t = targetMap.get(l.target_entity_id);
      if (t) leadMap.set(l.source_entity_id, { name: t.name, slug: t.slug, icon: t.entity_types?.icon ?? null });
    }
  }

  // photos for people + org logos
  const photos = await getPhotos([...persons, ...scored].map((e) => e.attributes?.wiki));

  // precomputed card data for the (client) influencer grid + modal
  const personCards: InfluencerCard[] = persons.map((p) => {
    const lead = leadMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      country_code: p.country_code,
      title: p.attributes?.title ?? null,
      score: inf(p.attributes),
      photo: photos[p.attributes?.wiki ?? ""] ?? null,
      lead: lead ? { name: lead.name, icon: lead.icon } : null,
      why: whyOf(p.attributes),
    };
  });

  const nations = scored.filter((e) => e.entity_types?.code === "country").sort((a, b) => inf(b.attributes) - inf(a.attributes));
  const commodities = scored.filter((e) => e.entity_types?.code === "commodity").sort((a, b) => inf(b.attributes) - inf(a.attributes));
  const technologies = scored.filter((e) => e.entity_types?.code === "technology").sort((a, b) => inf(b.attributes) - inf(a.attributes));
  const chokepoints = scored.filter((e) => e.entity_types?.code === "chokepoint").sort((a, b) => inf(b.attributes) - inf(a.attributes));
  const allOrgs = scored
    .filter((e) => ["organization", "government_body", "bloc"].includes(e.entity_types?.code ?? ""))
    .sort((a, b) => inf(b.attributes) - inf(a.attributes));
  const byKind = (k: string) => allOrgs.filter((e) => e.attributes?.kind === k);
  const media = byKind("media");
  const thinkTanks = byKind("think_tank");
  const swf = byKind("swf");
  // multilateral / state bodies (no non-state kind tag)
  const orgs = allOrgs.filter((e) => !["media", "think_tank", "swf"].includes(e.attributes?.kind ?? ""));
  const companies = scored.filter((e) => e.entity_types?.code === "company").sort((a, b) => inf(b.attributes) - inf(a.attributes));

  // influence share by nation (empirical lens) — aggregate everything attributable to a country
  const byNation = new Map<string, number>();
  [...scored, ...persons].forEach((e) => {
    if (e.country_code) byNation.set(e.country_code, (byNation.get(e.country_code) ?? 0) + inf(e.attributes));
  });
  const grand = [...byNation.values()].reduce((s, n) => s + n, 0) || 1;
  const nationShare = [...byNation.entries()]
    .map(([cc, total]) => ({ cc, total, pct: (total / grand) * 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const us = Math.round(((byNation.get("US") ?? 0) / grand) * 100);
  const cn = Math.round(((byNation.get("CN") ?? 0) / grand) * 100);

  return (
    <div>
      <PageHeader
        layer="Who moves the world"
        icon="crown"
        title="Global Influence"
        subtitle="Peta empiris pengaruh global: negara, organisasi, perusahaan — dan siapa orang di baliknya. Skor influence 0–100 dan rantai kepemimpinan menjadikan pertanyaan 'siapa yang menggerakkan dunia' terukur, bukan naratif."
      />

      <div className="px-6 md:px-10 pb-24 space-y-10 max-w-6xl">
        {/* Empirical share — US vs China */}
        <section className="card p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
            Influence by Nation — empirical share
          </div>
          <p className="text-sm text-[var(--muted)] mb-5 max-w-2xl">
            Agregat bobot pengaruh (negara + organisasi + perusahaan + tokoh) per bendera. Lensa terukur untuk
            menimbang tesis dominasi <span className="text-foreground">AS vs Tiongkok</span>.
          </p>
          <div className="flex items-end gap-6 mb-5">
            <div>
              <div className="display text-4xl font-semibold text-accent">{us}%</div>
              <div className="text-xs text-[var(--muted)] mt-1">United States</div>
            </div>
            <div className="text-[var(--muted)] text-2xl pb-2">vs</div>
            <div>
              <div className="display text-4xl font-semibold text-amber-500">{cn}%</div>
              <div className="text-xs text-[var(--muted)] mt-1">China</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {nationShare.map((n) => (
              <div key={n.cc} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-[var(--muted)] truncate" title={countryName(n.cc)}>{countryName(n.cc)}</span>
                <div className="flex-1">
                  <Bar value={n.pct} tone={n.cc === "CN" ? "amber" : "emerald"} />
                </div>
                <span className="w-12 text-right text-xs font-mono tabular-nums">{n.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Global influencers */}
        <section>
          <div className="mb-4">
            <span className="eyebrow">The people behind</span>
            <h2 className="display text-2xl font-semibold tracking-tight mt-3">Global Influencers</h2>
          </div>
          <InfluencerCards cards={personCards} />
        </section>

        {/* State-level power */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RankList title="Multilateral Organizations" rows={toRankRows(orgs, photos)} />
          <RankList title="Most Influential Companies" rows={toRankRows(companies, photos)} />
        </div>

        {/* Non-state power */}
        <div>
          <span className="eyebrow">Non-state power</span>
          <div className="grid gap-6 lg:grid-cols-3 mt-4">
            <RankList title="Sovereign Wealth Funds" rows={toRankRows(swf, photos)} />
            <RankList title="Media" rows={toRankRows(media, photos)} />
            <RankList title="Think Tanks" rows={toRankRows(thinkTanks, photos)} />
          </div>
        </div>

        {/* Strategic resources & technology */}
        <div>
          <span className="eyebrow">Strategic resources & tech</span>
          <div className="grid gap-6 lg:grid-cols-2 mt-4">
            <RankList title="Strategic Commodities" rows={toRankRows(commodities, photos)} />
            <RankList title="Key Technologies" rows={toRankRows(technologies, photos)} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2 mt-4">
            <RankList title="Maritime Chokepoints" rows={toRankRows(chokepoints, photos)} />
          </div>
        </div>

        <RankList title="Most Influential Nations" rows={toRankRows(nations, photos)} wide />
      </div>
    </div>
  );
}

function toRankRows(rows: Row[], photos: Record<string, string>): RankRow[] {
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    score: inf(e.attributes),
    photo: photos[e.attributes?.wiki ?? ""] ?? null,
    icon: e.entity_types?.icon ?? null,
    why: whyOf(e.attributes),
  }));
}

