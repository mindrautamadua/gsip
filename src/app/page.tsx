import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PageHeader, StatCard, ScoreBadge, Chip, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { CockpitSummary } from "@/components/cockpit/CockpitSummary";
import { countryName } from "@/lib/countries";
import { materiality, MAT_DOMAIN_LEVER, matScoreColor, topDriver } from "@/lib/materiality";

const CHINA_DOMAINS = new Set(["economy", "geopolitics", "technology", "trade", "energy", "geoeconomics"]);

const READY_W: Record<string, number> = { high: 3, medium: 2, low: 1 };
function flagEmoji(iso2: string | null | undefined): string {
  if (!iso2 || iso2.length !== 2) return "";
  const A = 0x1f1e6;
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65)) + String.fromCodePoint(A + (cc.charCodeAt(1) - 65));
}

export const revalidate = 0;

async function count(table: string) {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

type RecentEvent = {
  id: string;
  title: string;
  summary: string | null;
  event_date: string | null;
  importance: number | null;
  confidence: number | null;
  event_types: { label: string } | null;
  domains: { name: string; icon: string | null } | null;
  event_analyses:
    | { risk_score: number | null; impact_score: number | null; opportunity_score: number | null }
    | { risk_score: number | null; impact_score: number | null; opportunity_score: number | null }[]
    | null;
};

function analysis<T>(x: T | T[] | null | undefined): T | null {
  return (Array.isArray(x) ? x[0] : x) ?? null;
}

export default async function Dashboard() {
  const [domains, sectors, industryGroups, industries, entities, edges, events, actions] =
    await Promise.all([
      count("domains"),
      count("industries"),
      count("sectors"),
      count("subsectors"),
      count("entities"),
      count("entity_edges"),
      count("events"),
      count("actions"),
    ]);

  const { data: recent } = await supabase
    .from("events")
    .select(
      "id,title,summary,event_date,importance,confidence,event_types(label),domains(name,icon),event_analyses(risk_score,impact_score,opportunity_score)"
    )
    .order("importance", { ascending: false })
    .limit(5)
    .returns<RecentEvent[]>();

  const list = recent ?? [];
  const featured = list[0];
  const rest = list.slice(1);

  // ===== Strategic lenses (McKinsey-derived capabilities) — live pull-through =====
  const [depCount, scenario, seriesRows, subRows, posRows, matEventsRes, leverRes] = await Promise.all([
    count("country_dependency"),
    supabase.from("scenarios").select("total_low,total_high").order("sort_order").limit(1).maybeSingle()
      .returns<{ total_low: number | null; total_high: number | null }>(),
    supabase.from("strategic_series").select("slug,label,points")
      .returns<{ slug: string; label: string; points: { y: number; v: number }[] }[]>(),
    supabase.from("substitution_chains").select("beneficiary_code,beneficiary_name,readiness")
      .returns<{ beneficiary_code: string | null; beneficiary_name: string; readiness: string | null }[]>(),
    supabase.from("entities").select("*", { count: "exact", head: true }).not("attributes->>scale", "is", null),
    supabase.from("events")
      .select("id,title,importance,confidence,source_reliability,event_date,domains(name,icon,code),event_analyses(impact_score,risk_score,opportunity_score),event_entities(entities(attributes))")
      .order("importance", { ascending: false }).limit(15),
    supabase.from("scenario_levers").select("name,value_low,value_high,sort_order").order("sort_order"),
  ]);

  const seriesLast = (slug: string) => {
    const s = (seriesRows.data ?? []).find((r) => r.slug === slug);
    const pts = s?.points ?? [];
    return pts.length ? pts[pts.length - 1].v : null;
  };
  const worldToChina = seriesLast("world-to-china");
  const chinaToWorld = seriesLast("china-to-world");

  const topMover = (seriesRows.data ?? [])
    .map((s) => {
      const pts = [...(s.points ?? [])].sort((a, b) => a.y - b.y);
      if (pts.length < 2 || pts[0].v === 0) return null;
      const ratio = pts[pts.length - 1].v / pts[0].v;
      return { label: s.label, ratio, momentum: Math.abs(Math.log(ratio)) };
    })
    .filter((x): x is { label: string; ratio: number; momentum: number } => !!x)
    .sort((a, b) => b.momentum - a.momentum)[0];

  const benMap = new Map<string, { code: string | null; name: string; gain: number }>();
  for (const r of subRows.data ?? []) {
    const key = r.beneficiary_code ?? r.beneficiary_name;
    if (!benMap.has(key)) benMap.set(key, { code: r.beneficiary_code, name: r.beneficiary_name, gain: 0 });
    benMap.get(key)!.gain += READY_W[r.readiness ?? "medium"] ?? 2;
  }
  const topBeneficiary = [...benMap.values()].sort((a, b) => b.gain - a.gain)[0];

  const positionedCount = posRows.count ?? 0;

  // ===== What Matters Most (top-3 material changes, shared scoring) =====
  type MatEv = {
    id: string; title: string; importance: number | null; confidence: number | null; source_reliability: string | null; event_date: string | null;
    domains: { name: string; icon: string | null; code: string | null } | { name: string; icon: string | null; code: string | null }[] | null;
    event_analyses: { impact_score: number | null; risk_score: number | null; opportunity_score: number | null } | { impact_score: number | null; risk_score: number | null; opportunity_score: number | null }[] | null;
    event_entities: { entities: { attributes: { influence?: number | string } | null } | { attributes: { influence?: number | string } | null }[] | null }[] | null;
  };
  const nowMs = Date.now();
  const levers = ((leverRes.data ?? []) as { name: string; value_low: number | string | null; value_high: number | string | null }[]).map((l) => ({ name: l.name, low: Number(l.value_low), high: Number(l.value_high) }));
  const scenTotal = scenario.data ? { low: Number(scenario.data.total_low), high: Number(scenario.data.total_high) } : null;
  const material = ((matEventsRes.data ?? []) as MatEv[]).map((e) => {
    const dom = analysis(e.domains);
    const an = analysis(e.event_analyses);
    const sev = [an?.impact_score, an?.risk_score, an?.opportunity_score].filter((x): x is number => x != null);
    const infls = (e.event_entities ?? []).map((ee) => { const en = analysis(ee.entities); return en ? Number(en.attributes?.influence ?? 0) : 0; });
    const { components, score } = materiality({
      importance: e.importance, confidence: e.confidence, sourceReliability: e.source_reliability,
      sev, leverageInfluence: infls.length ? Math.max(...infls) : 0, hasEntities: infls.length > 0,
      eventDate: e.event_date, now: nowMs,
    });
    const chinaThemed = dom?.code ? CHINA_DOMAINS.has(dom.code) : false;
    const idx = dom?.code ? MAT_DOMAIN_LEVER[dom.code] : undefined;
    const vas = chinaThemed
      ? idx != null && levers[idx] ? `$${levers[idx].low}–${levers[idx].high}T` : scenTotal ? `$${scenTotal.low}–${scenTotal.high}T` : null
      : null;
    return { id: e.id, title: e.title, domainName: dom?.name ?? null, domainIcon: dom?.icon ?? "radar", score, driver: topDriver(components), vas };
  }).sort((a, b) => b.score - a.score).slice(0, 3);

  const lenses = [
    {
      href: "/dependency", icon: "git-compare-arrows", title: "Strategic Dependency",
      metric: worldToChina != null && chinaToWorld != null
        ? `${worldToChina.toFixed(1)}↑ / ${chinaToWorld.toFixed(1)}↓` : "—",
      sub: `Dunia→China vs China→Dunia · ${depCount} negara`,
    },
    {
      href: "/scenarios", icon: "git-fork", title: "Value at Stake",
      metric: scenario.data?.total_low != null ? `$${Number(scenario.data.total_low)}–${Number(scenario.data.total_high)}T` : "—",
      sub: "5 tuas keterlibatan · 2040",
    },
    {
      href: "/trajectory", icon: "activity", title: "Trajectory",
      metric: topMover ? `×${topMover.ratio.toFixed(topMover.ratio >= 10 ? 0 : 1)}` : "—",
      sub: topMover ? `Penggerak tercepat: ${topMover.label}` : "momentum indikator",
    },
    {
      href: "/positioning", icon: "scatter-chart", title: "Scale × Integration",
      metric: String(positionedCount),
      sub: "entitas · kuadran skala × integrasi",
    },
    {
      href: "/substitution", icon: "split", title: "Substitution",
      metric: topBeneficiary ? `${flagEmoji(topBeneficiary.code)} ${topBeneficiary.code ? countryName(topBeneficiary.code) : topBeneficiary.name}` : "—",
      sub: "pemenang teratas dari decoupling",
    },
  ];

  const stats = [
    { label: "Strategic Domains", value: domains, icon: "globe", href: "/domains", hint: "L1 · lapisan pengamatan", tone: "emerald" as const },
    { label: "Entities · KG nodes", value: entities, icon: "share-2", href: "/graph", hint: `L2 · ${edges} relasi graph`, tone: "sky" as const },
    { label: "Strategic Events", value: events, icon: "radar", href: "/events", hint: "L3 · pusat intelligence", tone: "amber" as const },
    { label: "Actions", value: actions, icon: "target", href: "/events", hint: "L5 · tindak lanjut", tone: "rose" as const },
  ];

  return (
    <div>
      <PageHeader
        icon="satellite"
        layer="Kokpit Eksekutif"
        title="Di mana kita berdiri hari ini."
        subtitle="Jawaban dulu: risiko paling mendesak & aksinya, peluang teratas, dan keseimbangan pengaruh AS–China — bukti pendukung menyusul di bawah."
      />

      <div className="px-6 md:px-10 pb-24 space-y-4">
        {/* ===== answer-first BLUF band ===== */}
        <Reveal>
          <CockpitSummary />
        </Reveal>

        {/* ===== stat bento row ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <StatCard {...s} />
            </Reveal>
          ))}
        </div>

        {/* ===== what matters most — direct answer ===== */}
        {material.length > 0 && (
          <>
            <div className="pt-4 flex items-center justify-between gap-3">
              <span className="eyebrow inline-flex items-center gap-1"><Icon name="scan-search" size={11} /> What Matters Most</span>
              <Link href="/materiality" className="text-xs text-accent hover:underline inline-flex items-center gap-1">Peringkat penuh <Icon name="arrow-right" size={13} /></Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {material.map((m, i) => (
                <Reveal key={m.id} delay={i * 80}>
                  <MatCard m={m} rank={i + 1} />
                </Reveal>
              ))}
            </div>
          </>
        )}

        {/* ===== taxonomy pipeline + graph teaser ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Reveal delay={80} className="lg:col-span-8">
            <div className="bezel h-full">
              <div className="core h-full p-7 md:p-9">
                <span className="eyebrow mb-6">GICS · world-class standard</span>
                <div className="flex items-center gap-3 md:gap-6 flex-wrap mt-2">
                  <TaxStat n={domains} label="Domains" />
                  <Flow />
                  <TaxStat n={sectors} label="Sectors" />
                  <Flow />
                  <TaxStat n={industryGroups} label="Industry Groups" />
                  <Flow />
                  <TaxStat n={industries} label="Industries" />
                </div>
                <p className="text-sm text-[var(--muted)] mt-7 max-w-xl leading-relaxed">
                  Klasifikasi MSCI/S&amp;P sebagai fondasi Layer 2 — setiap entitas Company &amp; Industry
                  tertaut ke pohon GICS resmi.
                </p>
                <div className="mt-7">
                  <Button href="/taxonomy" icon="arrow-right">Browse taxonomy</Button>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={160} className="lg:col-span-4">
            <Link href="/graph" className="block h-full active:scale-[0.99] transition-transform duration-300">
              <div className="bezel h-full group">
                <div className="core h-full p-7 flex flex-col justify-between overflow-hidden relative">
                  <div
                    aria-hidden
                    className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-125"
                  />
                  <div className="relative">
                    <span className="h-11 w-11 rounded-2xl bg-[var(--surface)] border border-[var(--border)] grid place-items-center text-accent">
                      <Icon name="waypoints" size={22} />
                    </span>
                    <div className="display text-2xl font-semibold mt-5 tracking-tight">Knowledge Graph</div>
                    <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                      {entities} node · {edges} relasi berarah, terhubung lintas domain.
                    </p>
                  </div>
                  <div className="relative mt-6 inline-flex items-center gap-1.5 text-sm text-accent">
                    Explore graph
                    <Icon name="arrow-right" size={16} className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>
        </div>

        {/* ===== strategic lenses (geoeconomics) ===== */}
        <div className="pt-4">
          <span className="eyebrow">Strategic Lenses · Geoekonomi</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {lenses.map((l, i) => (
            <Reveal key={l.href} delay={i * 70}>
              <LensCard {...l} />
            </Reveal>
          ))}
        </div>

        {/* ===== priority events bento ===== */}
        <div className="pt-4">
          <span className="eyebrow">Priority Events</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {featured && (
            <Reveal delay={60} className="lg:col-span-7">
              <EventCard e={featured} featured />
            </Reveal>
          )}
          <div className="lg:col-span-5 grid grid-cols-1 gap-4">
            {rest.slice(0, 2).map((e, i) => (
              <Reveal key={e.id} delay={120 + i * 80}>
                <EventCard e={e} />
              </Reveal>
            ))}
          </div>
          {rest.slice(2).map((e, i) => (
            <Reveal key={e.id} delay={80 + i * 80} className="lg:col-span-6">
              <EventCard e={e} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventCard({ e, featured = false }: { e: RecentEvent; featured?: boolean }) {
  const a = analysis(e.event_analyses);
  return (
    <Link href={`/events/${e.id}`} className="block h-full active:scale-[0.99] transition-transform duration-300">
      <div className="card h-full p-6 hover:-translate-y-0.5 hover:border-[var(--accent)]">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {e.domains && (
            <Chip>
              <span className="inline-flex items-center gap-1">
                <Icon name={e.domains.icon} size={12} /> {e.domains.name}
              </span>
            </Chip>
          )}
          {e.event_types && <Chip>{e.event_types.label}</Chip>}
          {e.importance != null && (
            <span className="ml-auto text-[11px] font-mono text-[var(--muted)]">IMP {e.importance}/5</span>
          )}
        </div>
        <div className={`font-medium leading-snug ${featured ? "display text-2xl tracking-tight" : ""}`}>
          {e.title}
        </div>
        {e.summary && (
          <p className={`text-sm text-[var(--muted)] mt-2 leading-relaxed ${featured ? "line-clamp-3" : "line-clamp-2"}`}>
            {e.summary}
          </p>
        )}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <ScoreBadge label="Impact" score={a?.impact_score ?? null} />
          <ScoreBadge label="Risk" score={a?.risk_score ?? null} />
          <ScoreBadge label="Opp" score={a?.opportunity_score ?? null} />
          {e.event_date && (
            <span className="ml-auto text-xs text-[var(--muted)] font-mono">{e.event_date}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function MatCard({ m, rank }: { m: { id: string; title: string; domainName: string | null; domainIcon: string; score: number; driver: { label: string; color: string }; vas: string | null }; rank: number }) {
  const col = matScoreColor(m.score);
  return (
    <Link href={`/events/${m.id}`} className="block h-full active:scale-[0.99] transition-transform duration-300">
      <div className="card h-full p-5 hover:-translate-y-0.5 hover:border-[var(--accent)] flex flex-col">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-mono text-[var(--muted)] tabular-nums">#{rank}</span>
          <span className="display text-2xl font-semibold tabular-nums" style={{ color: col }}>{m.score}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider ml-auto rounded-full px-2 py-0.5" style={{ color: m.driver.color, background: m.driver.color + "1a" }}>↑ {m.driver.label}</span>
        </div>
        <div className="text-sm font-medium leading-snug mt-3 line-clamp-2">{m.title}</div>
        <div className="mt-auto pt-3 flex items-center gap-2 flex-wrap">
          {m.domainName && <span className="text-[11px] text-[var(--muted)] inline-flex items-center gap-1"><Icon name={m.domainIcon} size={11} /> {m.domainName}</span>}
          {m.vas && <span className="text-[10px] font-mono text-amber-700/80 ml-auto">{m.vas}</span>}
        </div>
      </div>
    </Link>
  );
}

function LensCard({ href, icon, title, metric, sub }: { href: string; icon: string; title: string; metric: string; sub: string }) {
  return (
    <Link href={href} className="block h-full active:scale-[0.99] transition-transform duration-300">
      <div className="card h-full p-5 hover:-translate-y-0.5 hover:border-[var(--accent)] flex flex-col">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 shrink-0 rounded-xl bg-[var(--surface)] border border-[var(--border)] grid place-items-center text-accent">
            <Icon name={icon} size={17} />
          </span>
          <span className="text-[11px] font-medium leading-tight">{title}</span>
        </div>
        <div className="display text-xl font-semibold tracking-tight mt-4 tabular-nums truncate">{metric}</div>
        <div className="text-[11px] text-[var(--muted)] mt-1 leading-snug line-clamp-2">{sub}</div>
        <div className="mt-auto pt-3 inline-flex items-center gap-1 text-[11px] text-accent">
          Buka <Icon name="arrow-right" size={12} />
        </div>
      </div>
    </Link>
  );
}

function TaxStat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="display text-3xl md:text-4xl font-semibold tabular-nums tracking-tight">{n}</div>
      <div className="text-xs text-[var(--muted)] mt-1">{label}</div>
    </div>
  );
}

function Flow() {
  return <Icon name="chevron-right" size={18} className="text-[var(--muted)]/50 shrink-0" />;
}
