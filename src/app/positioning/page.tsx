import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PositioningScatter, type PosRow } from "@/components/positioning/PositioningScatter";
import { BenchmarkTabs } from "@/components/benchmark/BenchmarkTabs";

export const revalidate = 0;
export const metadata = { title: "Scale × Integration · GSIP" };

type Raw = {
  name: string;
  slug: string;
  attributes: { influence?: number | string; scale?: number | string; integration?: number | string } | null;
  entity_types: { category: string | null; icon: string | null } | { category: string | null; icon: string | null }[] | null;
};
const pick = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] : x) ?? null;

export default async function PositioningPage() {
  const { data } = await supabase
    .from("entities")
    .select("name,slug,attributes,entity_types(category,icon)")
    .not("attributes->>scale", "is", null)
    .order("attributes->influence", { ascending: false })
    .limit(70)
    .returns<Raw[]>();

  const rows: PosRow[] = (data ?? []).map((r) => {
    const et = pick(r.entity_types);
    return {
      name: r.name,
      slug: r.slug,
      influence: Number(r.attributes?.influence ?? 0),
      scale: Number(r.attributes?.scale ?? 0),
      integration: Number(r.attributes?.integration ?? 0),
      icon: et?.icon ?? "circle",
      category: et?.category ?? null,
    };
  });

  const isolated = rows.filter((r) => r.scale >= 60 && r.integration < 40).length;

  return (
    <div>
      <PageHeader
        layer="Layer 2 · Posisi"
        icon="scatter-chart"
        title="Skala × Integrasi"
        subtitle="Skor influence tunggal menyembunyikan nuansa. Lensa McKinsey memisahkan dua sumbu: seberapa besar (Skala) vs seberapa terjalin dalam sistem (Integrasi). 'Scale without integration' — besar tapi terisolasi — adalah profil yang khas berbahaya sekaligus rapuh."
      />

      <div className="px-6 md:px-10 pb-24 space-y-8 max-w-6xl">
        <BenchmarkTabs />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Entitas dipetakan" value={rows.length} icon="scatter-chart" />
          <Stat label="Besar tapi terisolasi" value={isolated} icon="unlink" tone="text-rose-600" hint="skala≥60 · integ<40" />
          <Stat label="Sumbu" value={2} icon="axis-3d" hint="skala · integrasi" />
          <Stat label="Ambang kuadran" value={50} icon="crosshair" />
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada data posisi.</p>
        ) : (
          <PositioningScatter rows={rows} />
        )}

        <p className="text-[11px] font-mono text-[var(--muted)]/70">
          Skala = normalisasi bobot/ukuran (influence_prior). Integrasi = normalisasi keterjalinan graf (relasi entitas + partisipasi peristiwa). Keduanya 0–100 relatif terhadap set ternilai — indikatif, mencerminkan cakupan graf GSIP saat ini.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, tone = "", hint }: { label: string; value: number; icon: string; tone?: string; hint?: string }) {
  return (
    <div className="card p-5 flex items-center gap-3">
      <span className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-600">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <div className={`display text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
        <div className="text-[11px] text-[var(--muted)] truncate">{label}{hint ? ` · ${hint}` : ""}</div>
      </div>
    </div>
  );
}
