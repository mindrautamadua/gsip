import { supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PostureBoard, type PItem } from "@/components/posture/PostureBoard";

export const revalidate = 0;
export const metadata = { title: "Risks & Opportunities · GSIP" };

const pick = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] : x) ?? null;

type AnalysisRow = {
  risk: string | null; risk_score: number | null;
  opportunity: string | null; opportunity_score: number | null;
  impact_score: number | null; recommendation: string | null;
  events: { id: string; title: string; event_date: string | null; importance: number | null }
    | { id: string; title: string; event_date: string | null; importance: number | null }[] | null;
};
type ActRow = {
  id: string; event_id: string | null; title: string; owner: string | null; status: string;
  priority: number | null; due_date: string | null;
  action_types: { code: string; label: string } | { code: string; label: string }[] | null;
};
type ATRow = { code: string; label: string };
type DepRow = { name: string; region: string | null; china_reliance_note: string | null };
type SubRow = { shock_label: string; shock_icon: string | null; beneficiary_name: string; readiness: string | null; magnitude: string | null };
type PredRow = { statement: string; probability: number; horizon_date: string | null };

const READINESS_TONE: Record<string, string> = { high: "text-emerald-600", medium: "text-amber-600", low: "text-rose-600" };

export default async function PosturePage() {
  const [{ data: analyses }, { data: deps }, { data: subs }, { data: preds }, { data: acts }, { data: actionTypes }] = await Promise.all([
    supabase
      .from("event_analyses")
      .select("risk,risk_score,opportunity,opportunity_score,impact_score,recommendation,events(id,title,event_date,importance)")
      .returns<AnalysisRow[]>(),
    supabase.from("country_dependency").select("name,region,china_reliance_note").eq("china_reliance_level", "high").order("sort_order").returns<DepRow[]>(),
    supabase.from("substitution_chains").select("shock_label,shock_icon,beneficiary_name,readiness,magnitude").order("shock_order").order("sort_order").returns<SubRow[]>(),
    supabase.from("predictions").select("statement,probability,horizon_date").eq("status", "pending").order("probability", { ascending: false }).returns<PredRow[]>(),
    supabase.from("actions").select("id,event_id,title,owner,status,priority,due_date,action_types(code,label)").returns<ActRow[]>(),
    supabase.from("action_types").select("code,label").order("sort_order").returns<ATRow[]>(),
  ]);
  const sessionUser = await getSessionUser().catch(() => null);
  const canManage = sessionUser?.role === "admin" || sessionUser?.role === "analyst";

  // actions (Layer 5) keyed by event → mitigation + ownership for the register
  const actionMap = new Map<string, PItem["actions"]>();
  (acts ?? []).forEach((a) => {
    if (!a.event_id) return;
    const arr = actionMap.get(a.event_id) ?? [];
    arr!.push({
      id: a.id, title: a.title, owner: a.owner, status: a.status,
      type: pick(a.action_types)?.label ?? null, typeCode: pick(a.action_types)?.code ?? null,
      priority: a.priority, due: a.due_date,
    });
    actionMap.set(a.event_id, arr);
  });

  const rows = (analyses ?? []).map((r) => ({ ...r, ev: pick(r.events) }));
  const riskItems: PItem[] = rows
    .filter((r) => r.risk)
    .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    .map((r) => ({
      id: r.ev?.id ?? null, title: r.ev?.title ?? "—", date: r.ev?.event_date ?? null,
      text: r.risk ?? "", score: r.risk_score, recommendation: r.recommendation,
      actions: r.ev?.id ? actionMap.get(r.ev.id) ?? [] : [],
      haystack: `${r.ev?.title ?? ""} ${r.risk ?? ""} ${r.recommendation ?? ""}`.toLowerCase(),
    }));
  const oppItems: PItem[] = rows
    .filter((r) => r.opportunity)
    .sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0))
    .map((r) => ({
      id: r.ev?.id ?? null, title: r.ev?.title ?? "—", date: r.ev?.event_date ?? null,
      text: r.opportunity ?? "", score: r.opportunity_score,
      actions: r.ev?.id ? actionMap.get(r.ev.id) ?? [] : [],
      haystack: `${r.ev?.title ?? ""} ${r.opportunity ?? ""}`.toLowerCase(),
    }));

  const shockMap = new Map<string, { icon: string | null; items: SubRow[] }>();
  (subs ?? []).forEach((s) => {
    if (!shockMap.has(s.shock_label)) shockMap.set(s.shock_label, { icon: s.shock_icon, items: [] });
    shockMap.get(s.shock_label)!.items.push(s);
  });
  const shocks = [...shockMap.entries()];
  const predictions = preds ?? [];

  return (
    <div>
      <PageHeader
        layer="Sintesis · Risiko & Peluang"
        icon="shield-alert"
        title="Risiko & Peluang"
        subtitle="Satu papan yang meringkas 'apa risiko & peluang strategis terbesar kita' — menggabungkan analisis peristiwa, titik ketergantungan struktural, pemenang substitusi, dan sinyal prediksi. Vantage native: kepentingan nasional Indonesia; gunakan Lensa fokus untuk menyaring per aktor/tema."
      />

      <div className="px-6 md:px-10 pb-24 space-y-10 max-w-6xl">
        {/* interactive board with focus lens */}
        <PostureBoard risks={riskItems} opps={oppItems} depCount={(deps ?? []).length} predCount={predictions.length} actionTypes={actionTypes ?? []} canManage={canManage} />

        {/* structural dependency points */}
        {(deps ?? []).length > 0 && (
          <section>
            <div className="mb-4">
              <span className="eyebrow">Struktural</span>
              <h2 className="display text-xl font-semibold tracking-tight mt-2">Titik Ketergantungan Kritis</h2>
              <p className="text-sm text-[var(--muted)] mt-1 max-w-2xl">Leverage rantai pasok — di mana ketergantungan tinggi menciptakan risiko sekaligus daya tawar.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(deps ?? []).map((d) => (
                <div key={d.name} className="card p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon name="link" size={14} className="text-amber-600" />
                    <span className="text-sm font-medium">{d.name}</span>
                    {d.region && <span className="ml-auto text-[10px] text-[var(--muted)]/70">{d.region}</span>}
                  </div>
                  <p className="text-[12px] text-[var(--muted)] leading-relaxed">{d.china_reliance_note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* substitution — where value shifts */}
        {shocks.length > 0 && (
          <section>
            <div className="mb-4">
              <span className="eyebrow">Efek orde-kedua</span>
              <h2 className="display text-xl font-semibold tracking-tight mt-2">Ke Mana Nilai Bergeser</h2>
              <p className="text-sm text-[var(--muted)] mt-1 max-w-2xl">Setiap guncangan melahirkan pemenang — peluang bagi yang siap menyerap.</p>
            </div>
            <div className="space-y-3">
              {shocks.map(([label, g]) => (
                <div key={label} className="card p-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Icon name={g.icon} size={15} className="text-rose-600" /> {label}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((it, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs">
                        <span className={`font-medium ${READINESS_TONE[it.readiness ?? ""] ?? ""}`}>{it.beneficiary_name}</span>
                        {it.magnitude && <span className="text-[10px] text-[var(--muted)]/70">· {it.magnitude}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* forward signals */}
        {predictions.length > 0 && (
          <section>
            <div className="mb-4">
              <span className="eyebrow">Ke depan</span>
              <h2 className="display text-xl font-semibold tracking-tight mt-2">Sinyal Prediksi</h2>
            </div>
            <div className="card divide-y divide-[var(--border)]">
              {predictions.slice(0, 8).map((p, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-12 shrink-0">
                    <div className="text-sm font-mono font-semibold tabular-nums text-accent">{Math.round(p.probability * 100)}%</div>
                    <div className="h-1 mt-1 rounded-full bg-[var(--surface-2)] overflow-hidden"><div className="h-full rounded-full bg-accent" style={{ width: `${p.probability * 100}%` }} /></div>
                  </div>
                  <p className="flex-1 min-w-0 text-[13px] leading-snug">{p.statement}</p>
                  {p.horizon_date && <span className="shrink-0 text-[11px] font-mono text-[var(--muted)]/70">{p.horizon_date}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-[11px] font-mono text-[var(--muted)]/70 leading-relaxed">
          Vantage native: kepentingan nasional Indonesia. Lensa fokus menyaring papan ke item yang menyebut/terkait aktor atau tema (bukan menulis ulang analisis). Skor risk/opportunity (1–5) bersifat analis/AI; ketergantungan & substitusi mengadaptasi MGI. Menyintesis {rows.length} analisis · {(deps ?? []).length} titik ketergantungan · {(subs ?? []).length} rantai substitusi · {predictions.length} prediksi.
        </p>
      </div>
    </div>
  );
}
