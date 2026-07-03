import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ScoreBadge, Chip } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { GradingBadge } from "@/components/GradingBadge";

export const revalidate = 0;

type Analysis = {
  what: string | null; who: string | null; when_text: string | null;
  where_text: string | null; why: string | null; how: string | null;
  impact: string | null; risk: string | null; opportunity: string | null;
  scenario: string | null; prediction: string | null; recommendation: string | null;
  impact_score: number | null; risk_score: number | null;
  opportunity_score: number | null; confidence_score: number | null; analyst: string | null;
};

type EventDetail = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  event_date: string | null;
  importance: number | null;
  confidence: number | null;
  source_url: string | null;
  source_reliability: string | null;
  info_credibility: string | null;
  event_types: { label: string } | null;
  domains: { name: string; icon: string | null } | null;
  event_entities: { role: string; entities: { name: string; entity_types: { label: string; icon: string | null } | null } | null }[];
  event_analyses: Analysis | Analysis[] | null;
  actions: { id: string; title: string; owner: string | null; due_date: string | null; priority: number | null; status: string; action_types: { label: string } | null }[];
  predictions: { id: string; statement: string; probability: number; horizon_date: string | null; status: string; outcome: boolean | null; brier_score: number | null }[];
};

const ROLE_LABEL: Record<string, string> = {
  initiated_by: "Initiated by",
  impacts: "Impacts",
  involves: "Involves",
  occurs_in: "Occurs in",
  target_of: "Target of",
};

const STATUS_COLOR: Record<string, string> = {
  open: "text-accent",
  in_progress: "text-amber-600",
  done: "text-accent",
  cancelled: "text-[var(--muted)]",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: e } = await supabase
    .from("events")
    .select(
      `id,title,summary,description,event_date,importance,confidence,source_url,source_reliability,info_credibility,
       event_types(label),domains(name,icon),
       event_entities(role,entities(name,entity_types(label,icon))),
       event_analyses(what,who,when_text,where_text,why,how,impact,risk,opportunity,scenario,prediction,recommendation,impact_score,risk_score,opportunity_score,confidence_score,analyst),
       actions(id,title,owner,due_date,priority,status,action_types(label)),
       predictions(id,statement,probability,horizon_date,status,outcome,brier_score)`
    )
    .eq("id", id)
    .maybeSingle()
    .returns<EventDetail>();

  if (!e) notFound();
  const a = (Array.isArray(e.event_analyses) ? e.event_analyses[0] : e.event_analyses) ?? null;

  const w1h = a
    ? [
        { k: "What", v: a.what, icon: "help-circle" },
        { k: "Who", v: a.who, icon: "users" },
        { k: "When", v: a.when_text, icon: "calendar" },
        { k: "Where", v: a.where_text, icon: "map-pin" },
        { k: "Why", v: a.why, icon: "brain" },
        { k: "How", v: a.how, icon: "workflow" },
      ]
    : [];

  const analytic = a
    ? [
        { k: "Impact", v: a.impact, icon: "activity" },
        { k: "Risk", v: a.risk, icon: "alert-triangle" },
        { k: "Opportunity", v: a.opportunity, icon: "sparkles" },
        { k: "Scenario", v: a.scenario, icon: "git-branch" },
        { k: "Prediction", v: a.prediction, icon: "trending-up" },
        { k: "Recommendation", v: a.recommendation, icon: "lightbulb" },
      ].filter((x) => x.v)
    : [];

  return (
    <div>
      <header className="px-6 md:px-10 pt-10 md:pt-14 pb-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-accent transition-colors duration-200 mb-6"
        >
          <Icon name="arrow-left" size={15} /> Strategic Events
        </Link>
        <div className="flex items-center gap-2.5 mb-5 flex-wrap">
          {e.domains && (
            <span className="eyebrow">
              <Icon name={e.domains.icon} size={12} className="text-accent" /> {e.domains.name}
            </span>
          )}
          {e.event_types && <span className="eyebrow">{e.event_types.label}</span>}
          {e.event_date && <span className="eyebrow">{e.event_date}</span>}
        </div>
        <h1 className="display text-4xl md:text-5xl font-semibold tracking-tight max-w-4xl leading-[1.05]">
          {e.title}
        </h1>
        {e.summary && (
          <p className="text-[15px] md:text-base text-[var(--muted)] mt-5 max-w-3xl leading-relaxed">
            {e.summary}
          </p>
        )}
        <div className="flex items-center gap-2 mt-6 flex-wrap">
          <ScoreBadge label="Impact" score={a?.impact_score ?? null} />
          <ScoreBadge label="Risk" score={a?.risk_score ?? null} />
          <ScoreBadge label="Opportunity" score={a?.opportunity_score ?? null} />
          {e.importance != null && <Chip>Importance {e.importance}/5</Chip>}
          {a?.confidence_score != null && <Chip>Confidence {Math.round(a.confidence_score * 100)}%</Chip>}
          <GradingBadge reliability={e.source_reliability} credibility={e.info_credibility} showLegend />
        </div>
      </header>

      <div className="px-6 md:px-10 pb-24 space-y-10 max-w-5xl">
        {/* L4: 5W1H lens */}
        {w1h.length > 0 && (
          <section>
            <SectionTitle layer="Layer 4 · Analysis" title="5W1H Lens" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {w1h.map((x) => (
                <div key={x.k} className="card p-4">
                  <div className="flex items-center gap-2 text-accent text-sm font-medium">
                    <Icon name={x.icon} size={16} /> {x.k}
                  </div>
                  <p className="text-sm text-foreground/90 mt-2">{x.v ?? "—"}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* L4: analytic model */}
        {analytic.length > 0 && (
          <section>
            <SectionTitle layer="Layer 4 · Analysis" title="Analytic Model" />
            <div className="space-y-3">
              {analytic.map((x) => (
                <div key={x.k} className="card p-4 flex gap-3">
                  <div className="text-accent shrink-0 mt-0.5">
                    <Icon name={x.icon} size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{x.k}</div>
                    <p className="text-sm text-[var(--muted)] mt-0.5">{x.v}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Foresight: prediction ledger for this event */}
        {e.predictions?.length > 0 && (
          <section>
            <SectionTitle layer="Foresight · Calibration" title="Prediksi Terkait" />
            <div className="card divide-y divide-[var(--border)]">
              {e.predictions.map((p) => (
                <div key={p.id} className="p-4 flex items-center gap-4">
                  <div className="flex flex-col items-center shrink-0 w-14">
                    <span className="display text-lg font-semibold tabular-nums text-accent">
                      {Math.round(p.probability * 100)}%
                    </span>
                    <span className="text-[10px] font-mono uppercase text-[var(--muted)]">prob</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{p.statement}</p>
                    {p.horizon_date && (
                      <span className="text-[11px] font-mono text-[var(--muted)] inline-flex items-center gap-1 mt-1">
                        <Icon name="calendar-clock" size={11} /> horizon {p.horizon_date}
                      </span>
                    )}
                  </div>
                  {p.status === "resolved" ? (
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-mono ${
                        p.outcome
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                          : "bg-rose-500/10 text-rose-700 border-rose-500/25"
                      }`}
                    >
                      <Icon name={p.outcome ? "check" : "x"} size={12} />
                      {p.brier_score != null ? `Brier ${p.brier_score.toFixed(2)}` : p.outcome ? "Terbukti" : "Tidak"}
                    </span>
                  ) : (
                    <Link
                      href="/predictions"
                      className="shrink-0 text-[11px] font-mono text-[var(--muted)] hover:text-accent inline-flex items-center gap-1"
                    >
                      pending <Icon name="arrow-right" size={11} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* L2: involved entities */}
        {e.event_entities?.length > 0 && (
          <section>
            <SectionTitle layer="Layer 2 · Entities" title="Involved Entities" />
            <div className="flex flex-wrap gap-2">
              {e.event_entities.map((ee, i) => (
                <div key={i} className="card px-3 py-2 flex items-center gap-2">
                  <span className="text-accent">
                    <Icon name={ee.entities?.entity_types?.icon} size={15} />
                  </span>
                  <span className="text-sm">{ee.entities?.name}</span>
                  <span className="text-[11px] font-mono text-[var(--muted)] border-l border-[var(--border)] pl-2">
                    {ROLE_LABEL[ee.role] ?? ee.role}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* L5: actions */}
        {e.actions?.length > 0 && (
          <section>
            <SectionTitle layer="Layer 5 · Action" title="Strategic Actions" />
            <div className="card divide-y divide-[var(--border)]">
              {e.actions.map((ac) => (
                <div key={ac.id} className="p-4 flex items-center gap-3">
                  <span className="text-accent shrink-0">
                    <Icon name="target" size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{ac.title}</div>
                    <div className="text-xs text-[var(--muted)] mt-0.5 flex flex-wrap gap-x-3">
                      {ac.action_types && <span>{ac.action_types.label}</span>}
                      {ac.owner && <span>· {ac.owner}</span>}
                      {ac.due_date && <span>· due {ac.due_date}</span>}
                      {ac.priority != null && <span>· P{ac.priority}</span>}
                    </div>
                  </div>
                  <span className={`ml-auto text-xs font-mono shrink-0 ${STATUS_COLOR[ac.status] ?? ""}`}>
                    {ac.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {e.source_url && (
          <a
            href={e.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <Icon name="external-link" size={15} /> Source
          </a>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ layer, title }: { layer: string; title: string }) {
  return (
    <div className="mb-4">
      <span className="eyebrow">{layer}</span>
      <h2 className="display text-xl font-semibold tracking-tight mt-3">{title}</h2>
    </div>
  );
}
