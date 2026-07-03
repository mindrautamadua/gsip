import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { DomainGrid, type DomainCard } from "@/components/domains/DomainGrid";

export const revalidate = 0;

type EntRow = {
  id: string; name: string; slug: string; domain_id: string | null;
  entity_types: { label: string; icon: string | null } | { label: string; icon: string | null }[] | null;
};
type EvRow = { id: string; title: string; event_date: string | null; importance: number | null; domain_id: string | null };

const pick = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] : x) ?? null;

export default async function DomainsPage() {
  const [{ data: domains }, { data: ents }, { data: evs }] = await Promise.all([
    supabase.from("domains").select("id,code,name,description,icon").order("sort_order"),
    supabase
      .from("entities")
      .select("id,name,slug,domain_id,entity_types(label,icon)")
      .order("name")
      .returns<EntRow[]>(),
    supabase
      .from("events")
      .select("id,title,event_date,importance,domain_id")
      .order("event_date", { ascending: false, nullsFirst: false })
      .returns<EvRow[]>(),
  ]);

  const cards: DomainCard[] = (domains ?? []).map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    description: d.description,
    icon: d.icon,
    entities: (ents ?? [])
      .filter((e) => e.domain_id === d.id)
      .map((e) => ({ id: e.id, name: e.name, slug: e.slug, type: pick(e.entity_types)?.label ?? null, icon: pick(e.entity_types)?.icon ?? null })),
    events: (evs ?? [])
      .filter((ev) => ev.domain_id === d.id)
      .map((ev) => ({ id: ev.id, title: ev.title, date: ev.event_date, importance: ev.importance })),
  }));

  return (
    <div>
      <PageHeader
        layer="Layer 1 · Domain Strategis"
        icon="globe"
        title="Domain Strategis"
        subtitle="Klasifikasi paling atas — lensa pengamatan dunia. Relatif stabil dan jarang berubah. Setiap entitas & peristiwa dipetakan ke sebuah domain. Klik kartu untuk detail."
      />
      <div className="p-8">
        <DomainGrid domains={cards} />
      </div>
    </div>
  );
}
