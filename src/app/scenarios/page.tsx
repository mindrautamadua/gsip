import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ScenarioEngine, type Lever } from "@/components/scenarios/ScenarioEngine";

export const revalidate = 0;
export const metadata = { title: "Value at Stake · GSIP" };

type Scenario = {
  id: string; slug: string; title: string; subtitle: string | null;
  horizon_year: number | null; unit: string | null;
  total_low: number | null; total_high: number | null;
  baseline_note: string | null; source: string | null;
};

export default async function ScenariosPage() {
  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("id,slug,title,subtitle,horizon_year,unit,total_low,total_high,baseline_note,source")
    .order("sort_order")
    .returns<Scenario[]>();

  const s = scenarios?.[0];
  const { data: leverRows } = s
    ? await supabase
        .from("scenario_levers")
        .select("id,name,description,value_low,value_high,more_engagement,less_engagement,transmission,note,icon,sort_order")
        .eq("scenario_id", s.id)
        .order("sort_order")
        .returns<Lever[]>()
    : { data: [] as Lever[] };

  const levers = leverRows ?? [];

  return (
    <div>
      <PageHeader
        layer="Foresight · Nilai Dipertaruhkan"
        icon="git-fork"
        title="Skenario & Nilai Dipertaruhkan"
        subtitle="Bukan hanya memprediksi apakah sesuatu terjadi, tetapi memodelkan berapa nilainya di tiap cabang masa depan. Mesin skenario kontingen-keputusan: putar tiap tuas antara lebih vs kurang terlibat dan lihat nilai tertangkap vs berisiko secara langsung."
      />

      <div className="px-6 md:px-10 pb-24 space-y-8 max-w-4xl">
        {!s ? (
          <p className="text-sm text-[var(--muted)]">Belum ada skenario.</p>
        ) : (
          <>
            {/* headline */}
            <section className="card p-6 md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <span className="eyebrow"><Icon name="target" size={11} /> Skenario · horizon {s.horizon_year}</span>
                  <h2 className="display text-2xl font-semibold tracking-tight mt-2">{s.title}</h2>
                  {s.subtitle && <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">{s.subtitle}</p>}
                </div>
                <div className="text-right shrink-0">
                  <div className="display text-4xl font-semibold tabular-nums text-accent">
                    ${Number(s.total_low)}–{Number(s.total_high)}T
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">total dipertaruhkan · {s.horizon_year}</div>
                </div>
              </div>
              {s.baseline_note && (
                <p className="text-[11px] text-[var(--muted)] mt-4 flex items-start gap-1.5 border-t border-[var(--hairline-soft)] pt-4">
                  <Icon name="info" size={12} className="mt-0.5 shrink-0" /> {s.baseline_note}
                </p>
              )}
            </section>

            {/* interactive engine */}
            <ScenarioEngine levers={levers} unit={s.unit ?? "$T"} />

            {/* provenance + link to ledger */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-mono text-[var(--muted)]/70">
              <span className="flex items-center gap-1.5"><Icon name="book-open" size={12} /> {s.source}</span>
              <a href="/predictions" className="flex items-center gap-1.5 text-accent hover:underline">
                <Icon name="target" size={12} /> Lihat prediksi titik di Prediction Ledger
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
