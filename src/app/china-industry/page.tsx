import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ChinaDominance, type Industry } from "@/components/china/ChinaDominance";
import { WorldAssetMap } from "@/components/china/WorldAssetMap";
import { AssetList } from "@/components/china/AssetList";

export const revalidate = 0;
export const metadata = { title: "China Industrial Dominance · GSIP" };

// China's export-control actions on critical materials (leverage timeline).
const CONTROLS: { date: string; material: string; action: string }[] = [
  { date: "Agu 2023", material: "Galium & Germanium", action: "kontrol lisensi ekspor (semikonduktor & optik)" },
  { date: "Des 2023", material: "Grafit (anoda)", action: "izin ekspor untuk material baterai" },
  { date: "Des 2023", material: "Teknologi pemrosesan Rare Earth", action: "dilarang diekspor" },
  { date: "Des 2024", material: "Galium, Germanium, Antimon", action: "larangan ekspor ke Amerika Serikat" },
  { date: "Feb 2025", material: "Tungsten, Tellurium, Bismut, dll", action: "kontrol ekspor logam strategis" },
  { date: "Apr 2025", material: "Rare Earth medium/berat (7 elemen)", action: "wajib lisensi ekspor + magnet" },
];

export default async function ChinaIndustryPage() {
  type Raw = {
    id: string; name: string; slug: string; icon: string | null;
    global_share: number | null; rank_note: string | null; description: string | null;
    entity_slug: string | null;
    clusters: Industry["clusters"];
    subsectors:
      | { code: string; name: string; sectors: { industries: { name: string } | { name: string }[] | null } | { industries: { name: string } | { name: string }[] | null }[] | null }
      | null;
  };
  const pick = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] : x) ?? null;

  const { data } = await supabase
    .from("china_industries")
    .select(
      "id,name,slug,icon,global_share,rank_note,description,entity_slug,clusters,subsectors(code,name,sectors(name,industries(name)))"
    )
    .order("sort_order")
    .returns<Raw[]>();

  const industries: Industry[] = (data ?? []).map((r) => {
    const ss = pick(r.subsectors);
    const sec = pick(ss?.sectors);
    const sector = pick(sec?.industries);
    return {
      id: r.id, name: r.name, slug: r.slug, icon: r.icon,
      global_share: r.global_share, rank_note: r.rank_note, description: r.description,
      clusters: r.clusters ?? [],
      entity_slug: r.entity_slug,
      gics_code: ss?.code ?? null,
      gics_industry: ss?.name ?? null,
      gics_sector: sector?.name ?? null,
    };
  });

  // resolve flagship company name + icon for each industry's entity link
  const compSlugs = [...new Set(industries.map((i) => i.entity_slug).filter((s): s is string => !!s))];
  if (compSlugs.length) {
    const { data: comps } = await supabase
      .from("entities")
      .select("slug,name,entity_types(icon)")
      .in("slug", compSlugs)
      .returns<{ slug: string; name: string; entity_types: { icon: string | null } | { icon: string | null }[] | null }[]>();
    const cmap = new Map((comps ?? []).map((c) => [c.slug, c]));
    for (const ind of industries) {
      const c = ind.entity_slug ? cmap.get(ind.entity_slug) : null;
      if (c) {
        ind.entity_name = c.name;
        ind.entity_icon = pick(c.entity_types)?.icon ?? null;
      }
    }
  }

  const clusterCount = industries.reduce((n, i) => n + (i.clusters?.length ?? 0), 0);
  const provinces = new Set(industries.flatMap((i) => i.clusters.map((c) => c.province))).size;
  const dominant = industries.filter((i) => (i.global_share ?? 0) >= 60).length;

  // China's overseas strategic assets (BRI footprint)
  type AssetRow = {
    id: string;
    name: string;
    slug: string;
    country_code: string | null;
    attributes: { kind?: string; operator?: string; stake?: string; lat?: number; lng?: number } | null;
  };
  type ChokeRow = { id: string; name: string; slug: string; attributes: { lat?: number; lng?: number } | null };
  const [{ data: assetsRaw }, { data: chokeRaw }, { data: cmdRaw }] = await Promise.all([
    supabase.from("entities").select("id,name,slug,country_code,attributes").eq("attributes->>overseas", "true").returns<AssetRow[]>(),
    supabase.from("entities").select("id,name,slug,attributes,entity_types!inner(code)").eq("entity_types.code", "chokepoint").returns<ChokeRow[]>(),
    supabase.from("entity_edges").select("source_entity_id,target_entity_id,relationship_types!inner(code)").eq("relationship_types.code", "commands").returns<{ source_entity_id: string; target_entity_id: string }[]>(),
  ]);
  const assets = assetsRaw ?? [];
  const chokepoints = chokeRaw ?? [];
  const assetHosts = new Set(assets.map((a) => a.country_code).filter(Boolean)).size;

  // build world-map inputs
  const idToSlug = new Map<string, string>([...assets, ...chokepoints].map((e) => [e.id, e.slug]));
  const mapAssets = assets
    .filter((a) => a.attributes?.lat != null && a.attributes?.lng != null)
    .map((a) => ({ name: a.name, slug: a.slug, kind: a.attributes?.kind ?? "port", country: a.country_code, lat: a.attributes!.lat!, lng: a.attributes!.lng! }));
  const mapChokes = chokepoints
    .filter((c) => c.attributes?.lat != null && c.attributes?.lng != null)
    .map((c) => ({ name: c.name, slug: c.slug, lat: c.attributes!.lat!, lng: c.attributes!.lng! }));
  const mapLinks = (cmdRaw ?? [])
    .map((e) => ({ from: idToSlug.get(e.source_entity_id) ?? "", to: idToSlug.get(e.target_entity_id) ?? "" }))
    .filter((l) => l.from && l.to);
  const chokeName = new Map(chokepoints.map((c) => [c.slug, c.name]));
  const assetName = new Map(assets.map((a) => [a.slug, a.name]));

  return (
    <div>
      <PageHeader
        layer="Geoekonomi · Rantai Pasok Kritis"
        icon="factory"
        title="Dominasi Industri China"
        subtitle="Industri strategis yang dikuasai China beserta lokasi klaster produksinya — lensa untuk memahami ketergantungan rantai pasok global dan titik kritis geoekonomi."
      />

      <div className="px-6 md:px-10 pb-24 space-y-8 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Industri dipetakan" value={industries.length} icon="layers" />
          <Stat label="Klaster produksi" value={clusterCount} icon="map-pin" />
          <Stat label="Provinsi terlibat" value={provinces} icon="map" />
          <Stat label="Pangsa global ≥60%" value={dominant} icon="trending-up" tone="text-rose-600" />
        </div>

        {industries.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada data industri.</p>
        ) : (
          <ChinaDominance industries={industries} />
        )}

        {/* Geoeconomic leverage — export-control weaponization timeline */}
        <section className="card p-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-rose-600 mb-1">
            <Icon name="alert-triangle" size={14} /> Senjata Geoekonomi — Kendali Ekspor
          </div>
          <p className="text-sm text-[var(--muted)] mb-5 max-w-2xl">
            Dominasi pasok diterjemahkan menjadi leverage: sejak 2023 China berulang kali membatasi ekspor material kritis
            sebagai respons ketegangan dagang & teknologi.
          </p>
          <div className="space-y-3">
            {CONTROLS.map((c, i) => (
              <div key={`${c.date}-${c.material}-${i}`} className="flex items-start gap-3">
                <span className="shrink-0 text-[11px] font-mono text-rose-600 w-20 pt-0.5">{c.date}</span>
                <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
                <div>
                  <span className="text-sm font-medium">{c.material}</span>
                  <span className="text-sm text-[var(--muted)]"> — {c.action}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* China's overseas footprint (Belt & Road) */}
        {assets.length > 0 && (
          <section className="card p-6">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
              <Icon name="globe" size={14} className="text-accent" /> Jejak Global — Aset Strategis Luar Negeri
            </div>
            <p className="text-sm text-[var(--muted)] mb-5 max-w-2xl">
              Lewat Belt &amp; Road, kendali China meluas ke {assets.length} aset di {assetHosts} negara — pelabuhan,
              tambang, rel, dan pangkalan — memperluas leverage jauh di luar wilayahnya.
            </p>

            {mapAssets.length > 0 && (
              <div className="mb-6">
                <WorldAssetMap assets={mapAssets} chokepoints={mapChokes} links={mapLinks} />
              </div>
            )}

            {mapLinks.length > 0 && (
              <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-4">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-amber-700 mb-2.5">
                  <Icon name="anchor" size={13} /> Kendali Jalur Laut — Aset dekat Chokepoint
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {mapLinks.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="font-medium truncate">{assetName.get(l.from) ?? l.from}</span>
                      <Icon name="arrow-right" size={12} className="text-amber-600 shrink-0" />
                      <span className="text-[var(--muted)] truncate">{chokeName.get(l.to) ?? l.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <AssetList assets={assets} />
          </section>
        )}

        <p className="text-[11px] font-mono text-[var(--muted)]/70">
          Angka pangsa global adalah perkiraan analitis (kapasitas/produksi) untuk orientasi strategis, bukan statistik resmi real-time.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, tone = "" }: { label: string; value: number; icon: string; tone?: string }) {
  return (
    <div className="card p-5 flex items-center gap-3">
      <span className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-600">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <div className={`display text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
        <div className="text-[11px] text-[var(--muted)]">{label}</div>
      </div>
    </div>
  );
}
