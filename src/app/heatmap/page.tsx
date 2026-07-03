import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { HeatmapGrid, type HPoint } from "@/components/heatmap/HeatmapGrid";

export const revalidate = 0;
export const metadata = { title: "Risk & Opportunity Heatmap · GSIP" };

type ARow = {
  impact_score: number | null;
  risk_score: number | null;
  opportunity_score: number | null;
  events: { id: string; title: string } | { id: string; title: string }[] | null;
};

export default async function HeatmapPage() {
  const { data } = await supabase
    .from("event_analyses")
    .select("impact_score,risk_score,opportunity_score,events(id,title)")
    .returns<ARow[]>();

  const rows = (data ?? []).map((r) => ({
    ...r,
    ev: Array.isArray(r.events) ? r.events[0] : r.events,
  }));

  const riskPoints: HPoint[] = rows
    .filter((r) => r.ev && r.impact_score != null && r.risk_score != null)
    .map((r) => ({ id: r.ev!.id, title: r.ev!.title, x: r.impact_score!, y: r.risk_score! }));

  const oppPoints: HPoint[] = rows
    .filter((r) => r.ev && r.impact_score != null && r.opportunity_score != null)
    .map((r) => ({ id: r.ev!.id, title: r.ev!.title, x: r.impact_score!, y: r.opportunity_score! }));

  return (
    <div>
      <PageHeader
        layer="Layer 4 · Analysis"
        icon="grid-3x3"
        title="Risk & Opportunity Heatmap"
        subtitle="Distribusi peristiwa pada matriks Impact × severity. Sel makin pekat = makin banyak/berat; klik sel untuk melihat event di dalamnya. Kanan-atas = prioritas tertinggi."
      />
      <div className="px-6 md:px-10 pb-24 max-w-6xl grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-rose-600 mb-5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Risk Heatmap · Impact × Risk
          </div>
          {riskPoints.length ? (
            <HeatmapGrid points={riskPoints} mode="risk" yLabel="Risk" />
          ) : (
            <p className="text-sm text-[var(--muted)]">Belum ada data risiko.</p>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-600 mb-5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Opportunity Heatmap · Impact × Opportunity
          </div>
          {oppPoints.length ? (
            <HeatmapGrid points={oppPoints} mode="opportunity" yLabel="Opportunity" />
          ) : (
            <p className="text-sm text-[var(--muted)]">Belum ada data peluang.</p>
          )}
        </section>
      </div>
    </div>
  );
}
