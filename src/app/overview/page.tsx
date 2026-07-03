import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";
import { materiality, matScoreColor } from "@/lib/materiality";

export const revalidate = 0;
export const metadata = { title: "Strategic Overview · GSIP" };

const pick = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] : x) ?? null;

type Analysis = {
  impact_score: number | null; risk_score: number | null; opportunity_score: number | null;
  recommendation: string | null; risk: string | null; opportunity: string | null; why: string | null;
};
type Ev = {
  id: string; title: string; summary: string | null; event_date: string | null;
  importance: number | null; confidence: number | null; source_reliability: string | null;
  domains: { name: string; icon: string | null; code: string | null } | { name: string; icon: string | null; code: string | null }[] | null;
  event_analyses: Analysis | Analysis[] | null;
  event_entities: { entities: { country_code: string | null; attributes: { influence?: number | string } | null } | { country_code: string | null; attributes: { influence?: number | string } | null }[] | null }[] | null;
};
type Series = { slug: string; label: string; category: string | null; unit: string | null; points: { y: number; v: number }[] | null; note: string | null };
type Scen = { slug: string; title: string; subtitle: string | null; probability: number; color: string; drivers: string | null; implication: string | null; source: string | null };
type Outlook = { slug: string; name: string; growth_pct: number; impact_level: string; confidence: string; trend: number[] | null; note: string | null };

const LEVEL_COLOR: Record<string, string> = { high: "#f43f5e", medium: "#f59e0b", low: "#10b981" };
const CONF_COLOR: Record<string, string> = { high: "#10b981", medium: "#f59e0b", low: "#94a3b8" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function relTime(d: string | null) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return "hari ini";
  if (days === 1) return "kemarin";
  if (days < 30) return `${days} hari lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bln lalu`;
  return `${Math.floor(days / 365)} thn lalu`;
}

export default async function OverviewPage() {
  const [{ data: evData }, { data: serData }, { count: entCount }, { data: scenData }, { data: entTypeData }, { data: typeData }, { data: outlookData }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id,title,summary,event_date,importance,confidence,source_reliability,domains(name,icon,code),event_analyses(impact_score,risk_score,opportunity_score,recommendation,risk,opportunity,why),event_entities(entities(country_code,attributes))"
      )
      .order("event_date", { ascending: false })
      .limit(200)
      .returns<Ev[]>(),
    supabase.from("strategic_series").select("slug,label,category,unit,points,note").order("sort_order").returns<Series[]>(),
    supabase.from("entities").select("id", { count: "exact", head: true }),
    supabase.from("foresight_scenarios").select("slug,title,subtitle,probability,color,drivers,implication,source").order("sort_order").returns<Scen[]>(),
    supabase.from("entities").select("entity_type_id").returns<{ entity_type_id: string | null }[]>(),
    supabase.from("entity_types").select("id,label,sort_order").returns<{ id: string; label: string; sort_order: number | null }[]>(),
    supabase.from("industry_outlook").select("slug,name,growth_pct,impact_level,confidence,trend,note").order("sort_order").returns<Outlook[]>(),
  ]);

  const events = evData ?? [];
  const now = Date.now();

  // shape events once
  const rows = events.map((e) => {
    const dom = pick(e.domains);
    const an = pick(e.event_analyses);
    const sev = [an?.impact_score, an?.risk_score, an?.opportunity_score].filter((x): x is number => x != null);
    const ents = (e.event_entities ?? []).map((ee) => pick(ee.entities)).filter(Boolean) as { country_code: string | null; attributes: { influence?: number | string } | null }[];
    const maxInfl = Math.max(0, ...ents.map((x) => Number(x.attributes?.influence ?? 0)));
    const { score } = materiality({
      importance: e.importance, confidence: e.confidence, sourceReliability: e.source_reliability,
      sev, leverageInfluence: maxInfl, hasEntities: ents.length > 0, eventDate: e.event_date, now,
    });
    return {
      id: e.id, title: e.title, summary: e.summary, date: e.event_date,
      domName: dom?.name ?? null, domIcon: dom?.icon ?? "radar",
      impact: an?.impact_score ?? null, risk: an?.risk_score ?? null, opp: an?.opportunity_score ?? null,
      rec: an?.recommendation ?? null, riskTxt: an?.risk ?? null, oppTxt: an?.opportunity ?? null,
      countries: ents.map((x) => x.country_code).filter((c): c is string => !!c),
      score,
    };
  });

  // KPIs (real, discriminating)
  const kpiRisks = rows.filter((r) => (r.risk ?? 0) >= 4).length;
  const kpiOpps = rows.filter((r) => (r.opp ?? 0) >= 4).length;
  const kpiRecs = rows.filter((r) => r.rec && r.rec.trim()).length;
  const countrySet = new Set(rows.flatMap((r) => r.countries));

  // signal concentration by country
  const conc = new Map<string, { evt: number; infl: number; n: number }>();
  for (const r of rows) {
    for (const cc of new Set(r.countries)) {
      const c = conc.get(cc) ?? { evt: 0, infl: 0, n: 0 };
      c.evt += 1; c.infl += r.score; c.n += 1;
      conc.set(cc, c);
    }
  }
  const concentration = [...conc.entries()]
    .map(([cc, c]) => ({ cc, evt: c.evt, avg: Math.round(c.infl / Math.max(1, c.n)) }))
    .sort((a, b) => b.evt - a.evt || b.avg - a.avg)
    .slice(0, 8);
  const maxEvt = Math.max(1, ...concentration.map((c) => c.evt));

  const topRisks = [...rows].filter((r) => r.risk != null).sort((a, b) => (b.risk ?? 0) - (a.risk ?? 0) || b.score - a.score).slice(0, 5);
  const topOpps = [...rows].filter((r) => r.opp != null).sort((a, b) => (b.opp ?? 0) - (a.opp ?? 0) || b.score - a.score).slice(0, 5);
  const topMaterial = [...rows].sort((a, b) => b.score - a.score).slice(0, 3);
  const actions = [...rows].filter((r) => r.rec && r.rec.trim()).sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0) || b.score - a.score).slice(0, 5);
  const latest = [...rows].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 6);
  const series = (serData ?? []).filter((s) => (s.points?.length ?? 0) >= 2).slice(0, 6);
  const scenarios = scenData ?? [];

  // watchlist — entities per type (JS aggregate, no extra DB object)
  const typeMap = new Map((typeData ?? []).map((t) => [t.id, t.label]));
  const wc = new Map<string, number>();
  for (const e of entTypeData ?? []) {
    const l = e.entity_type_id ? typeMap.get(e.entity_type_id) : null;
    if (l) wc.set(l, (wc.get(l) ?? 0) + 1);
  }
  const watchlist = [...wc.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 8);
  const watchTotal = watchlist.reduce((s, w) => s + w.n, 0);
  const outlook = outlookData ?? [];
  const maxGrowth = Math.max(1, ...outlook.map((o) => Number(o.growth_pct)));

  const kpis = [
    { icon: "radar", label: "Sinyal Strategis", value: rows.length, sub: "peristiwa dinilai", color: "#38bdf8" },
    { icon: "shield-alert", label: "Risiko Tinggi", value: kpiRisks, sub: "risk score ≥ 4", color: "#f43f5e" },
    { icon: "target", label: "Peluang", value: kpiOpps, sub: "opportunity ≥ 4", color: "#10b981" },
    { icon: "share-2", label: "Entitas Dipantau", value: entCount ?? 0, sub: "node knowledge graph", color: "#a78bfa" },
    { icon: "globe", label: "Negara", value: countrySet.size, sub: "terhubung ke sinyal", color: "#f59e0b" },
    { icon: "list-checks", label: "Rekomendasi", value: kpiRecs, sub: "aksi tersedia", color: "#38bdf8" },
  ];

  return (
    <div>
      <PageHeader
        layer="Intelligence · Strategic Overview"
        icon="layout-dashboard"
        title="Strategic Overview"
        subtitle="Global signals. Strategic insights. Smarter decisions. Semua angka bersumber dari data GSIP — tanpa metrik hiasan."
      />

      <div className="px-6 md:px-10 pb-24 space-y-5 max-w-6xl">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="card p-4">
              <div className="flex items-center gap-2 text-[var(--muted)] mb-2">
                <span style={{ color: k.color }} className="inline-flex"><Icon name={k.icon} size={15} /></span>
                <span className="text-[10px] font-mono uppercase tracking-wider leading-tight">{k.label}</span>
              </div>
              <div className="text-2xl font-semibold tabular-nums" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[10px] text-[var(--muted)] mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Row: concentration + latest */}
        <div className="grid lg:grid-cols-3 gap-5">
          <section className="card p-5 lg:col-span-2">
            <SectionHead icon="git-compare-arrows" title="Konsentrasi Sinyal per Negara" href="/heatmap" />
            <p className="text-[11px] text-[var(--muted)] mb-3">Negara dengan peristiwa strategis terbanyak; bilah = jumlah sinyal, angka = rata-rata materialitas.</p>
            <div className="space-y-2">
              {concentration.map((c) => (
                <div key={c.cc} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm truncate">{countryName(c.cc)}</span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--panel)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.evt / maxEvt) * 100}%`, background: matScoreColor(c.avg) }} />
                  </div>
                  <span className="w-8 text-right font-mono text-[11px] tabular-nums text-[var(--muted)]">{c.evt}</span>
                  <span className="w-9 text-right font-mono text-[11px] tabular-nums" style={{ color: matScoreColor(c.avg) }}>{c.avg}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <SectionHead icon="newspaper" title="Latest Intelligence" href="/events" />
            <div className="divide-y divide-[var(--border)]">
              {latest.map((r) => (
                <Link key={r.id} href={`/events/${r.id}`} className="flex items-start gap-2 py-2.5 group">
                  <Icon name={r.domIcon} size={14} className="mt-0.5 text-[var(--muted)] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">{r.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[var(--muted)]">
                      {r.domName && <span className="rounded-full bg-[var(--panel)] px-1.5 py-0.5">{r.domName}</span>}
                      <span>{relTime(r.date)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Row: risks | opps | materiality */}
        <div className="grid lg:grid-cols-3 gap-5">
          <RankCard icon="shield-alert" title="Top Strategic Risks" href="/posture" color="#f43f5e"
            items={topRisks.map((r) => ({ id: r.id, title: r.title, dom: r.domName, score: r.risk ?? 0, note: r.riskTxt }))} scoreMax={5} />
          <RankCard icon="target" title="Top Opportunities" href="/posture" color="#10b981"
            items={topOpps.map((r) => ({ id: r.id, title: r.title, dom: r.domName, score: r.opp ?? 0, note: r.oppTxt }))} scoreMax={5} />
          <section className="card p-5">
            <SectionHead icon="scan-search" title="What Matters Most" href="/materiality" />
            <p className="text-[11px] text-[var(--muted)] mb-3">Peringkat materialitas terfusi (signifikansi · kredibilitas · dampak · leverage · urgensi).</p>
            <div className="space-y-3">
              {topMaterial.map((r, i) => (
                <Link key={r.id} href={`/events/${r.id}`} className="flex items-center gap-3 group">
                  <span className="font-mono text-xs text-[var(--muted)] w-4">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">{r.title}</div>
                    {r.domName && <div className="text-[10px] font-mono text-[var(--muted)] mt-0.5">{r.domName}</div>}
                  </div>
                  <span className="font-mono text-sm tabular-nums shrink-0" style={{ color: matScoreColor(r.score) }}>{r.score}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Row: industry outlook */}
        <section className="card p-5">
          <SectionHead icon="trending-up" title="Industry Outlook · 5 Tahun" href="/domains" />
          <p className="text-[11px] text-[var(--muted)] mb-3">Estimasi CAGR analis GSIP (indikatif, belum dikalibrasi). Warna dampak = risiko relevansi ke grup.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] text-left">
                  <th className="font-normal pb-2">Industri</th>
                  <th className="font-normal pb-2">Growth</th>
                  <th className="font-normal pb-2 w-24">Tren</th>
                  <th className="font-normal pb-2">Dampak</th>
                  <th className="font-normal pb-2">Keyakinan</th>
                </tr>
              </thead>
              <tbody>
                {outlook.map((o) => {
                  const g = Number(o.growth_pct);
                  const pts = (o.trend ?? []).map((v, i) => ({ y: i, v }));
                  return (
                    <tr key={o.slug} className="border-t border-[var(--border)]">
                      <td className="py-2.5 pr-2">{o.name}</td>
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-[var(--panel)] overflow-hidden hidden sm:block">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(g / maxGrowth) * 100}%` }} />
                          </div>
                          <span className="font-mono tabular-nums text-emerald-600">{g}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2">{pts.length >= 2 && <Sparkline points={pts} color="#38bdf8" />}</td>
                      <td className="py-2.5 pr-2"><Pill text={cap(o.impact_level)} color={LEVEL_COLOR[o.impact_level] ?? "#94a3b8"} /></td>
                      <td className="py-2.5"><Pill text={cap(o.confidence)} color={CONF_COLOR[o.confidence] ?? "#94a3b8"} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Row: early warning */}
        <section className="card p-5">
          <SectionHead icon="activity" title="Strategic Early Warning — Indikator Struktural" href="/trajectory" />
          <p className="text-[11px] text-[var(--muted)] mb-4">Seri jangka panjang (sumber tervalidasi). Tren dari titik pertama ke terakhir; bukan sinyal beli/jual.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {series.map((s) => {
              const pts = s.points ?? [];
              const last = pts[pts.length - 1].v, first = pts[0].v;
              const up = last >= first;
              const col = up ? "#10b981" : "#f43f5e";
              return (
                <div key={s.slug} className="flex items-center gap-3">
                  <Sparkline points={pts} color={col} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs leading-snug line-clamp-2">{s.label}</div>
                    <div className="text-[10px] font-mono text-[var(--muted)] mt-0.5">{s.category}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm tabular-nums" style={{ color: col }}>{last}{s.unit === "%" ? "%" : ""}</div>
                    <div className="text-[10px] font-mono flex items-center gap-0.5 justify-end" style={{ color: col }}>
                      <Icon name={up ? "trending-up" : "trending-down"} size={10} />{up ? "+" : ""}{(last - first).toFixed(1)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Row: scenario probability + watchlist */}
        <div className="grid lg:grid-cols-3 gap-5">
          <section className="card p-5 lg:col-span-2">
            <SectionHead icon="git-fork" title="Scenario Probability · 2030" href="/scenarios" />
            <p className="text-[11px] text-[var(--muted)] mb-4">
              Kerangka skenario GSIP — <span className="text-[var(--fg)]">prior analis</span>, belum dikalibrasi data. Total {scenarios.reduce((s, x) => s + Number(x.probability), 0)}%.
            </p>
            <div className="space-y-3.5">
              {scenarios.map((s) => (
                <div key={s.slug}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="text-sm font-medium">{s.title}</span>
                    <span className="text-[11px] text-[var(--muted)] truncate">{s.subtitle}</span>
                    <span className="ml-auto font-mono text-sm tabular-nums" style={{ color: s.color }}>{Number(s.probability)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--panel)] overflow-hidden mb-1">
                    <div className="h-full rounded-full" style={{ width: `${Number(s.probability)}%`, background: s.color }} />
                  </div>
                  {s.implication && <p className="text-[11px] text-[var(--muted)] pl-[18px] leading-snug">{s.implication}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <SectionHead icon="star" title="Watchlist Overview" href="/entities" />
            <p className="text-[11px] text-[var(--muted)] mb-3">{watchTotal} entitas dipantau, per tipe.</p>
            <div className="space-y-2">
              {watchlist.map((w) => (
                <div key={w.label} className="flex items-center gap-3">
                  <span className="flex-1 text-sm truncate">{w.label}</span>
                  <div className="w-16 h-1.5 rounded-full bg-[var(--panel)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(w.n / Math.max(1, watchlist[0].n)) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-[11px] tabular-nums text-[var(--muted)]">{w.n}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Row: recommended actions */}
        <section className="card p-5">
          <SectionHead icon="list-checks" title="Recommended Strategic Actions" href="/posture" />
          <div className="space-y-1">
            {actions.map((r, i) => (
              <Link key={r.id} href={`/events/${r.id}`} className="flex items-start gap-3 py-2 group border-b border-[var(--border)] last:border-0">
                <span className="font-mono text-xs text-[var(--muted)] w-4 mt-0.5">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug group-hover:text-[var(--accent)] transition-colors">{r.rec}</div>
                  <div className="text-[10px] font-mono text-[var(--muted)] mt-0.5 truncate">↳ {r.title}</div>
                </div>
                {r.impact != null && (
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono"
                    style={{ background: matScoreColor((r.impact / 5) * 100) + "1a", color: matScoreColor((r.impact / 5) * 100) }}>
                    dampak {r.impact}/5
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        <p className="text-[11px] font-mono text-[var(--muted)]/70 pt-1">
          {rows.length} peristiwa · {entCount ?? 0} entitas · {countrySet.size} negara · {series.length} indikator. Semua metrik dihitung langsung dari Supabase GSIP saat render — tidak ada angka placeholder.
        </p>
      </div>
    </div>
  );
}

function SectionHead({ icon, title, href }: { icon: string; title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-1">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
        <Icon name={icon} size={14} /> {title}
      </div>
      {href && <Link href={href} className="text-[11px] font-mono text-[var(--accent)] hover:underline">View All</Link>}
    </div>
  );
}

function RankCard({ icon, title, href, color, items, scoreMax }: {
  icon: string; title: string; href?: string; color: string;
  items: { id: string; title: string; dom: string | null; score: number; note: string | null }[]; scoreMax: number;
}) {
  return (
    <section className="card p-5">
      <SectionHead icon={icon} title={title} href={href} />
      <div className="space-y-2.5 mt-2">
        {items.length === 0 && <p className="text-[11px] text-[var(--muted)]">—</p>}
        {items.map((it, i) => (
          <Link key={it.id} href={`/events/${it.id}`} className="flex items-start gap-3 group">
            <span className="font-mono text-xs text-[var(--muted)] w-4 mt-0.5">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">{it.title}</div>
              {it.dom && <div className="text-[10px] font-mono text-[var(--muted)] mt-0.5">{it.dom}</div>}
            </div>
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono tabular-nums"
              style={{ background: color + "1a", color }}>{it.score}/{scoreMax}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-mono" style={{ background: color + "1a", color }}>
      {text}
    </span>
  );
}

function Sparkline({ points, color }: { points: { y: number; v: number }[]; color: string }) {
  const w = 64, h = 22, pad = 2;
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs), hi = Math.max(...vs);
  const span = hi - lo || 1;
  const path = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2);
      const y = h - pad - ((p.v - lo) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <path d={path} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
