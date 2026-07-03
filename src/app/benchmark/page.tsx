import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { BenchmarkTabs } from "@/components/benchmark/BenchmarkTabs";
import { BenchmarkExplorer, type BRow, type BSector } from "@/components/benchmark/BenchmarkExplorer";

export const revalidate = 0;
export const metadata = { title: "Competitive Landscape · GSIP" };

type Row = {
  name: string;
  slug: string;
  country_code: string | null;
  attributes: { market_cap?: number; influence?: number; fg500_rank?: number; domain?: string } | null;
  subsectors: { code: string; name: string } | null;
};

export default async function BenchmarkPage() {
  const { data } = await supabase
    .from("entities")
    .select("name,slug,country_code,attributes,subsectors!inner(code,name),entity_types!inner(code)")
    .eq("entity_types.code", "company")
    .returns<Row[]>();

  const rows: BRow[] = (data ?? [])
    .filter((e) => e.subsectors)
    .map((e) => ({
      slug: e.slug,
      name: e.name,
      cc: e.country_code,
      domain: e.attributes?.domain ?? null,
      marketCap: e.attributes?.market_cap != null ? Number(e.attributes.market_cap) : null,
      influence: Number(e.attributes?.influence ?? 0),
      fg500: e.attributes?.fg500_rank != null ? Number(e.attributes.fg500_rank) : null,
      sectorCode: e.subsectors!.code,
      sectorName: e.subsectors!.name,
    }));

  // sectors with ≥2 players, sorted by count desc
  const counts = new Map<string, BSector>();
  rows.forEach((r) => {
    const s = counts.get(r.sectorCode) ?? { code: r.sectorCode, name: r.sectorName, count: 0 };
    s.count += 1;
    counts.set(r.sectorCode, s);
  });
  const sectors = [...counts.values()].filter((s) => s.count >= 2).sort((a, b) => b.count - a.count);

  return (
    <div>
      <PageHeader
        layer="Layer 2 · Entitas — Posisi Kompetitif"
        icon="swords"
        title="Lanskap Kompetitif"
        subtitle="Di mana posisi kita relatif terhadap pesaing global? Pilih sektor GICS untuk melihat peringkat pemain by market cap, pengaruh, dan Fortune Global 500 — klik untuk positioning lengkap."
      />
      <div className="px-6 md:px-10 pb-24 max-w-6xl">
        <div className="mb-6"><BenchmarkTabs /></div>
        {sectors.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada data.</p>
        ) : (
          <BenchmarkExplorer rows={rows} sectors={sectors} />
        )}
      </div>
    </div>
  );
}
