import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { GraphView, type GNode, type GLink } from "@/components/GraphView";
import { getQuotes, formatPrice } from "@/lib/quotes";

export const revalidate = 0;

type EntRow = {
  id: string;
  name: string;
  slug: string;
  attributes: { ticker?: string } | null;
  entity_types: { label: string; category: string | null; icon: string | null } | null;
  domains: { name: string } | null;
  subsectors: { code: string } | null;
};
type EdgeRow = {
  source_entity_id: string;
  target_entity_id: string;
  relationship_types: { label: string } | null;
};

export default async function GraphPage() {
  const [{ data: ents }, { data: edges }] = await Promise.all([
    supabase
      .from("entities")
      .select("id,name,slug,attributes,entity_types(label,category,icon),domains(name),subsectors(code)")
      .returns<EntRow[]>(),
    supabase
      .from("entity_edges")
      .select("source_entity_id,target_entity_id,relationship_types(label)")
      .returns<EdgeRow[]>(),
  ]);

  // live quotes for entities that carry a ticker
  const quotes = await getQuotes((ents ?? []).map((e) => e.attributes?.ticker));

  const nodes: GNode[] = (ents ?? []).map((e) => {
    const t = e.attributes?.ticker;
    const q = t ? quotes[t] : undefined;
    return {
      id: e.id,
      name: e.name,
      type: e.entity_types?.label ?? "Entity",
      category: e.entity_types?.category ?? null,
      icon: e.entity_types?.icon ?? null,
      domain: e.domains?.name ?? null,
      gics: e.subsectors?.code ? `GICS ${e.subsectors.code}` : null,
      slug: e.slug,
      ticker: t ?? null,
      priceLabel: q ? formatPrice(q) : null,
      changePct: q?.changePct ?? null,
    };
  });

  const ids = new Set(nodes.map((n) => n.id));
  const links: GLink[] = (edges ?? [])
    .filter((e) => ids.has(e.source_entity_id) && ids.has(e.target_entity_id))
    .map((e) => ({
      source: e.source_entity_id,
      target: e.target_entity_id,
      label: e.relationship_types?.label ?? "related",
    }));

  return (
    <div>
      <PageHeader
        layer="Layer 2 · Strategic Entity — Knowledge Graph"
        icon="waypoints"
        title="Knowledge Graph"
        subtitle={`${nodes.length} entitas · ${links.length} relasi. Tarik node untuk mengatur, scroll untuk zoom, klik untuk fokus & lihat tetangga. Warna = kategori entitas.`}
      />
      <div className="p-8">
        {nodes.length === 0 ? (
          <div className="card p-10 text-center text-[var(--muted)]">Belum ada entitas.</div>
        ) : (
          <GraphView nodes={nodes} links={links} />
        )}
      </div>
    </div>
  );
}
