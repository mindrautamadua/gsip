import { supabase } from "@/lib/supabase";
import { PageHeader, Chip } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { getQuotes, formatPrice } from "@/lib/quotes";
import { EntityCardButton } from "@/components/entities/EntityCardButton";

export const revalidate = 0;

type Ent = {
  id: string;
  name: string;
  slug: string;
  country_code: string | null;
  description: string | null;
  attributes: { ticker?: string } | null;
  entity_types: { label: string; icon: string | null; category: string | null } | null;
  domains: { name: string } | null;
  subsectors: { name: string; code: string } | null;
};

export default async function EntitiesPage() {
  const [{ data: entities }, { data: edges }] = await Promise.all([
    supabase
      .from("entities")
      .select(
        "id,name,slug,country_code,description,attributes,entity_types(label,icon,category),domains(name),subsectors(name,code)"
      )
      .order("name")
      .returns<Ent[]>(),
    supabase.from("entity_edges").select("source_entity_id,target_entity_id"),
  ]);

  // live quotes for entities that carry a ticker (companies)
  const quotes = await getQuotes((entities ?? []).map((e) => e.attributes?.ticker));

  const degree = new Map<string, number>();
  (edges ?? []).forEach((e) => {
    degree.set(e.source_entity_id, (degree.get(e.source_entity_id) ?? 0) + 1);
    degree.set(e.target_entity_id, (degree.get(e.target_entity_id) ?? 0) + 1);
  });

  // group by entity type label
  const groups = new Map<string, { icon: string | null; items: Ent[] }>();
  (entities ?? []).forEach((e) => {
    const key = e.entity_types?.label ?? "Other";
    if (!groups.has(key)) groups.set(key, { icon: e.entity_types?.icon ?? null, items: [] });
    groups.get(key)!.items.push(e);
  });

  return (
    <div>
      <PageHeader
        layer="Layer 2 · Strategic Entity — Knowledge Graph"
        icon="share-2"
        title="Entities"
        subtitle={`Node knowledge graph. ${entities?.length ?? 0} entitas, ${edges?.length ?? 0} relasi. Entitas Company/Industry terhubung ke klasifikasi GICS.`}
      />
      <div className="p-8 space-y-8">
        {[...groups.entries()].map(([label, g]) => (
          <section key={label}>
            <h2 className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3 flex items-center gap-2">
              <Icon name={g.icon} size={14} /> {label}
              <span className="text-emerald-400/60">({g.items.length})</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((e) => (
                <EntityCardButton key={e.id} slug={e.slug} className="card p-4 w-full text-left block hover:border-emerald-500/40 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium leading-snug">{e.name}</div>
                    {degree.get(e.id) ? (
                      <span className="text-[11px] font-mono text-accent/80 shrink-0 inline-flex items-center gap-1">
                        <Icon name="git-fork" size={12} /> {degree.get(e.id)}
                      </span>
                    ) : null}
                  </div>
                  {e.description && (
                    <p className="text-xs text-[var(--muted)] mt-1.5 line-clamp-2">
                      {e.description}
                    </p>
                  )}
                  {(() => {
                    const t = e.attributes?.ticker;
                    const q = t ? quotes[t] : undefined;
                    if (!q) return null;
                    const up = (q.changePct ?? 0) >= 0;
                    return (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--hairline-soft)]">
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {formatPrice(q)}
                        </span>
                        {q.changePct != null && (
                          <span
                            className={`inline-flex items-center gap-0.5 text-xs font-mono ${
                              up ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            <Icon name={up ? "trending-up" : "trending-down"} size={12} />
                            {up ? "+" : ""}
                            {q.changePct.toFixed(2)}%
                          </span>
                        )}
                        <span className="ml-auto text-[10px] font-mono text-[var(--muted)]/70">
                          {t}
                        </span>
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {e.domains && <Chip>{e.domains.name}</Chip>}
                    {e.country_code && <Chip>{e.country_code}</Chip>}
                    {e.subsectors && <Chip>GICS {e.subsectors.code}</Chip>}
                  </div>
                </EntityCardButton>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
