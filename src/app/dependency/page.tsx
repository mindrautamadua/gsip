import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";
import { DependencyMatrix, type DepRow } from "@/components/dependency/DependencyMatrix";

export const revalidate = 0;
export const metadata = { title: "Strategic Dependency · GSIP" };

// MGI China-World Exposure Index — the signature "scissors" (Exhibit E2/E13).
// Relative exposure vs a benchmark of 7 large economies = 1.0.
const YEARS = [2000, 2007, 2012, 2017];
const WORLD_TO_CHINA = [0.4, 0.7, 1.1, 1.2]; // world's exposure to China (rising)
const CHINA_TO_WORLD = [0.8, 0.9, 0.7, 0.6]; // China's exposure to world (falling)

function v(x: number | null) { return x == null ? 0 : x; }

export default async function DependencyPage() {
  const { data } = await supabase
    .from("country_dependency")
    .select("country_code,name,region,archetype,exp_prod_p1,exp_prod_p2,imp_cons_p1,imp_cons_p2,fdi_inv_p1,fdi_inv_p2,china_reliance_level,china_reliance_note,source")
    .order("sort_order")
    .returns<DepRow[]>();

  const rows = data ?? [];
  const comp = (r: DepRow, p: 1 | 2) =>
    (v(p === 2 ? r.exp_prod_p2 : r.exp_prod_p1) + v(p === 2 ? r.imp_cons_p2 : r.imp_cons_p1) + v(p === 2 ? r.fdi_inv_p2 : r.fdi_inv_p1)) / 3;
  const rising = rows.filter((r) => comp(r, 2) - comp(r, 1) > 0.75).length;
  const chinaReliant = rows.filter((r) => r.china_reliance_level === "high");

  // scissors geometry
  const W = 640, H = 300, ml = 44, mr = 90, mt = 24, mb = 36;
  const pw = W - ml - mr, ph = H - mt - mb;
  const xAt = (i: number) => ml + (i / (YEARS.length - 1)) * pw;
  const yAt = (val: number) => mt + (1 - val / 1.3) * ph;
  const line = (series: number[]) => series.map((val, i) => `${xAt(i).toFixed(1)},${yAt(val).toFixed(1)}`).join(" ");

  return (
    <div>
      <PageHeader
        layer="Geoekonomi · Ketergantungan Strategis"
        icon="git-compare-arrows"
        title="Strategic Dependency"
        subtitle="Bukan sekadar 'siapa berkuasa', tetapi 'siapa bergantung pada siapa — dan ke arah mana trennya'. Lensa paparan timbal-balik (mengadaptasi MGI China-World Exposure Index): paparan tiap negara ke China vs ketergantungan balik China."
      />

      <div className="px-6 md:px-10 pb-24 space-y-10 max-w-6xl">
        {/* headline stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Negara dipetakan" value={rows.length} icon="globe" />
          <Stat label="Paparan ke China naik" value={rising} icon="trending-up" tone="text-rose-600" hint="sejak 2007" />
          <Stat label="China bergantung balik (tinggi)" value={chinaReliant.length} icon="arrow-left-right" tone="text-amber-600" />
          <Stat label="Dimensi paparan" value={3} icon="layers" hint="dagang · impor · kapital" />
        </div>

        {/* The scissors: mutual exposure over time */}
        <section className="card p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
            Paparan Timbal-Balik China ↔ Dunia
          </div>
          <p className="text-sm text-[var(--muted)] mb-5 max-w-2xl">
            Paparan <span className="text-rose-600 font-medium">dunia ke China</span> naik (0,4 → 1,2) sementara paparan{" "}
            <span className="text-emerald-600 font-medium">China ke dunia</span> turun (0,9 → 0,6). Garis 1,0 = rata-rata 7 ekonomi besar. Inilah "gunting" yang mengubah leverage geoekonomi.
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="China-World mutual exposure over time">
            {/* benchmark line */}
            <line x1={ml} y1={yAt(1.0)} x2={ml + pw} y2={yAt(1.0)} stroke="var(--border)" strokeDasharray="4 4" />
            <text x={ml + pw + 6} y={yAt(1.0) + 4} fontSize="10" fill="var(--muted)">1,0 benchmark</text>
            {/* y ticks */}
            {[0, 0.4, 0.8, 1.2].map((t) => (
              <text key={t} x={ml - 8} y={yAt(t) + 3} textAnchor="end" fontSize="10" fill="var(--muted)" className="tabular-nums">{t.toFixed(1)}</text>
            ))}
            {/* x labels */}
            {YEARS.map((yr, i) => (
              <text key={yr} x={xAt(i)} y={mt + ph + 22} textAnchor="middle" fontSize="11" fill="var(--muted)" className="font-mono">{yr}</text>
            ))}
            {/* lines */}
            <polyline points={line(WORLD_TO_CHINA)} fill="none" stroke="#f43f5e" strokeWidth="2.5" />
            <polyline points={line(CHINA_TO_WORLD)} fill="none" stroke="#10b981" strokeWidth="2.5" />
            {WORLD_TO_CHINA.map((val, i) => <circle key={`w${i}`} cx={xAt(i)} cy={yAt(val)} r="3.5" fill="#f43f5e" />)}
            {CHINA_TO_WORLD.map((val, i) => <circle key={`c${i}`} cx={xAt(i)} cy={yAt(val)} r="3.5" fill="#10b981" />)}
            {/* end labels */}
            <text x={ml + pw + 6} y={yAt(WORLD_TO_CHINA[3]) + 4} fontSize="10" fill="#f43f5e" fontWeight="600">Dunia→China</text>
            <text x={ml + pw + 6} y={yAt(CHINA_TO_WORLD[3]) + 4} fontSize="10" fill="#10b981" fontWeight="600">China→Dunia</text>
          </svg>
          <p className="text-[10px] font-mono text-[var(--muted)]/70 mt-2">Sumber: MGI China-World Exposure Index (trade, technology, capital), 2019.</p>
        </section>

        {/* China's critical reverse dependencies */}
        {chinaReliant.length > 0 && (
          <section className="card p-6">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-700 mb-1">
              <Icon name="arrow-left" size={14} /> Ketergantungan Balik — di Mana China Rentan
            </div>
            <p className="text-sm text-[var(--muted)] mb-4 max-w-2xl">
              Paparan bukan satu arah. Pada komoditas & teknologi kritis, justru China yang bergantung — titik ini adalah leverage pihak lawan.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {chinaReliant.map((r) => (
                <div key={r.country_code} className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2.5">
                  <span className="text-lg leading-none shrink-0">{flag(r.country_code)}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{countryName(r.country_code)}</div>
                    <div className="text-[11px] text-[var(--muted)] leading-snug">{r.china_reliance_note}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Exposure matrix by archetype */}
        <section>
          <div className="mb-4">
            <span className="eyebrow">Matriks paparan · per arketipe</span>
            <h2 className="display text-2xl font-semibold tracking-tight mt-3">Peta Ketergantungan Negara ke China</h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">
              Tiap baris = paparan negara ke China pada 3 kanal (ekspor/impor/kapital), nilai 2013–17 dengan panah tren dari 2003–07. Titik di kanan menandai kekuatan ketergantungan balik China. Klik untuk rincian dua arah.
            </p>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Belum ada data.</p>
          ) : (
            <DependencyMatrix rows={rows} />
          )}
        </section>

        <p className="text-[11px] font-mono text-[var(--muted)]/70">
          Basis data: MGI China-World Exposure Index (2019), 18 negara; 4 negara tambahan adalah estimasi analis GSIP (ditandai). Angka bersifat indikatif untuk orientasi strategis.
        </p>
      </div>
    </div>
  );
}

function flag(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";
  const A = 0x1f1e6;
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65)) + String.fromCodePoint(A + (cc.charCodeAt(1) - 65));
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
