import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";

export const revalidate = 0;

export default async function DomainsPage() {
  const [{ data: domains }, { data: ents }, { data: evs }] = await Promise.all([
    supabase.from("domains").select("id,code,name,description,icon").order("sort_order"),
    supabase.from("entities").select("domain_id"),
    supabase.from("events").select("domain_id"),
  ]);

  const tally = (rows: { domain_id: string | null }[] | null) => {
    const m = new Map<string, number>();
    (rows ?? []).forEach((r) => {
      if (r.domain_id) m.set(r.domain_id, (m.get(r.domain_id) ?? 0) + 1);
    });
    return m;
  };
  const entCount = tally(ents);
  const evCount = tally(evs);

  return (
    <div>
      <PageHeader
        layer="Layer 1 · Strategic Domain"
        icon="globe"
        title="Strategic Domains"
        subtitle="Klasifikasi paling atas — lensa pengamatan dunia. Relatif stabil dan jarang berubah. Setiap entitas & peristiwa dipetakan ke sebuah domain."
      />
      <div className="p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(domains ?? []).map((d) => (
            <div key={d.id} className="card p-5 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-accent">
                  <Icon name={d.icon} size={20} />
                </div>
                <div className="font-medium">{d.name}</div>
              </div>
              {d.description && (
                <p className="text-sm text-[var(--muted)] mt-3 line-clamp-2">{d.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-xs font-mono text-[var(--muted)]">
                <span className="inline-flex items-center gap-1">
                  <Icon name="share-2" size={13} /> {entCount.get(d.id) ?? 0} entities
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="radar" size={13} /> {evCount.get(d.id) ?? 0} events
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
