import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { MaterialityBoard, type MatItem } from "@/components/materiality/MaterialityBoard";
import { materiality } from "@/lib/materiality";
import { getSessionUser } from "@/lib/supabase/server";
import { CaptureSnapshotButton } from "@/components/materiality/CaptureSnapshotButton";

export const revalidate = 0;
export const metadata = { title: "What Matters Most · GSIP" };

type Raw = {
  id: string;
  title: string;
  summary: string | null;
  event_date: string | null;
  importance: number | null;
  confidence: number | null;
  source_reliability: string | null;
  domains: { name: string; icon: string | null; code: string | null } | { name: string; icon: string | null; code: string | null }[] | null;
  event_types: { label: string } | { label: string }[] | null;
  event_analyses:
    | { impact_score: number | null; risk_score: number | null; opportunity_score: number | null; why: string | null; recommendation: string | null }
    | { impact_score: number | null; risk_score: number | null; opportunity_score: number | null; why: string | null; recommendation: string | null }[]
    | null;
  event_entities:
    | { entities: { name: string; slug: string; country_code: string | null; attributes: { influence?: number | string } | null } | { name: string; slug: string; country_code: string | null; attributes: { influence?: number | string } | null }[] | null }[]
    | null;
};
type DepRow = { country_code: string; name: string; exp_prod_p2: number | null; imp_cons_p2: number | null; fdi_inv_p2: number | null };
const pick = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] : x) ?? null;

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const CHINA_DOMAINS = new Set(["economy", "geopolitics", "technology", "trade", "energy", "geoeconomics"]);

export default async function MaterialityPage() {
  const [user, [{ data }, { data: deps }, { data: leverRows }, { data: scen }, { data: snapRows }]] = await Promise.all([
    getSessionUser(),
    Promise.all([
    supabase
      .from("events")
      .select(
        "id,title,summary,event_date,importance,confidence,source_reliability,domains(name,icon,code),event_types(label),event_analyses(impact_score,risk_score,opportunity_score,why,recommendation),event_entities(entities(name,slug,country_code,attributes))"
      )
      .limit(80)
      .returns<Raw[]>(),
    supabase.from("country_dependency").select("country_code,name,exp_prod_p2,imp_cons_p2,fdi_inv_p2").returns<DepRow[]>(),
    supabase.from("scenario_levers").select("name,value_low,value_high,sort_order").order("sort_order")
      .returns<{ name: string; value_low: number | null; value_high: number | null; sort_order: number }[]>(),
    supabase.from("scenarios").select("total_low,total_high").order("sort_order").limit(1).maybeSingle()
      .returns<{ total_low: number | null; total_high: number | null }>(),
    supabase.from("materiality_snapshots").select("event_id,title,domain,score,captured_at").order("captured_at", { ascending: false })
      .returns<{ event_id: string | null; title: string | null; domain: string | null; score: number | null; captured_at: string }[]>(),
    ]),
  ]);
  const isAdmin = user?.role === "admin";

  const levers = (leverRows ?? []).map((l) => ({ name: l.name, low: Number(l.value_low), high: Number(l.value_high) }));
  const scenarioTotal = scen ? { low: Number(scen.total_low), high: Number(scen.total_high) } : null;

  // exposure composite (0-100) per country, + stakeholder list
  const exposure: Record<string, number> = {};
  const stakeholders: { code: string; name: string }[] = [];
  for (const d of deps ?? []) {
    const comp = (Number(d.exp_prod_p2 ?? 0) + Number(d.imp_cons_p2 ?? 0) + Number(d.fdi_inv_p2 ?? 0)) / 3;
    exposure[d.country_code] = Math.round(clamp((comp / 12) * 100));
    stakeholders.push({ code: d.country_code, name: d.name });
  }
  stakeholders.sort((a, b) => a.name.localeCompare(b.name));

  const now = new Date();

  const items: MatItem[] = (data ?? []).map((e) => {
    const dom = pick(e.domains);
    const typ = pick(e.event_types);
    const an = pick(e.event_analyses);

    const sev = [an?.impact_score, an?.risk_score, an?.opportunity_score].filter((x): x is number => x != null);

    const ents = (e.event_entities ?? [])
      .map((ee) => {
        const en = pick(ee.entities);
        return en ? { name: en.name, slug: en.slug, cc: en.country_code, influence: Math.round(Number(en.attributes?.influence ?? 0)) } : null;
      })
      .filter((x): x is { name: string; slug: string; cc: string | null; influence: number } => !!x)
      .sort((a, b) => b.influence - a.influence);

    const { components, score } = materiality({
      importance: e.importance, confidence: e.confidence, sourceReliability: e.source_reliability,
      sev, leverageInfluence: ents[0]?.influence ?? 0, hasEntities: ents.length > 0,
      eventDate: e.event_date, now: now.getTime(),
    });

    const linkedCountries = [...new Set(ents.map((x) => x.cc).filter((c): c is string => !!c))];
    const chinaThemed =
      linkedCountries.includes("CN") ||
      ents.some((x) => x.slug === "china" || /china|tiongkok/i.test(x.name)) ||
      (dom?.code ? CHINA_DOMAINS.has(dom.code) : false);

    return {
      id: e.id,
      title: e.title,
      summary: e.summary,
      event_date: e.event_date,
      domainName: dom?.name ?? null,
      domainIcon: dom?.icon ?? "radar",
      domainCode: dom?.code ?? null,
      typeLabel: typ?.label ?? null,
      score,
      components,
      why: {
        impact: an?.impact_score ?? null,
        risk: an?.risk_score ?? null,
        opportunity: an?.opportunity_score ?? null,
        recommendation: an?.recommendation ?? null,
        whyText: an?.why ?? null,
      },
      entities: ents.slice(0, 4).map(({ name, slug, influence }) => ({ name, slug, influence })),
      linkedCountries,
      chinaThemed,
    };
  }).sort((a, b) => b.score - a.score);

  // materiality momentum — movers between the two latest snapshots
  const snaps = snapRows ?? [];
  const times = [...new Set(snaps.map((s) => s.captured_at))].sort().reverse();
  const t1 = times[0], t0 = times[1];
  type Mover = { title: string; domain: string | null; score: number; delta: number };
  let risers: Mover[] = [], fallers: Mover[] = [];
  if (t1 && t0) {
    const prev = new Map(snaps.filter((s) => s.captured_at === t0).map((s) => [s.event_id, Number(s.score)]));
    const cur: Mover[] = snaps.filter((s) => s.captured_at === t1).map((s) => ({
      title: s.title ?? "—", domain: s.domain, score: Number(s.score),
      delta: Number(s.score) - (prev.get(s.event_id) ?? Number(s.score)),
    })).filter((x) => x.delta !== 0);
    risers = cur.filter((x) => x.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
    fallers = cur.filter((x) => x.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);
  }
  const capFrom = t0?.slice(0, 10), capTo = t1?.slice(0, 10);

  return (
    <div>
      <PageHeader
        layer="Intelijen · Materialitas"
        icon="scan-search"
        title="What Matters Most"
        subtitle="Jawaban langsung: perubahan mana yang paling penting — dan mengapa harus peduli. Satu peringkat yang memfusikan signifikansi, kredibilitas sumber, dampak, leverage aktor, dan urgensi. Pilih sudut pandang untuk melihat 'paling penting bagi siapa'."
      />

      <div className="px-6 md:px-10 pb-24 space-y-6 max-w-4xl">
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--muted)]">
          <span className="font-mono uppercase tracking-wider">Skor =</span>
          {[
            ["Signifikansi", "30%", "#10b981"], ["Kredibilitas", "15%", "#38bdf8"],
            ["Dampak", "25%", "#f43f5e"], ["Leverage", "20%", "#a78bfa"], ["Urgensi", "10%", "#f59e0b"],
          ].map(([l, w, c]) => (
            <span key={l} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: (c as string) + "14", color: c as string }}>
              {l} <span className="font-mono opacity-70">{w}</span>
            </span>
          ))}
          <span className="ml-auto font-mono text-[var(--muted)]">{items.length} perubahan dinilai</span>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-3 flex-wrap">
            <CaptureSnapshotButton />
            <span className="text-[11px] text-[var(--muted)]">
              Merekam titik materialitas &amp; metrik GSIP saat ini untuk momentum di bawah.
            </span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[var(--muted)]">
            <Icon name="scan-search" size={22} className="mx-auto mb-2" /> Belum ada peristiwa untuk dinilai. Tambah melalui pipeline ingest.
          </div>
        ) : (
          <MaterialityBoard items={items} exposure={exposure} stakeholders={stakeholders} levers={levers} scenarioTotal={scenarioTotal} />
        )}

        {(risers.length > 0 || fallers.length > 0) && (
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
                <Icon name="activity" size={14} /> Momentum Materiality — apa yang naik & turun
              </div>
              <span className="text-[11px] font-mono text-[var(--muted)]">{capFrom} → {capTo}</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] mb-3">
              Perubahan skor materialitas antar snapshot (direkam manual via <code>capture_materiality_snapshot()</code>).
            </p>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 mb-1.5">Naik</div>
                {risers.length ? risers.map((m, i) => <MoverRow key={i} m={m} up />) : <p className="text-[11px] text-[var(--muted)]">—</p>}
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-rose-700 mb-1.5">Turun</div>
                {fallers.length ? fallers.map((m, i) => <MoverRow key={i} m={m} />) : <p className="text-[11px] text-[var(--muted)]">—</p>}
              </div>
            </div>
          </section>
        )}

        <p className="text-[11px] font-mono text-[var(--muted)]/70">
          Bobot transparan; dihitung dari data GSIP (importance, grading sumber NATO, skor 5W1H, influence aktor, kebaruan). Sudut pandang membobot ulang lewat relevansi: keterlibatan langsung + eksposur China negara (country_dependency).
        </p>
      </div>
    </div>
  );
}

function MoverRow({ m, up = false }: { m: { title: string; domain: string | null; score: number; delta: number }; up?: boolean }) {
  const col = up ? "#10b981" : "#f43f5e";
  return (
    <div className="flex items-center gap-2 py-1">
      <span style={{ color: col }} className="shrink-0"><Icon name={up ? "trending-up" : "trending-down"} size={13} /></span>
      <span className="text-sm flex-1 min-w-0 truncate">{m.title}</span>
      <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">{m.score}</span>
      <span className="font-mono text-[11px] tabular-nums w-10 text-right" style={{ color: col }}>{m.delta > 0 ? "+" : ""}{m.delta.toFixed(0)}</span>
    </div>
  );
}
