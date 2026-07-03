import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { IngestRunner } from "@/components/IngestRunner";
import { FEEDS } from "@/lib/ingest/sources";

export const revalidate = 0;

export default async function IngestPage() {
  const { data: aiAnalyses } = await supabase
    .from("event_analyses")
    .select("event_id, created_at, events(id, title, importance, event_date)")
    .eq("analyst", "gsip-ai-pipeline")
    .order("created_at", { ascending: false })
    .limit(12);

  const recent = (aiAnalyses ?? [])
    .map((a) => (Array.isArray(a.events) ? a.events[0] : a.events))
    .filter(Boolean) as { id: string; title: string; importance: number | null; event_date: string | null }[];

  return (
    <div>
      <PageHeader
        layer="Pipeline · Collection"
        icon="rss"
        title="Intelligence Ingestion"
        subtitle="Memindai sumber berita, menyaring signifikansi strategis, lalu mengekstraksi entitas (L2), peristiwa (L3), dan analisis 5W1H (L4) secara otomatis via AI."
      />
      <div className="p-8 flex flex-col gap-8">
        <IngestRunner />

        <section>
          <h2 className="text-sm font-mono uppercase tracking-[0.18em] text-[var(--muted)] mb-3">
            Sumber Aktif
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEEDS.map((f) => (
              <div key={f.id} className="card p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-600 shrink-0">
                  <Icon name="rss" size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{f.label}</div>
                  <div className="text-[11px] font-mono text-[var(--muted)]">
                    Google News · maks {f.maxItems ?? 4} item/run
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-mono uppercase tracking-[0.18em] text-[var(--muted)] mb-3">
            Hasil Ingesti Terbaru
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Belum ada event hasil pipeline.</p>
          ) : (
            <div className="card divide-y divide-[var(--hairline-soft)]">
              {recent.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--surface)] transition-colors"
                >
                  <Icon name="radar" size={15} className="text-emerald-600 shrink-0" />
                  <span className="text-sm flex-1 min-w-0 truncate">{e.title}</span>
                  {e.event_date && (
                    <span className="text-[11px] font-mono text-[var(--muted)] shrink-0">{e.event_date}</span>
                  )}
                  {e.importance != null && (
                    <span className="text-[11px] font-mono text-amber-600 shrink-0">imp {e.importance}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
