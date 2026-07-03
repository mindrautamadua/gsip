import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { TaxonomyExplorer, type TaxNode } from "@/components/TaxonomyExplorer";

export const revalidate = 0;

export default async function TaxonomyPage() {
  const [{ data: industries }, { data: sectors }, { data: subsectors }, { data: ents }] =
    await Promise.all([
      supabase.from("industries").select("id,code,name").order("sort_order"),
      supabase.from("sectors").select("id,code,name,industry_id").order("sort_order"),
      supabase.from("subsectors").select("id,code,name,sector_id").order("sort_order"),
      supabase.from("entities").select("subsector_id"),
    ]);

  const entCount = new Map<string, number>();
  (ents ?? []).forEach((e) => {
    if (e.subsector_id) entCount.set(e.subsector_id, (entCount.get(e.subsector_id) ?? 0) + 1);
  });

  const roots: TaxNode[] = (industries ?? []).map((i) => {
    const groups = (sectors ?? [])
      .filter((s) => s.industry_id === i.id)
      .map((s) => {
        const children = (subsectors ?? [])
          .filter((ss) => ss.sector_id === s.id)
          .map((ss) => ({ id: ss.id, code: ss.code, name: ss.name, count: entCount.get(ss.id) ?? 0, isLeaf: true }));
        return { id: s.id, code: s.code, name: s.name, count: children.reduce((a, c) => a + c.count, 0), children };
      });
    return { id: i.id, code: i.code, name: i.name, count: groups.reduce((a, g) => a + g.count, 0), children: groups };
  });

  return (
    <div>
      <PageHeader
        layer="Layer 2 · Strategic Entity — Classification"
        icon="network"
        title="GICS Taxonomy"
        subtitle="Global Industry Classification Standard (MSCI/S&P): 11 Sectors → 25 Industry Groups → 74 Industries. Fondasi klasifikasi untuk entitas Industry & Company di knowledge graph."
      />
      <div className="px-6 md:px-10 pb-24 max-w-6xl">
        <TaxonomyExplorer roots={roots} />
      </div>
    </div>
  );
}
