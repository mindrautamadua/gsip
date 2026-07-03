import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PageHeader, ScoreBadge, Chip } from "@/components/ui";
import { Icon } from "@/components/Icon";

export const revalidate = 0;

type Ev = {
  id: string;
  title: string;
  summary: string | null;
  event_date: string | null;
  importance: number | null;
  confidence: number | null;
  event_types: { label: string } | null;
  domains: { name: string; icon: string | null } | null;
  event_analyses:
    | { risk_score: number | null; impact_score: number | null; opportunity_score: number | null }
    | { risk_score: number | null; impact_score: number | null; opportunity_score: number | null }[]
    | null;
};

function analysis<T>(x: T | T[] | null | undefined): T | null {
  return (Array.isArray(x) ? x[0] : x) ?? null;
}

export default async function EventsPage() {
  const { data: events } = await supabase
    .from("events")
    .select(
      "id,title,summary,event_date,importance,confidence,event_types(label),domains(name,icon),event_analyses(risk_score,impact_score,opportunity_score)"
    )
    .order("importance", { ascending: false })
    .returns<Ev[]>();

  return (
    <div>
      <PageHeader
        layer="Layer 3 · Strategic Event"
        icon="radar"
        title="Strategic Events"
        subtitle="Pusat gravitasi GSIP. Setiap peristiwa dianalisis dengan lensa 5W1H + Impact/Risk/Opportunity, lalu diterjemahkan menjadi tindakan (L5)."
      />
      <div className="p-8 grid gap-4 md:grid-cols-2">
        {(events ?? []).map((e) => {
          const a = analysis(e.event_analyses);
          return (
            <Link key={e.id} href={`/events/${e.id}`}>
              <div className="card p-5 h-full hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  {e.domains && (
                    <Chip>
                      <span className="inline-flex items-center gap-1">
                        <Icon name={e.domains.icon} size={12} /> {e.domains.name}
                      </span>
                    </Chip>
                  )}
                  {e.event_types && <Chip>{e.event_types.label}</Chip>}
                  {e.event_date && (
                    <span className="ml-auto text-xs font-mono text-[var(--muted)]">
                      {e.event_date}
                    </span>
                  )}
                </div>
                <div className="font-medium leading-snug">{e.title}</div>
                {e.summary && (
                  <p className="text-sm text-[var(--muted)] mt-1.5 line-clamp-2">{e.summary}</p>
                )}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <ScoreBadge label="Impact" score={a?.impact_score ?? null} />
                  <ScoreBadge label="Risk" score={a?.risk_score ?? null} />
                  <ScoreBadge label="Opp" score={a?.opportunity_score ?? null} />
                  {e.importance != null && (
                    <span className="ml-auto text-[11px] font-mono text-[var(--muted)]">
                      IMP {e.importance}/5 · CONF {Math.round((e.confidence ?? 0) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
