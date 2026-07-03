import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { BenchmarkHub, type BTab, type BRow } from "@/components/benchmark/BenchmarkHub";
import { BenchmarkTabs } from "@/components/benchmark/BenchmarkTabs";

export const revalidate = 0;
export const metadata = { title: "Global Benchmark Dashboard · GSIP" };

const pick = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] : x) ?? null;

type Attrs = { influence?: number | string; domain?: string; influence_breakdown?: { market_cap_usd_bn?: number | null } } | null;
type EntRow = { id: string; name: string; slug: string; country_code: string | null; subsector_id: string | null; attributes: Attrs; entity_types: { code: string; label: string; icon: string | null } | { code: string; label: string; icon: string | null }[] | null };
type ScoreRow = { status_score: number | null; capability_score: number | null; future_score: number | null; composite_score: number | null; nef_countries: { name: string; iso2: string | null } | { name: string; iso2: string | null }[] | null };

const inf = (a: Attrs) => Number(a?.influence ?? 0);
const flag = (iso2?: string | null) => {
  if (!iso2 || iso2.length !== 2) return null;
  const A = 0x1f1e6;
  return String.fromCodePoint(A + iso2.toUpperCase().charCodeAt(0) - 65) + String.fromCodePoint(A + iso2.toUpperCase().charCodeAt(1) - 65);
};

export default async function GlobalBenchmarkPage() {
  const [{ data: ents }, { data: scores }, { data: industries }, { data: sectors }, { data: subsectors }] = await Promise.all([
    supabase.from("entities").select("id,name,slug,country_code,subsector_id,attributes,entity_types(code,label,icon)").not("attributes->>influence", "is", null).returns<EntRow[]>(),
    supabase.from("nef_country_scores").select("status_score,capability_score,future_score,composite_score,nef_countries!inner(name,iso2)").eq("year", 2023).returns<ScoreRow[]>(),
    supabase.from("industries").select("id,code,name,icon").order("sort_order"),
    supabase.from("sectors").select("id,industry_id"),
    supabase.from("subsectors").select("id,sector_id"),
  ]);

  const scored = (ents ?? []).map((e) => ({ ...e, t: pick(e.entity_types), i: inf(e.attributes) })).sort((a, b) => b.i - a.i);

  // --- Countries (NEF composite) ---
  const countryRows: BRow[] = (scores ?? [])
    .map((s) => ({ c: pick(s.nef_countries), s }))
    .filter((x) => x.c && x.s.composite_score != null)
    .sort((a, b) => Number(b.s.composite_score) - Number(a.s.composite_score))
    .slice(0, 15)
    .map((x) => ({
      id: x.c!.name,
      name: x.c!.name,
      metric: Math.round(Number(x.s.composite_score)),
      sub: `S ${Math.round(Number(x.s.status_score ?? 0))} · C ${Math.round(Number(x.s.capability_score ?? 0))} · F ${Math.round(Number(x.s.future_score ?? 0))}`,
      flag: flag(x.c!.iso2),
      href: "/nations",
    }));

  // --- Companies (influence + market cap + logo) ---
  const companyRows: BRow[] = scored
    .filter((e) => e.t?.code === "company")
    .slice(0, 15)
    .map((e) => {
      const mc = e.attributes?.influence_breakdown?.market_cap_usd_bn ?? null;
      const domain = e.attributes?.domain;
      return {
        id: e.id,
        name: e.name,
        metric: Math.round(e.i),
        sub: mc ? `$${mc}bn market cap` : (flag(e.country_code) ? `${flag(e.country_code)} ${e.country_code}` : e.t?.label ?? null),
        logo: domain ? `https://logo.clearbit.com/${domain}` : null,
        logoFallback: domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null,
        icon: e.t?.icon ?? "building-2",
        href: `/entities/${e.slug}`,
      };
    });

  // --- GICS sectors (rolled-up influence + entity count) ---
  const subToSector = new Map((subsectors ?? []).map((s) => [s.id, s.sector_id]));
  const sectorToIndustry = new Map((sectors ?? []).map((s) => [s.id, s.industry_id]));
  const indMeta = new Map((industries ?? []).map((i) => [i.id, i]));
  const agg = new Map<string, { influence: number; count: number }>();
  for (const e of scored) {
    if (!e.subsector_id) continue;
    const indId = sectorToIndustry.get(subToSector.get(e.subsector_id) ?? "");
    if (!indId) continue;
    const cur = agg.get(indId) ?? { influence: 0, count: 0 };
    cur.influence += e.i;
    cur.count += 1;
    agg.set(indId, cur);
  }
  const sectorRows: BRow[] = [...agg.entries()]
    .map(([indId, v]) => ({ ind: indMeta.get(indId), v }))
    .filter((x) => x.ind)
    .sort((a, b) => b.v.influence - a.v.influence)
    .map((x) => ({
      id: x.ind!.id,
      name: x.ind!.name,
      metric: Math.round(x.v.influence),
      sub: `${x.ind!.code} · ${x.v.count} entities`,
      icon: x.ind!.icon ?? "layers",
      href: "/taxonomy",
    }));

  // --- Entities (all types, by influence) ---
  const entityRows: BRow[] = scored.slice(0, 15).map((e) => ({
    id: e.id,
    name: e.name,
    metric: Math.round(e.i),
    sub: `${e.t?.label ?? "Entity"}${e.country_code ? ` · ${e.country_code}` : ""}`,
    icon: e.t?.icon ?? "circle",
    href: `/entities/${e.slug}`,
  }));

  const tabs: BTab[] = [
    { key: "countries", label: "Negara", icon: "landmark", metricLabel: "Composite (NEF)", accent: "#10b981", rows: countryRows },
    { key: "companies", label: "Perusahaan", icon: "building-2", metricLabel: "Influence", accent: "#0ea5e9", rows: companyRows },
    { key: "sectors", label: "Sektor GICS", icon: "network", metricLabel: "Influence total", accent: "#8b5cf6", rows: sectorRows },
    { key: "entities", label: "Entitas", icon: "share-2", metricLabel: "Influence", accent: "#f59e0b", rows: entityRows },
  ].filter((t) => t.rows.length > 0);

  return (
    <div>
      <PageHeader
        layer="Benchmark · Hub Terpadu"
        icon="gauge"
        title="Dasbor Benchmark Global"
        subtitle="Satu tempat untuk membandingkan lintas subjek: keunggulan negara (NEF), pengaruh perusahaan & market cap, kekuatan sektor GICS, dan entitas paling berpengaruh. Pilih tab untuk berganti subjek benchmark."
      />
      <div className="px-6 md:px-10 pb-24 max-w-6xl">
        <div className="mb-6"><BenchmarkTabs /></div>
        <BenchmarkHub tabs={tabs} />
        <p className="text-[11px] font-mono text-[var(--muted)]/70 leading-relaxed mt-8">
          Negara: composite National Excellence (2023). Perusahaan/Entitas: skor pengaruh GSIP 0–100. Sektor: agregat pengaruh entitas per GICS Sector. Klik baris untuk menyelam ke halaman sumbernya (Nations · Entities · Taxonomy).
        </p>
      </div>
    </div>
  );
}
