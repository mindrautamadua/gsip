import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Icon } from "@/components/Icon";
import { statusTxt, statusLabel } from "@/lib/status";

const pick = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] : x) ?? null;

type ARow = {
  risk: string | null; risk_score: number | null;
  opportunity: string | null; opportunity_score: number | null;
  recommendation: string | null;
  events: { id: string; title: string } | { id: string; title: string }[] | null;
};

// Answer-first (BLUF) band for the executive cockpit: states the single most
// urgent risk + its action, the top opportunity, US–China balance, and live counts.
export async function CockpitSummary() {
  const [{ data: analyses }, { data: acts }, { data: scored }] = await Promise.all([
    supabase.from("event_analyses").select("risk,risk_score,opportunity,opportunity_score,recommendation,events(id,title)").returns<ARow[]>(),
    supabase.from("actions").select("event_id,owner,status").returns<{ event_id: string | null; owner: string | null; status: string }[]>(),
    supabase.from("entities").select("country_code,attributes").not("attributes->>influence", "is", null).returns<{ country_code: string | null; attributes: { influence?: number | string } | null }[]>(),
  ]);

  const rows = (analyses ?? []).map((r) => ({ ...r, ev: pick(r.events) }));
  const risks = rows.filter((r) => r.risk).sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  const opps = rows.filter((r) => r.opportunity).sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0));
  const topRisk = risks[0];
  const topOpp = opps[0];
  const riskHigh = risks.filter((r) => (r.risk_score ?? 0) >= 4).length;
  const oppHigh = opps.filter((r) => (r.opportunity_score ?? 0) >= 4).length;
  const inProgress = (acts ?? []).filter((a) => a.status === "in_progress").length;
  const trActions = topRisk?.ev?.id ? (acts ?? []).filter((a) => a.event_id === topRisk.ev!.id) : [];

  const byNation = new Map<string, number>();
  (scored ?? []).forEach((e) => { if (e.country_code) byNation.set(e.country_code, (byNation.get(e.country_code) ?? 0) + Number(e.attributes?.influence ?? 0)); });
  const grand = [...byNation.values()].reduce((s, n) => s + n, 0) || 1;
  const us = Math.round(((byNation.get("US") ?? 0) / grand) * 100);
  const cn = Math.round(((byNation.get("CN") ?? 0) / grand) * 100);

  return (
    <section className="bezel">
      <div className="core p-6 md:p-8">
        <div className="flex items-center gap-2.5 mb-5 flex-wrap">
          <span className="eyebrow">Fokus Hari Ini · Kokpit Eksekutif</span>
          <span className="ml-auto text-[11px] font-mono text-[var(--muted)]">AS {us}% vs China {cn}% pengaruh global</span>
        </div>

        {/* live counts */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Kpi href="/posture" icon="shield-alert" tone="txt-risk" value={riskHigh} label="Risiko tinggi" />
          <Kpi href="/posture" icon="sparkles" tone="txt-opportunity" value={oppHigh} label="Peluang tinggi" />
          <Kpi href="/posture" icon="settings-2" tone="txt-progress" value={inProgress} label="Aksi berjalan" />
        </div>

        {/* the two answers */}
        <div className="grid gap-4 lg:grid-cols-2">
          {topRisk && (
            <div className="rounded-2xl border p-5" style={{ borderColor: "color-mix(in srgb, var(--risk) 25%, transparent)", background: "color-mix(in srgb, var(--risk) 4%, transparent)" }}>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest txt-risk mb-2">
                <Icon name="alert-triangle" size={13} /> Risiko paling mendesak
              </div>
              {topRisk.ev ? (
                <Link href={`/events/${topRisk.ev.id}`} className="text-sm font-semibold leading-snug hover:text-accent transition-colors line-clamp-2">{topRisk.ev.title}</Link>
              ) : <span className="text-sm font-semibold">{topRisk.risk}</span>}
              <p className="text-[13px] text-[var(--muted)] mt-1.5 leading-relaxed line-clamp-2">{topRisk.risk}</p>
              {topRisk.recommendation && (
                <p className="text-[12px] mt-2 flex gap-1.5"><Icon name="arrow-right" size={12} className="mt-0.5 shrink-0 text-amber-500" /><span><span className="text-[var(--muted)]">Rekomendasi:</span> {topRisk.recommendation}</span></p>
              )}
              {trActions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {trActions.slice(0, 2).map((a, i) => (
                    <span key={i} className="text-[10px] font-mono">
                      <span className={statusTxt(a.status)}>{statusLabel(a.status)}</span>
                      {a.owner && <span className="text-[var(--muted)]"> · {a.owner}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {topOpp && (
            <div className="rounded-2xl border p-5" style={{ borderColor: "color-mix(in srgb, var(--opportunity) 25%, transparent)", background: "color-mix(in srgb, var(--opportunity) 4%, transparent)" }}>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest txt-opportunity mb-2">
                <Icon name="sparkles" size={13} /> Peluang teratas
              </div>
              {topOpp.ev ? (
                <Link href={`/events/${topOpp.ev.id}`} className="text-sm font-semibold leading-snug hover:text-accent transition-colors line-clamp-2">{topOpp.ev.title}</Link>
              ) : <span className="text-sm font-semibold">{topOpp.opportunity}</span>}
              <p className="text-[13px] text-[var(--muted)] mt-1.5 leading-relaxed line-clamp-3">{topOpp.opportunity}</p>
              <Link href="/posture" className="text-[12px] text-accent hover:underline mt-2 inline-flex items-center gap-1">
                Lihat register lengkap <Icon name="arrow-right" size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Kpi({ href, icon, tone, value, label }: { href: string; icon: string; tone: string; value: number; label: string }) {
  return (
    <Link href={href} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 flex items-center gap-3 hover:border-emerald-500/40 transition-colors">
      <span className="h-9 w-9 shrink-0 rounded-lg bg-[var(--surface-2)] grid place-items-center"><Icon name={icon} size={16} className={tone} /></span>
      <div className="min-w-0">
        <div className={`display text-2xl font-semibold tabular-nums leading-none ${tone}`}>{value}</div>
        <div className="text-[11px] text-[var(--muted)] mt-1 truncate">{label}</div>
      </div>
    </Link>
  );
}
