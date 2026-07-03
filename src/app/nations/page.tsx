import { supabase } from "@/lib/supabase";
import { PageHeader, StatCard } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { NationRanking } from "@/components/nations/NationRanking";

export const revalidate = 0;

const YEAR = 2023;

type ScoreRow = {
  status_score: number | null;
  capability_score: number | null;
  future_score: number | null;
  composite_score: number | null;
  nef_countries: { code: string; iso2: string | null; name: string; region: string | null; income_group: string | null } | null;
};

type Nation = {
  code: string;
  iso2: string | null;
  name: string;
  region: string | null;
  status: number;
  capability: number;
  future: number;
  composite: number;
};

// ISO2 -> flag emoji (regional indicator letters)
function flag(iso2: string | null): string {
  if (!iso2 || iso2.length !== 2) return "";
  const A = 0x1f1e6;
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65)) + String.fromCodePoint(A + (cc.charCodeAt(1) - 65));
}

// Future score -> tone (environmental+resilience+demographic axis)
function futureTone(f: number): { fill: string; label: string } {
  if (f >= 50) return { fill: "#34d399", label: "Kuat" };
  if (f >= 38) return { fill: "#38bdf8", label: "Sedang" };
  if (f >= 25) return { fill: "#fbbf24", label: "Lemah" };
  return { fill: "#fb7185", label: "Rentan" };
}

export default async function NationsPage() {
  const [{ data }, { data: ivRows }] = await Promise.all([
    supabase
      .from("nef_country_scores")
      .select("status_score,capability_score,future_score,composite_score,nef_countries!inner(code,iso2,name,region,income_group)")
      .eq("year", YEAR)
      .returns<ScoreRow[]>(),
    supabase
      .from("nef_country_indicator_values")
      .select("indicator_id")
      .eq("year", YEAR)
      .returns<{ indicator_id: string }[]>(),
  ]);

  const activeIndicators = new Set((ivRows ?? []).map((r) => r.indicator_id)).size;

  const nations: Nation[] = (data ?? [])
    .filter((r) => r.nef_countries && r.composite_score != null)
    .map((r) => ({
      code: r.nef_countries!.code,
      iso2: r.nef_countries!.iso2,
      name: r.nef_countries!.name,
      region: r.nef_countries!.region,
      status: Number(r.status_score ?? 0),
      capability: Number(r.capability_score ?? 0),
      future: Number(r.future_score ?? 0),
      composite: Number(r.composite_score ?? 0),
    }))
    .sort((a, b) => b.composite - a.composite);

  const top = nations[0];
  const median = nations.length
    ? nations.map((n) => n.composite).sort((a, b) => a - b)[Math.floor(nations.length / 2)]
    : 0;

  // ---- scatter geometry (Status x, Capability y) ----
  const W = 820, H = 560, ml = 56, mr = 28, mt = 24, mb = 48;
  const pw = W - ml - mr, ph = H - mt - mb;
  const sx = 65, sy = 50; // quadrant thresholds
  const px = (v: number) => ml + (v / 100) * pw;
  const py = (v: number) => mt + (1 - v / 100) * ph;

  return (
    <div>
      <PageHeader
        layer="Intelijen Strategis Nasional"
        icon="landmark"
        title="Keunggulan Nasional"
        subtitle="Bukan sekadar 'apakah sebuah negara maju' (Status), tetapi 'mengapa ia unggul' (Capability) dan 'apakah keunggulan itu dapat dipertahankan' (Future Readiness). Model 3-sumbu, 18 pilar, dari kerangka lembaga internasional (World Bank, WGI, UNDP, WIPO, UNIDO)."
      />

      <div className="px-6 md:px-10 pb-24 space-y-10 max-w-6xl">
        {/* headline stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bezel h-full">
            <div className="core h-full p-5 flex flex-col">
              <div className="flex items-start gap-3">
                <span className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-black grid place-items-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)]">
                  <Icon name="trophy" size={19} strokeWidth={1.7} />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] text-foreground/90 font-medium leading-tight">Peringkat #1</div>
                  {top && <div className="text-[11px] text-[var(--muted)] mt-0.5">Composite {top.composite.toFixed(0)}</div>}
                </div>
              </div>
              <div className="mt-auto pt-4 flex items-center gap-2 min-w-0">
                <span className="text-2xl leading-none shrink-0">{top ? flag(top.iso2) : ""}</span>
                <span className="display text-xl font-semibold tracking-tight truncate">{top ? top.name : "—"}</span>
              </div>
            </div>
          </div>
          <StatCard label="Negara dinilai" value={nations.length} icon="globe" hint={`Snapshot ${YEAR} · G20 + ASEAN`} tone="sky" />
          <StatCard label="Median composite" value={median.toFixed(0)} icon="git-commit-horizontal" hint="dari 0–100" />
          <StatCard label="Indikator aktif" value={activeIndicators} icon="database" hint={`${activeIndicators} dari 64 · sumber World Bank`} tone="emerald" />
        </div>

        {/* scatter: Status x Capability, color = Future */}
        <section className="card p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-1">
            Developed vs Leading — Status × Capability
          </div>
          <p className="text-sm text-[var(--muted)] mb-5 max-w-2xl">
            Sumbu-X = <span className="text-foreground">Status</span> (seberapa maju). Sumbu-Y ={" "}
            <span className="text-foreground">Capability</span> (seberapa mampu memengaruhi & bersaing). Warna titik ={" "}
            <span className="text-foreground">Future Readiness</span>. Kuadran kanan-atas = maju <em>dan</em> unggul.
          </p>

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Status vs Capability scatter">
            {/* quadrant fills */}
            <rect x={px(sx)} y={mt} width={px(100) - px(sx)} height={py(sy) - mt} fill="rgba(52,211,153,0.05)" />
            {/* grid + threshold lines */}
            <line x1={px(sx)} y1={mt} x2={px(sx)} y2={mt + ph} stroke="var(--border)" strokeDasharray="4 4" />
            <line x1={ml} y1={py(sy)} x2={ml + pw} y2={py(sy)} stroke="var(--border)" strokeDasharray="4 4" />
            {/* axes */}
            <line x1={ml} y1={mt} x2={ml} y2={mt + ph} stroke="var(--border)" />
            <line x1={ml} y1={mt + ph} x2={ml + pw} y2={mt + ph} stroke="var(--border)" />
            {/* axis labels */}
            <text x={ml + pw} y={mt + ph + 32} textAnchor="end" fontSize="12" fill="var(--muted)">Status (maju) →</text>
            <text x={ml - 10} y={mt + 4} textAnchor="end" fontSize="12" fill="var(--muted)" transform={`rotate(-90 ${ml - 40} ${mt + ph / 2})`} style={{ transformOrigin: "0 0" }}>Capability ↑</text>
            {/* quadrant captions */}
            <text x={px(sx) + 10} y={mt + 16} fontSize="11" fill="var(--muted)" opacity={0.8}>Maju &amp; Unggul</text>
            <text x={px(sx) + 10} y={mt + ph - 8} fontSize="11" fill="var(--muted)" opacity={0.8}>Maju, belum unggul</text>
            <text x={ml + 8} y={mt + 16} fontSize="11" fill="var(--muted)" opacity={0.8}>Unggul, belum maju</text>

            {/* points */}
            {nations.map((n) => {
              const t = futureTone(n.future);
              return (
                <g key={n.code}>
                  <circle cx={px(n.status)} cy={py(n.capability)} r={6} fill={t.fill} fillOpacity={0.85} stroke="#0a0a0a" strokeWidth={0.5} />
                  <text x={px(n.status) + 9} y={py(n.capability) + 3.5} fontSize="10" fill="var(--foreground)" opacity={0.75} className="font-mono">{n.code}</text>
                </g>
              );
            })}
          </svg>

          {/* future legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-[var(--muted)]">
            <span className="font-mono uppercase tracking-widest">Future Readiness:</span>
            {[["#34d399", "Kuat ≥50"], ["#38bdf8", "Sedang 38–50"], ["#fbbf24", "Lemah 25–38"], ["#fb7185", "Rentan <25"]].map(([c, l]) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} /> {l}
              </span>
            ))}
          </div>
        </section>

        {/* ranked table */}
        <section>
          <div className="mb-4">
            <span className="eyebrow">Peringkat composite</span>
            <h2 className="display text-2xl font-semibold tracking-tight mt-3">National Excellence Index</h2>
          </div>
          <NationRanking nations={nations} />
        </section>

        {/* honesty footnote */}
        <section className="card p-6 text-sm text-[var(--muted)] leading-relaxed">
          <div className="text-xs font-mono uppercase tracking-widest mb-2">Catatan metodologi &amp; cakupan</div>
          <p className="mb-2">
            Normalisasi <span className="text-foreground">goalpost</span> (gaya HDI/GII) → skor absolut 0–100 yang stabil lintas waktu. Snapshot {YEAR}, sumber World Bank / WGI. Bobot pilar{" "}
            <span className="text-foreground">dikalibrasi empiris</span> (redundancy-adjusted dari korelasi antar-pilar) untuk 14 pilar berdata; pilar tanpa data dan indikator noisy ditahan di bobot expert.
          </p>
          <p>
            <span className="text-foreground">Validitas per sumbu:</span> <span className="text-foreground">Status</span> kuat.
            {" "}<span className="text-foreground">Capability</span> bermakna (governance, innovation, industrial, digital, education, technology terisi; global_influence &amp; business-env belum).
            {" "}<span className="text-foreground">Future</span> mencakup sustainability + resilience + demografi, masih tertimbang lingkungan. Composite bersifat indikatif hingga 4 pilar sisa (science, quality-of-life, global influence, business env) dilengkapi.
          </p>
        </section>
      </div>
    </div>
  );
}
