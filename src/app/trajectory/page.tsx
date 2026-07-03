import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TrajectoryBoard, type Series } from "@/components/trajectory/TrajectoryBoard";

export const revalidate = 0;
export const metadata = { title: "Trajectory · GSIP" };

type Snap = { metric_slug: string; label: string; unit: string | null; value: number | null; captured_at: string };

export default async function TrajectoryPage() {
  const [{ data }, { data: snaps }] = await Promise.all([
    supabase
      .from("strategic_series")
      .select("slug,label,category,unit,note,source,points")
      .order("sort_order")
      .returns<Series[]>(),
    supabase
      .from("gsip_metric_snapshots")
      .select("metric_slug,label,unit,value,captured_at")
      .order("captured_at", { ascending: false })
      .returns<Snap[]>(),
  ]);

  const series = (data ?? []).filter((s) => Array.isArray(s.points) && s.points.length >= 2);

  // latest value per metric + capture count (trajectories accrue as captures grow)
  const latest = new Map<string, Snap>();
  const captureDates = new Set<string>();
  for (const s of snaps ?? []) {
    captureDates.add(s.captured_at.slice(0, 10));
    if (!latest.has(s.metric_slug)) latest.set(s.metric_slug, s);
  }
  const liveMetrics = [...latest.values()];
  const lastCapture = liveMetrics[0]?.captured_at.slice(0, 10);
  const captureCount = captureDates.size;

  return (
    <div>
      <PageHeader
        layer="Foresight · Trajektori"
        icon="activity"
        title="Trajektori Strategis"
        subtitle="Posisi hari ini hanya separuh cerita — nyawa intelijen strategis adalah arah gerak. Papan ini mengangkat momentum (laju & arah perubahan) sebagai sinyal utama, bukan sekadar level."
      />

      <div className="px-6 md:px-10 pb-24 space-y-8 max-w-6xl">
        {/* GSIP live snapshot — self-updating internal metrics */}
        {liveMetrics.length > 0 && (
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-700">
                <Icon name="radio" size={14} /> Snapshot GSIP — metrik internal, hidup dari data
              </div>
              <span className="text-[11px] font-mono text-[var(--muted)]">
                {captureCount} snapshot · terakhir {lastCapture}
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-1.5 max-w-2xl">
              Metrik platform direkam bertimestamp lewat <code>capture_gsip_snapshot()</code>. Trajektori terbentuk otomatis seiring snapshot menumpuk — mengubah lensa dari kurasi statis menjadi hidup dari pipeline GSIP.
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {liveMetrics.map((m) => (
                <div key={m.metric_slug} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                  <div className="display text-xl font-semibold tabular-nums">{m.value ?? "—"}<span className="text-[11px] text-[var(--muted)] ml-0.5">{m.unit}</span></div>
                  <div className="text-[11px] text-[var(--muted)] leading-snug mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {series.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada deret waktu.</p>
        ) : (
          <TrajectoryBoard series={series} />
        )}
        <p className="text-[11px] font-mono text-[var(--muted)]/70">
          Deret kategori lain dikurasi dari MGI &ldquo;China and the World&rdquo; (2019); kategori &ldquo;GSIP Internal&rdquo; dihitung dari data GSIP sendiri. Badge ×N = faktor pertumbuhan titik-awal→akhir; klik untuk deret penuh + CAGR.
        </p>
      </div>
    </div>
  );
}
