import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { GenerateBrief } from "@/components/brief/GenerateBrief";
import type { BriefSections } from "@/lib/brief/generate";

export const revalidate = 0;
export const metadata = { title: "Intelligence Brief · GSIP" };

type BriefRow = {
  id: string;
  period: "daily" | "weekly";
  period_start: string | null;
  period_end: string | null;
  title: string;
  executive_summary: string;
  sections: BriefSections;
  event_count: number;
  created_by: string | null;
  created_at: string;
};

const DIRECTION: Record<string, { icon: string; cls: string }> = {
  naik: { icon: "trending-up", cls: "text-emerald-600" },
  turun: { icon: "trending-down", cls: "text-rose-600" },
  stabil: { icon: "minus", cls: "text-[var(--muted)]" },
};

export default async function BriefPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/brief");
  const canGenerate = user.role === "analyst" || user.role === "admin";

  const supabase = await createClient();
  const { data } = await supabase
    .from("briefs")
    .select("id,period,period_start,period_end,title,executive_summary,sections,event_count,created_by,created_at")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<BriefRow[]>();

  const briefs = data ?? [];
  const [latest, ...older] = briefs;

  return (
    <div>
      <PageHeader
        layer="Executive · Dissemination"
        icon="newspaper"
        title="Intelligence Brief"
        subtitle="Ringkasan eksekutif yang disintesis otomatis dari seluruh intelijen terbaru — top signals, pergeseran domain, dan rekomendasi agregat untuk pengambil keputusan."
      />

      <div className="p-8 space-y-8">
        {canGenerate ? (
          <GenerateBrief />
        ) : (
          <div className="card p-4 flex items-center gap-3 text-sm text-[var(--muted)]">
            <Icon name="info" size={16} className="text-emerald-600 shrink-0" />
            Anda dapat membaca brief. Pembuatan brief baru memerlukan role analyst/admin.
          </div>
        )}

        {briefs.length === 0 ? (
          <div className="card p-10 text-center">
            <Icon name="newspaper" size={28} className="mx-auto mb-3 text-[var(--muted)]/50" />
            <p className="text-sm text-[var(--muted)]">
              Belum ada brief. {canGenerate ? "Klik “Buat Brief Mingguan” untuk menyintesis yang pertama." : ""}
            </p>
          </div>
        ) : (
          <>
            {latest && (
              <Reveal>
                <BriefCard b={latest} featured />
              </Reveal>
            )}
            {older.length > 0 && (
              <section>
                <h2 className="text-sm font-mono uppercase tracking-[0.18em] text-[var(--muted)] mb-3">Arsip Brief</h2>
                <div className="grid gap-3">
                  {older.map((b) => (
                    <details key={b.id} className="card p-5 group">
                      <summary className="flex items-center gap-3 cursor-pointer list-none">
                        <Icon name="chevron-right" size={16} className="text-[var(--muted)] transition-transform group-open:rotate-90" />
                        <span className="text-sm font-medium flex-1 min-w-0 truncate">{b.title}</span>
                        <span className="text-[11px] font-mono text-[var(--muted)] shrink-0">
                          {b.period === "weekly" ? "Mingguan" : "Harian"} · {b.period_end}
                        </span>
                      </summary>
                      <div className="mt-4 pl-7">
                        <BriefBody b={b} />
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BriefCard({ b, featured = false }: { b: BriefRow; featured?: boolean }) {
  return (
    <div className={`card p-7 md:p-8 ${featured ? "border-emerald-500/25" : ""}`}>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="eyebrow">
          <Icon name="sparkles" size={12} className="text-emerald-600" />
          {b.period === "weekly" ? "Brief Mingguan" : "Brief Harian"}
        </span>
        <span className="text-[11px] font-mono text-[var(--muted)]">
          {b.period_start} → {b.period_end} · {b.event_count} event
        </span>
        {b.created_by && <span className="text-[11px] font-mono text-[var(--muted)]/70">· {b.created_by}</span>}
      </div>
      <h2 className="display text-2xl md:text-3xl font-semibold tracking-tight leading-snug">{b.title}</h2>
      <p className="text-[15px] text-foreground/90 mt-4 leading-relaxed">{b.executive_summary}</p>
      <div className="mt-6">
        <BriefBody b={b} />
      </div>
    </div>
  );
}

function BriefBody({ b }: { b: BriefRow }) {
  const s = b.sections ?? { top_signals: [], domain_shifts: [], recommendations: [], outlook: "" };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {s.top_signals?.length > 0 && (
        <div>
          <SectionLabel icon="crosshair">Top Signals</SectionLabel>
          <ul className="mt-3 space-y-2.5">
            {s.top_signals.map((sig, i) => (
              <li key={i} className="text-sm">
                {sig.event_id ? (
                  <Link href={`/events/${sig.event_id}`} className="font-medium hover:text-emerald-700">
                    {sig.title}
                  </Link>
                ) : (
                  <span className="font-medium">{sig.title}</span>
                )}
                <span className="text-[var(--muted)]"> — {sig.so_what}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.domain_shifts?.length > 0 && (
        <div>
          <SectionLabel icon="activity">Pergeseran Domain</SectionLabel>
          <ul className="mt-3 space-y-2.5">
            {s.domain_shifts.map((d, i) => {
              const dir = DIRECTION[d.direction] ?? DIRECTION.stabil;
              return (
                <li key={i} className="text-sm flex items-start gap-2">
                  <Icon name={dir.icon} size={15} className={`${dir.cls} shrink-0 mt-0.5`} />
                  <span>
                    <span className="font-medium">{d.domain}</span>
                    <span className="text-[var(--muted)]"> — {d.note}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {s.recommendations?.length > 0 && (
        <div className="lg:col-span-2">
          <SectionLabel icon="lightbulb">Rekomendasi</SectionLabel>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {s.recommendations.map((r, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="h-5 w-5 shrink-0 rounded-full bg-amber-500/15 text-amber-700 grid place-items-center text-[11px] font-mono font-semibold">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.outlook && (
        <div className="lg:col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 flex gap-3">
          <Icon name="telescope" size={17} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            <span className="font-semibold text-emerald-700">Outlook · </span>
            {s.outlook}
          </p>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">
      <Icon name={icon} size={13} className="text-emerald-600" /> {children}
    </div>
  );
}
