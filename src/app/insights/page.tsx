import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Icon } from "@/components/Icon";
import { Chip } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { RadarHero } from "@/components/insights/RadarHero";
import { CountUp } from "@/components/insights/CountUp";
import { ScoreGauge } from "@/components/insights/ScoreGauge";
import { RiskMatrix, type MatrixPoint } from "@/components/insights/RiskMatrix";
import { Sparkline } from "@/components/market/Sparkline";
import { fetchMarket } from "@/lib/market/twelvedata";

export const revalidate = 0;

type Analysis = {
  why: string | null;
  impact: string | null;
  risk: string | null;
  opportunity: string | null;
  recommendation: string | null;
  prediction: string | null;
  impact_score: number | null;
  risk_score: number | null;
  opportunity_score: number | null;
  confidence_score: number | null;
};

type EventRow = {
  id: string;
  title: string;
  summary: string | null;
  event_date: string | null;
  importance: number | null;
  created_at: string;
  domains: { name: string; icon: string | null } | { name: string; icon: string | null }[] | null;
  event_types: { label: string } | { label: string }[] | null;
  event_analyses: Analysis | Analysis[] | null;
};

type EdgeRow = {
  relation: string;
  source: { id: string; title: string } | { id: string; title: string }[] | null;
  target: { id: string; title: string } | { id: string; title: string }[] | null;
};

function one<T>(x: T | T[] | null | undefined): T | null {
  return (Array.isArray(x) ? x[0] : x) ?? null;
}

export default async function InsightsPage() {
  const [{ data: eventsData }, { data: edgesData }, { count: entityCount }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id,title,summary,event_date,importance,created_at,domains(name,icon),event_types(label),event_analyses(why,impact,risk,opportunity,recommendation,prediction,impact_score,risk_score,opportunity_score,confidence_score)"
      )
      .order("created_at", { ascending: false })
      .limit(60)
      .returns<EventRow[]>(),
    supabase
      .from("event_edges")
      .select(
        "relation,source:events!event_edges_source_event_id_fkey(id,title),target:events!event_edges_target_event_id_fkey(id,title)"
      )
      .returns<EdgeRow[]>(),
    supabase.from("entities").select("*", { count: "exact", head: true }),
  ]);

  const events = eventsData ?? [];
  const analyses = events.map((e) => one(e.event_analyses)).filter(Boolean) as Analysis[];

  // ---- derived intelligence ----
  const critical = events.filter((e) => (e.importance ?? 0) >= 4);
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };
  const avgRisk = avg(analyses.map((a) => a.risk_score));
  const avgOpp = avg(analyses.map((a) => a.opportunity_score));

  const topSignal = [...events].sort(
    (a, b) => (b.importance ?? 0) - (a.importance ?? 0) || b.created_at.localeCompare(a.created_at)
  )[0];
  const topAnalysis = topSignal ? one(topSignal.event_analyses) : null;

  const matrixPoints: MatrixPoint[] = events.flatMap((e) => {
    const a = one(e.event_analyses);
    if (!a?.impact_score || !a?.risk_score) return [];
    return [{
      id: e.id,
      title: e.title,
      impact: a.impact_score,
      risk: a.risk_score,
      importance: e.importance ?? 3,
    }];
  });

  const domainTally = new Map<string, { icon: string | null; count: number; imp: number }>();
  for (const e of events) {
    const d = one(e.domains);
    if (!d) continue;
    const cur = domainTally.get(d.name) ?? { icon: d.icon, count: 0, imp: 0 };
    cur.count += 1;
    cur.imp += e.importance ?? 3;
    domainTally.set(d.name, cur);
  }
  const domainPulse = [...domainTally.entries()]
    .map(([name, v]) => ({ name, icon: v.icon, count: v.count, avgImp: v.imp / v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxDomain = Math.max(1, ...domainPulse.map((d) => d.count));

  const tickerItems = events
    .map((e) => ({ id: e.id, rec: one(e.event_analyses)?.recommendation }))
    .filter((t): t is { id: string; rec: string } => !!t.rec)
    .slice(0, 10);

  const chains = (edgesData ?? [])
    .map((e) => ({ relation: e.relation, source: one(e.source), target: one(e.target) }))
    .filter((c) => c.source && c.target);

  const blips = events.map((e) => ({ id: e.id, importance: e.importance ?? 3 }));

  const { quotes: marketQuotes } = await fetchMarket();
  const market = marketQuotes.filter((q) => q.price != null).slice(0, 6);

  return (
    <div className="pb-24">
      {/* ================= HERO — Strategic Pulse ================= */}
      <div className="px-6 md:px-10 pt-10 md:pt-14">
        <Reveal>
          <div className="bezel">
            <div className="core relative overflow-hidden p-7 md:p-10">
              <div
                aria-hidden
                className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-400/[0.07] blur-3xl"
              />
              <div className="grid gap-8 lg:grid-cols-5 items-center relative">
                <div className="lg:col-span-3">
                  <span className="eyebrow">
                    <span className="relative flex h-2 w-2">
                      <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Insight Engine · Live
                  </span>
                  <h1 className="display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] mt-5">
                    Strategic Pulse.
                  </h1>
                  <p className="text-[15px] md:text-base text-[var(--muted)] mt-4 max-w-xl leading-relaxed">
                    Denyut intelijen GSIP hari ini — disintesis otomatis dari peristiwa, analisis
                    5W1H, dan graf pengetahuan lintas domain.
                  </p>
                  <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <Pulse label="Strategic Events" value={<CountUp value={events.length} />} />
                    <Pulse
                      label="Sinyal Kritis"
                      value={<CountUp value={critical.length} />}
                      tone="text-rose-600"
                    />
                    <Pulse label="Rata-rata Risk" value={<CountUp value={avgRisk} decimals={1} />} tone="text-amber-600" />
                    <Pulse label="Entities · KG" value={<CountUp value={entityCount ?? 0} />} tone="text-sky-600" />
                  </div>
                </div>
                <div className="lg:col-span-2 h-64 md:h-80">
                  <RadarHero blips={blips} />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ================= REKOMENDASI TICKER ================= */}
      {tickerItems.length > 0 && (
        <Reveal delay={120}>
          <div className="ticker mt-6 border-y border-[var(--hairline)] bg-[var(--surface)] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <div className="ticker-track flex w-max items-center gap-10 py-3.5 px-6">
              {[...tickerItems, ...tickerItems].map((t, i) => (
                <Link
                  key={`${t.id}-${i}`}
                  href={`/events/${t.id}`}
                  className="flex items-center gap-2.5 whitespace-nowrap text-sm text-foreground/80 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <Icon name="sparkles" size={14} className="text-amber-500 shrink-0" />
                  {t.rec}
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      <div className="px-6 md:px-10 mt-8 space-y-8">
        {/* ================= MARKET PULSE ================= */}
        {market.length > 0 && (
          <Reveal>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow">
                  <Icon name="candlestick-chart" size={12} className="text-emerald-600" /> Market Pulse
                </span>
                <Link href="/markets" className="text-[11px] font-mono text-[var(--muted)] hover:text-emerald-700 inline-flex items-center gap-1">
                  Semua instrumen <Icon name="arrow-right" size={11} />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {market.map((q) => {
                  const up = (q.changePct ?? 0) >= 0;
                  return (
                    <div key={q.symbol} className="flex flex-col gap-1">
                      <div className="text-[11px] font-mono text-[var(--muted)] truncate">{q.label}</div>
                      <div className="display text-lg font-semibold tabular-nums leading-none">
                        {q.price != null && q.price >= 1000
                          ? q.price.toLocaleString("en-US", { maximumFractionDigits: 0 })
                          : q.price?.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </div>
                      <div className={`text-[11px] font-mono inline-flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-rose-600"}`}>
                        <Icon name={up ? "arrow-up-right" : "arrow-down-right"} size={11} />
                        {up ? "+" : ""}{q.changePct?.toFixed(2)}%
                      </div>
                      <Sparkline data={q.series} up={up} width={110} height={28} />
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        )}

        {/* ================= TOP SIGNAL + GAUGES ================= */}
        {topSignal && (
          <div className="grid gap-4 lg:grid-cols-12">
            <Reveal delay={60} className="lg:col-span-7">
              <div className="glow-border h-full">
                <div className="relative z-10 h-full rounded-[calc(1.3rem-1.5px)] bg-[var(--panel)] p-7 md:p-8">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="eyebrow">
                      <Icon name="crosshair" size={12} className="text-emerald-600" /> Top Signal
                    </span>
                    {one(topSignal.domains) && <Chip>{one(topSignal.domains)!.name}</Chip>}
                    {one(topSignal.event_types) && <Chip>{one(topSignal.event_types)!.label}</Chip>}
                    <span className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-mono sev-${topSignal.importance ?? 3}`}>
                      IMP {topSignal.importance ?? "–"}/5
                    </span>
                  </div>
                  <Link
                    href={`/events/${topSignal.id}`}
                    className="display block text-2xl md:text-3xl font-semibold tracking-tight leading-snug mt-5 hover:text-emerald-700 transition-colors"
                  >
                    {topSignal.title}
                  </Link>
                  {topSignal.summary && (
                    <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{topSignal.summary}</p>
                  )}
                  {topAnalysis?.why && (
                    <p className="text-sm mt-4 leading-relaxed">
                      <span className="font-semibold text-emerald-700">Mengapa penting · </span>
                      {topAnalysis.why}
                    </p>
                  )}
                  {topAnalysis?.recommendation && (
                    <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 flex gap-3">
                      <Icon name="lightbulb" size={17} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm leading-relaxed">{topAnalysis.recommendation}</p>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>

            <Reveal delay={140} className="lg:col-span-5">
              <div className="card h-full p-7 flex flex-col">
                <span className="eyebrow self-start">
                  <Icon name="activity" size={12} className="text-emerald-600" /> Analysis · L4
                </span>
                <div className="flex-1 grid grid-cols-2 place-items-center gap-y-6 mt-6">
                  <ScoreGauge label="Impact" value={topAnalysis?.impact_score ?? 0} tone="amber" decimals={0} />
                  <ScoreGauge label="Risk" value={topAnalysis?.risk_score ?? 0} tone="rose" decimals={0} />
                  <ScoreGauge label="Opportunity" value={topAnalysis?.opportunity_score ?? 0} tone="emerald" decimals={0} />
                  <ScoreGauge label="Confidence" value={topAnalysis?.confidence_score ?? 0} max={1} tone="sky" decimals={2} />
                </div>
                {topAnalysis?.prediction && (
                  <p className="text-xs text-[var(--muted)] leading-relaxed mt-6 border-t border-[var(--hairline-soft)] pt-4">
                    <span className="font-semibold text-foreground/80">Prediksi · </span>
                    {topAnalysis.prediction}
                  </p>
                )}
              </div>
            </Reveal>
          </div>
        )}

        {/* ================= RISK MATRIX + DOMAIN PULSE ================= */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Reveal delay={60} className="lg:col-span-7">
            <div className="card h-full p-7">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
                <span className="eyebrow">
                  <Icon name="scatter-chart" size={12} className="text-emerald-600" /> Risk × Impact Matrix
                </span>
                <span className="text-[11px] font-mono text-[var(--muted)]">
                  {matrixPoints.length} events · hover untuk detail
                </span>
              </div>
              <RiskMatrix points={matrixPoints} />
            </div>
          </Reveal>

          <Reveal delay={140} className="lg:col-span-5">
            <div className="card h-full p-7">
              <span className="eyebrow">
                <Icon name="globe" size={12} className="text-emerald-600" /> Domain Pulse
              </span>
              <div className="mt-6 flex flex-col gap-4">
                {domainPulse.map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center gap-2 text-sm mb-1.5">
                      <Icon name={d.icon} size={14} className="text-emerald-600 shrink-0" />
                      <span className="flex-1 truncate">{d.name}</span>
                      <span className="font-mono text-xs text-[var(--muted)]">
                        {d.count} event · imp {d.avgImp.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="bar-fill h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400"
                        style={{ "--w": `${(d.count / maxDomain) * 100}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                ))}
                {domainPulse.length === 0 && (
                  <p className="text-sm text-[var(--muted)]">Belum ada event berdomain.</p>
                )}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[var(--hairline-soft)] pt-5">
                <div>
                  <div className="display text-2xl font-semibold tabular-nums text-amber-600">
                    <CountUp value={avgOpp} decimals={1} />
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">Rata-rata Opportunity</div>
                </div>
                <div>
                  <div className="display text-2xl font-semibold tabular-nums text-rose-600">
                    <CountUp value={avgRisk} decimals={1} />
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-0.5">Rata-rata Risk</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* ================= CAUSAL CHAINS ================= */}
        <Reveal delay={60}>
          <div className="card p-7 md:p-8">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="eyebrow">
                <Icon name="git-branch" size={12} className="text-emerald-600" /> Causal Chains · Event → Event
              </span>
              <span className="text-[11px] font-mono text-[var(--muted)]">{chains.length} rantai terdeteksi</span>
            </div>
            {chains.length === 0 ? (
              <p className="text-sm text-[var(--muted)] mt-5">
                Belum ada rantai kausal — pipeline akan menautkan event secara otomatis saat pola pemicu terdeteksi.
              </p>
            ) : (
              <div className="mt-6 flex flex-col gap-5">
                {chains.map((c, i) => (
                  <div key={i} className="grid md:grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <Link
                      href={`/events/${c.source!.id}`}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-snug hover:border-emerald-500/40 transition-colors cursor-pointer"
                    >
                      {c.source!.title}
                    </Link>
                    <div className="flex items-center justify-center gap-2 px-1">
                      <svg width="46" height="12" aria-hidden className="text-emerald-500 hidden md:block">
                        <line x1="0" y1="6" x2="38" y2="6" stroke="currentColor" strokeWidth="1.5" className="flow-line" />
                        <path d="M38 2 L46 6 L38 10 Z" fill="currentColor" />
                      </svg>
                      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-emerald-700">
                        {c.relation}
                      </span>
                      <svg width="46" height="12" aria-hidden className="text-emerald-500 hidden md:block">
                        <line x1="0" y1="6" x2="38" y2="6" stroke="currentColor" strokeWidth="1.5" className="flow-line" />
                        <path d="M38 2 L46 6 L38 10 Z" fill="currentColor" />
                      </svg>
                    </div>
                    <Link
                      href={`/events/${c.target!.id}`}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-snug hover:border-emerald-500/40 transition-colors cursor-pointer"
                    >
                      {c.target!.title}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Pulse({ label, value, tone = "" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div>
      <div className={`display text-3xl md:text-4xl font-semibold tracking-tight ${tone}`}>{value}</div>
      <div className="text-[11px] text-[var(--muted)] mt-1">{label}</div>
    </div>
  );
}
