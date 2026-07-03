import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";
import { FG500Table, type FG500Row } from "@/components/fortune/FG500Table";

export const revalidate = 0;
export const metadata = { title: "Fortune Global 500 · GSIP" };

type Row = {
  name: string;
  slug: string;
  country_code: string | null;
  attributes: { fg500_rank?: number; ticker?: string; market_cap?: number; influence?: number; domain?: string } | null;
  entity_types: { icon: string | null } | null;
  subsectors: { code: string; name: string } | null;
};

export default async function FortuneGlobal500Page() {
  const { data } = await supabase
    .from("entities")
    .select("name,slug,country_code,attributes,entity_types(icon),subsectors(code,name)")
    .not("attributes->>fg500_rank", "is", null)
    .returns<Row[]>();

  const rows: FG500Row[] = (data ?? []).map((e) => ({
    slug: e.slug,
    name: e.name,
    rank: Number(e.attributes?.fg500_rank ?? 999),
    cc: e.country_code,
    gics: e.subsectors?.code ?? null,
    sector: e.subsectors?.name ?? null,
    ticker: e.attributes?.ticker ?? null,
    marketCap: e.attributes?.market_cap != null ? Number(e.attributes.market_cap) : null,
    influence: Number(e.attributes?.influence ?? 0),
    icon: e.entity_types?.icon ?? "building",
    domain: e.attributes?.domain ?? null,
  }));

  const countries = new Set(rows.map((r) => r.cc).filter(Boolean)).size;
  const totalCap = rows.reduce((s, r) => s + (r.marketCap ?? 0), 0);

  // composition by country
  const byCountry = new Map<string, number>();
  rows.forEach((r) => { if (r.cc) byCountry.set(r.cc, (byCountry.get(r.cc) ?? 0) + 1); });
  const topCountries = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxC = topCountries[0]?.[1] ?? 1;
  const us = byCountry.get("US") ?? 0;
  const cn = byCountry.get("CN") ?? 0;

  return (
    <div>
      <PageHeader
        layer="Pasar · Kekuatan Korporasi"
        icon="award"
        title="Fortune Global 500"
        subtitle="100 perusahaan terbesar dunia (edisi 2024, indikatif) — tertaut ke klasifikasi GICS, negara asal, dan skor pengaruh GSIP. Klik baris untuk profil lengkap."
      />
      <div className="px-6 md:px-10 pb-24 space-y-6 max-w-6xl">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Perusahaan" value={String(rows.length)} icon="building-2" />
          <Stat label="Negara asal" value={String(countries)} icon="globe" />
          <Stat label="Total market cap" value={`$${(totalCap / 1000).toFixed(1)}T`} icon="landmark" />
        </div>

        {/* composition by country */}
        <section className="card p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
            Komposisi per Negara — konsentrasi kekuatan korporasi
          </div>
          <div className="flex items-end gap-6 my-4">
            <div>
              <div className="display text-4xl font-semibold text-accent">{us}</div>
              <div className="text-xs text-[var(--muted)] mt-1">United States</div>
            </div>
            <div className="text-[var(--muted)] text-2xl pb-2">vs</div>
            <div>
              <div className="display text-4xl font-semibold text-amber-500">{cn}</div>
              <div className="text-xs text-[var(--muted)] mt-1">China</div>
            </div>
            <div className="ml-auto text-right text-xs text-[var(--muted)] pb-1">
              AS + China = <span className="text-foreground font-semibold">{us + cn}</span> dari {rows.length}
            </div>
          </div>
          <div className="space-y-2">
            {topCountries.map(([cc, n]) => (
              <div key={cc} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-[var(--muted)] truncate">{countryName(cc)}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className={`h-full rounded-full ${cc === "CN" ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${(n / maxC) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-xs font-mono tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        </section>

        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada data Fortune Global 500.</p>
        ) : (
          <FG500Table rows={rows} />
        )}

        <p className="text-[11px] font-mono text-[var(--muted)]/70">
          Peringkat = Fortune Global 500 edisi 2024 (pendapatan FY2023), indikatif. Market cap = snapshot awal 2026.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card p-5 flex items-center gap-3">
      <span className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-600">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <div className="display text-2xl font-semibold tabular-nums truncate">{value}</div>
        <div className="text-[11px] text-[var(--muted)]">{label}</div>
      </div>
    </div>
  );
}
