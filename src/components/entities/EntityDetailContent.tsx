import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Chip } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PriceChartCard } from "@/components/PriceChartCard";
import { getQuotes, getHistory, formatPrice, type Quote } from "@/lib/quotes";

type Ent = {
  id: string;
  name: string;
  slug: string;
  country_code: string | null;
  description: string | null;
  attributes: { ticker?: string; hq?: string } | null;
  entity_types: { label: string; icon: string | null } | null;
  domains: { name: string; icon: string | null } | null;
  subsectors: {
    name: string;
    code: string;
    sectors: { name: string; code: string; industries: { name: string; code: string } | null } | null;
  } | null;
};

const ROLE_LABEL: Record<string, string> = {
  initiated_by: "Initiated by",
  impacts: "Impacts",
  involves: "Involves",
  occurs_in: "Occurs in",
  target_of: "Target of",
};

// Shared entity detail — rendered both as the full `/entities/[slug]` page and
// inside the intercepting-route modal (variant="modal").
export async function EntityDetailContent({
  slug,
  variant = "page",
}: {
  slug: string;
  variant?: "page" | "modal";
}) {
  const { data: e } = await supabase
    .from("entities")
    .select(
      `id,name,slug,country_code,description,attributes,
       entity_types(label,icon),domains(name,icon),
       subsectors(name,code,sectors(name,code,industries(name,code)))`
    )
    .eq("slug", slug)
    .maybeSingle()
    .returns<Ent>();

  if (!e) notFound();

  const ticker = e.attributes?.ticker;
  const [{ data: rawEdges }, { data: evLinks }, quoteMap, history] = await Promise.all([
    supabase
      .from("entity_edges")
      .select("source_entity_id,target_entity_id,relationship_types(label)")
      .or(`source_entity_id.eq.${e.id},target_entity_id.eq.${e.id}`),
    supabase
      .from("event_entities")
      .select("role,events(id,title,event_date,event_types(label),domains(name,icon))")
      .eq("entity_id", e.id),
    ticker ? getQuotes([ticker]) : Promise.resolve({} as Record<string, Quote>),
    ticker ? getHistory(ticker) : Promise.resolve([]),
  ]);

  const q = ticker ? quoteMap[ticker] : undefined;

  type Edge = { source_entity_id: string; target_entity_id: string; relationship_types: { label: string } | null };
  const edges = (rawEdges ?? []) as unknown as Edge[];
  const otherIds = [
    ...new Set(edges.flatMap((x) => [x.source_entity_id, x.target_entity_id]).filter((id) => id !== e.id)),
  ];
  const { data: others } = otherIds.length
    ? await supabase
        .from("entities")
        .select("id,name,slug,entity_types(icon)")
        .in("id", otherIds)
        .returns<{ id: string; name: string; slug: string; entity_types: { icon: string | null } | null }[]>()
    : { data: [] as { id: string; name: string; slug: string; entity_types: { icon: string | null } | null }[] };
  const otherMap = new Map((others ?? []).map((o) => [o.id, o]));

  const neighbors = edges.map((x) => {
    const outgoing = x.source_entity_id === e.id;
    const other = otherMap.get(outgoing ? x.target_entity_id : x.source_entity_id);
    return { rel: x.relationship_types?.label ?? "related", outgoing, other };
  });

  type EvLink = {
    role: string;
    events: { id: string; title: string; event_date: string | null; event_types: { label: string } | null; domains: { name: string; icon: string | null } | null } | null;
  };
  const events = ((evLinks ?? []) as unknown as EvLink[]).filter((x) => x.events);

  const gics = e.subsectors;
  const sector = gics?.sectors?.industries;
  const group = gics?.sectors;
  const up = (q?.changePct ?? 0) >= 0;
  const modal = variant === "modal";

  const sections = (
    <>
      {ticker && (
        <section className="card p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-1">Market · {ticker}</div>
              {q ? (
                <div className="flex items-baseline gap-3">
                  <span className="display text-3xl font-semibold tabular-nums">{formatPrice(q)}</span>
                  {q.changePct != null && (
                    <span className={`inline-flex items-center gap-1 text-sm font-mono ${up ? "text-emerald-500" : "text-rose-500"}`}>
                      <Icon name={up ? "trending-up" : "trending-down"} size={15} />
                      {up ? "+" : ""}
                      {q.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-[var(--muted)]">Kutipan tidak tersedia.</span>
              )}
            </div>
            <span className="text-[11px] font-mono text-[var(--muted)]/70">6M · delayed · {q?.source ?? "—"}</span>
          </div>
          <div className="mt-5">
            <PriceChartCard ticker={ticker} initial={history} initialRange="6mo" />
          </div>
        </section>
      )}

      <section className="card p-6">
        <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-4">Classification</div>
        <div className="grid sm:grid-cols-2 gap-y-3 gap-x-8 text-sm">
          <Row label="Domain" value={e.domains?.name} icon={e.domains?.icon} />
          <Row label="Country" value={e.country_code} />
          {e.attributes?.hq && <Row label="HQ" value={e.attributes.hq} />}
          {sector && <Row label="GICS Sector" value={`${sector.name} · ${sector.code}`} />}
          {group && <Row label="Industry Group" value={`${group.name} · ${group.code}`} />}
          {gics && <Row label="GICS Industry" value={`${gics.name} · ${gics.code}`} />}
        </div>
      </section>

      {neighbors.length > 0 && (
        <section className="card p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-4">
            Relationships ({neighbors.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {neighbors.map((nb, i) => (
              <Link
                key={i}
                href={nb.other ? `/entities/${nb.other.slug}` : "#"}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:border-emerald-500/40 transition-colors"
              >
                <span className="text-[11px] font-mono text-[var(--muted)]">
                  {nb.outgoing ? "" : "← "}
                  {nb.rel}
                  {nb.outgoing ? " →" : ""}
                </span>
                <span className="text-accent">
                  <Icon name={nb.other?.entity_types?.icon} size={13} />
                </span>
                {nb.other?.name ?? "?"}
              </Link>
            ))}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="card p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-4">
            Related Events ({events.length})
          </div>
          <div className="space-y-2">
            {events.map((x, i) => (
              <Link
                key={i}
                href={`/events/${x.events!.id}`}
                className="flex items-center gap-3 rounded-xl p-3 hover:bg-[var(--surface)] transition-colors"
              >
                <span className="text-accent shrink-0">
                  <Icon name={x.events!.domains?.icon ?? "radar"} size={16} />
                </span>
                <span className="text-sm flex-1 min-w-0 truncate">{x.events!.title}</span>
                <Chip>{ROLE_LABEL[x.role] ?? x.role}</Chip>
                {x.events!.event_date && (
                  <span className="text-xs font-mono text-[var(--muted)] shrink-0">{x.events!.event_date}</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );

  const chips = (
    <div className="flex items-center gap-2.5 flex-wrap">
      {e.entity_types && (
        <span className="eyebrow">
          <Icon name={e.entity_types.icon} size={12} className="text-accent" /> {e.entity_types.label}
        </span>
      )}
      {gics && <span className="eyebrow">GICS {gics.code}</span>}
      {e.country_code && <span className="eyebrow">{e.country_code}</span>}
    </div>
  );

  if (modal) {
    return (
      <div>
        <div className="px-6 md:px-8 pt-6 pb-5 border-b border-[var(--hairline-soft)]">
          <div className="mb-3">{chips}</div>
          <h1 className="display text-2xl md:text-3xl font-semibold tracking-tight leading-tight pr-10">{e.name}</h1>
          {e.description && (
            <p className="text-sm text-[var(--muted)] mt-2.5 leading-relaxed">{e.description}</p>
          )}
        </div>
        <div className="px-6 md:px-8 py-6 space-y-5">{sections}</div>
      </div>
    );
  }

  return (
    <div>
      <header className="px-6 md:px-10 pt-10 md:pt-14 pb-8">
        <Link
          href="/entities"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-accent transition-colors duration-200 mb-6"
        >
          <Icon name="arrow-left" size={15} /> Entities
        </Link>
        <div className="mb-5">{chips}</div>
        <h1 className="display text-4xl md:text-5xl font-semibold tracking-tight max-w-4xl leading-[1.05]">{e.name}</h1>
        {e.description && (
          <p className="text-[15px] md:text-base text-[var(--muted)] mt-5 max-w-3xl leading-relaxed">{e.description}</p>
        )}
      </header>
      <div className="px-6 md:px-10 pb-24 space-y-6 max-w-5xl">{sections}</div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value?: string | null; icon?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--muted)] w-32 shrink-0">{label}</span>
      {icon && (
        <span className="text-accent">
          <Icon name={icon} size={14} />
        </span>
      )}
      <span className="font-medium">{value}</span>
    </div>
  );
}
