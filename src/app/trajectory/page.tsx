import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { TrajectoryBoard, type Series } from "@/components/trajectory/TrajectoryBoard";

export const revalidate = 0;
export const metadata = { title: "Trajectory · GSIP" };

export default async function TrajectoryPage() {
  const { data } = await supabase
    .from("strategic_series")
    .select("slug,label,category,unit,note,source,points")
    .order("sort_order")
    .returns<Series[]>();

  const series = (data ?? []).filter((s) => Array.isArray(s.points) && s.points.length >= 2);

  return (
    <div>
      <PageHeader
        layer="Foresight · Trajectory"
        icon="activity"
        title="Trajektori Strategis"
        subtitle="Posisi hari ini hanya separuh cerita — nyawa intelijen strategis adalah arah gerak. Papan ini mengangkat momentum (laju & arah perubahan) sebagai sinyal utama, bukan sekadar level."
      />

      <div className="px-6 md:px-10 pb-24 space-y-8 max-w-6xl">
        {series.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada deret waktu.</p>
        ) : (
          <TrajectoryBoard series={series} />
        )}
        <p className="text-[11px] font-mono text-[var(--muted)]/70">
          Deret longitudinal dikurasi dari MGI &ldquo;China and the World&rdquo; (2019) dan sumber terkait. Badge ×N = faktor pertumbuhan titik-awal→akhir; klik untuk deret penuh + CAGR.
        </p>
      </div>
    </div>
  );
}
