import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PageHeader, StatCard, ScoreBadge, Chip, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";

export const revalidate = 0;

async function count(table: string) {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

type RecentEvent = {
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

export default async function Dashboard() {
  const [domains, sectors, industryGroups, industries, entities, edges, events, actions] =
    await Promise.all([
      count("domains"),
      count("industries"),
      count("sectors"),
      count("subsectors"),
      count("entities"),
      count("entity_edges"),
      count("events"),
      count("actions"),
    ]);

  const { data: recent } = await supabase
    .from("events")
    .select(
      "id,title,summary,event_date,importance,confidence,event_types(label),domains(name,icon),event_analyses(risk_score,impact_score,opportunity_score)"
    )
    .order("importance", { ascending: false })
    .limit(5)
    .returns<RecentEvent[]>();

  const list = recent ?? [];
  const featured = list[0];
  const rest = list.slice(1);

  const stats = [
    { label: "Strategic Domains", value: domains, icon: "globe", href: "/domains", hint: "L1 · lapisan pengamatan", tone: "emerald" as const },
    { label: "Entities · KG nodes", value: entities, icon: "share-2", href: "/graph", hint: `L2 · ${edges} relasi graph`, tone: "sky" as const },
    { label: "Strategic Events", value: events, icon: "radar", href: "/events", hint: "L3 · pusat intelligence", tone: "amber" as const },
    { label: "Actions", value: actions, icon: "target", href: "/events", hint: "L5 · tindak lanjut", tone: "rose" as const },
  ];

  return (
    <div>
      <PageHeader
        icon="satellite"
        layer="Strategic Intelligence OS"
        title="Radar dunia, dalam lima lapisan."
        subtitle="Setiap peristiwa mengalir melalui Domain → Entity → Event → Analysis → Action — dari sinyal mentah menjadi keputusan yang dapat dieksekusi."
      />

      <div className="px-6 md:px-10 pb-24 space-y-4">
        {/* ===== stat bento row ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <StatCard {...s} />
            </Reveal>
          ))}
        </div>

        {/* ===== taxonomy pipeline + graph teaser ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Reveal delay={80} className="lg:col-span-8">
            <div className="bezel h-full">
              <div className="core h-full p-7 md:p-9">
                <span className="eyebrow mb-6">GICS · world-class standard</span>
                <div className="flex items-center gap-3 md:gap-6 flex-wrap mt-2">
                  <TaxStat n={domains} label="Domains" />
                  <Flow />
                  <TaxStat n={sectors} label="Sectors" />
                  <Flow />
                  <TaxStat n={industryGroups} label="Industry Groups" />
                  <Flow />
                  <TaxStat n={industries} label="Industries" />
                </div>
                <p className="text-sm text-[var(--muted)] mt-7 max-w-xl leading-relaxed">
                  Klasifikasi MSCI/S&amp;P sebagai fondasi Layer 2 — setiap entitas Company &amp; Industry
                  tertaut ke pohon GICS resmi.
                </p>
                <div className="mt-7">
                  <Button href="/taxonomy" icon="arrow-right">Browse taxonomy</Button>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={160} className="lg:col-span-4">
            <Link href="/graph" className="block h-full active:scale-[0.99] transition-transform duration-300">
              <div className="bezel h-full group">
                <div className="core h-full p-7 flex flex-col justify-between overflow-hidden relative">
                  <div
                    aria-hidden
                    className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-125"
                  />
                  <div className="relative">
                    <span className="h-11 w-11 rounded-2xl bg-[var(--surface)] border border-[var(--border)] grid place-items-center text-accent">
                      <Icon name="waypoints" size={22} />
                    </span>
                    <div className="display text-2xl font-semibold mt-5 tracking-tight">Knowledge Graph</div>
                    <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                      {entities} node · {edges} relasi berarah, terhubung lintas domain.
                    </p>
                  </div>
                  <div className="relative mt-6 inline-flex items-center gap-1.5 text-sm text-accent">
                    Explore graph
                    <Icon name="arrow-right" size={16} className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          </Reveal>
        </div>

        {/* ===== priority events bento ===== */}
        <div className="pt-4">
          <span className="eyebrow">Priority Events</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {featured && (
            <Reveal delay={60} className="lg:col-span-7">
              <EventCard e={featured} featured />
            </Reveal>
          )}
          <div className="lg:col-span-5 grid grid-cols-1 gap-4">
            {rest.slice(0, 2).map((e, i) => (
              <Reveal key={e.id} delay={120 + i * 80}>
                <EventCard e={e} />
              </Reveal>
            ))}
          </div>
          {rest.slice(2).map((e, i) => (
            <Reveal key={e.id} delay={80 + i * 80} className="lg:col-span-6">
              <EventCard e={e} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventCard({ e, featured = false }: { e: RecentEvent; featured?: boolean }) {
  const a = analysis(e.event_analyses);
  return (
    <Link href={`/events/${e.id}`} className="block h-full active:scale-[0.99] transition-transform duration-300">
      <div className="card h-full p-6 hover:-translate-y-0.5 hover:border-[var(--accent)]">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {e.domains && (
            <Chip>
              <span className="inline-flex items-center gap-1">
                <Icon name={e.domains.icon} size={12} /> {e.domains.name}
              </span>
            </Chip>
          )}
          {e.event_types && <Chip>{e.event_types.label}</Chip>}
          {e.importance != null && (
            <span className="ml-auto text-[11px] font-mono text-[var(--muted)]">IMP {e.importance}/5</span>
          )}
        </div>
        <div className={`font-medium leading-snug ${featured ? "display text-2xl tracking-tight" : ""}`}>
          {e.title}
        </div>
        {e.summary && (
          <p className={`text-sm text-[var(--muted)] mt-2 leading-relaxed ${featured ? "line-clamp-3" : "line-clamp-2"}`}>
            {e.summary}
          </p>
        )}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <ScoreBadge label="Impact" score={a?.impact_score ?? null} />
          <ScoreBadge label="Risk" score={a?.risk_score ?? null} />
          <ScoreBadge label="Opp" score={a?.opportunity_score ?? null} />
          {e.event_date && (
            <span className="ml-auto text-xs text-[var(--muted)] font-mono">{e.event_date}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function TaxStat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="display text-3xl md:text-4xl font-semibold tabular-nums tracking-tight">{n}</div>
      <div className="text-xs text-[var(--muted)] mt-1">{label}</div>
    </div>
  );
}

function Flow() {
  return <Icon name="chevron-right" size={18} className="text-[var(--muted)]/50 shrink-0" />;
}
