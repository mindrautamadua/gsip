import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";

export const revalidate = 0;
export const metadata = { title: "Competitor Landscape · GSIP" };

// Capability columns (short label + full name for tooltip).
const CAPS = [
  { s: "Geopol", f: "Geopolitical intelligence & analysis" },
  { s: "Graph", f: "Entity knowledge graph" },
  { s: "Events", f: "Real-time event tracking" },
  { s: "Depend.", f: "Supply-chain / geoeconomic dependency" },
  { s: "Nation", f: "National competitiveness / power benchmark" },
  { s: "Foresight", f: "Calibrated prediction / forecasting" },
  { s: "Markets", f: "Market & macro data" },
];

// Coverage: 2 = kuat, 1 = sebagian, 0 = tidak. Penilaian sintesis analis GSIP.
const PLAYERS: { name: string; note?: string; self?: boolean; cov: number[] }[] = [
  { name: "GSIP", note: "Terintegrasi · vantage Indonesia · self-host", self: true, cov: [2, 2, 2, 2, 2, 2, 1] },
  { name: "Palantir (Gotham/Foundry)", note: "Enterprise/gov, mahal", cov: [1, 2, 2, 1, 0, 1, 0] },
  { name: "Recorded Future", note: "Intelligence Graph (cyber→geopolitik)", cov: [1, 2, 2, 0, 0, 1, 0] },
  { name: "Stratfor / RANE", note: "Advisory berbasis laporan", cov: [2, 1, 1, 1, 1, 1, 0] },
  { name: "Economist Intelligence Unit", note: "Country risk & forecast", cov: [2, 0, 1, 1, 2, 1, 1] },
  { name: "Verisk Maplecroft", note: "Indeks risiko global", cov: [1, 0, 1, 1, 2, 1, 0] },
  { name: "GDELT (open)", note: "Event+graph, gratis", cov: [1, 1, 2, 0, 0, 0, 0] },
  { name: "Interos / Sayari", note: "Corporate & supply-chain graph", cov: [0, 1, 1, 2, 0, 0, 0] },
  { name: "Lowy / IMD (indeks)", note: "Power & competitiveness index", cov: [1, 0, 0, 0, 2, 0, 0] },
  { name: "Bloomberg / LSEG", note: "Terminal pasar", cov: [1, 0, 1, 0, 0, 0, 2] },
  { name: "Good Judgment / Metaculus", note: "Superforecasting", cov: [1, 0, 0, 0, 0, 2, 0] },
];

function Dot({ v }: { v: number }) {
  if (v === 2) return <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" title="Kuat" />;
  if (v === 1) return <span className="inline-block h-3 w-3 rounded-full border-2 border-emerald-500/70" title="Sebagian" />;
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--border)]" title="Tidak" />;
}

const CATEGORIES = [
  { icon: "swords", title: "Intelijen geopolitik & analisis", players: ["Stratfor / RANE", "Eurasia Group (GZERO)", "Economist Intelligence Unit", "Oxford Analytica", "Control Risks", "Dragonfly / Sibylline"] },
  { icon: "waypoints", title: "Event database + knowledge graph", players: ["GDELT (open)", "Recorded Future", "Palantir Gotham/Foundry", "Dataminr", "Babel Street"] },
  { icon: "git-compare-arrows", title: "Ketergantungan & rantai pasok", players: ["Interos", "Sayari", "Kpler", "Panjiva / S&P Global", "ImportGenius"] },
  { icon: "landmark", title: "Benchmark daya saing negara", players: ["IMD World Competitiveness", "WEF GCI (historis)", "Lowy Asia Power Index", "Elcano Global Presence", "Verisk Maplecroft"] },
  { icon: "git-fork", title: "Foresight / prediksi terkalibrasi", players: ["Good Judgment", "Metaculus", "Hedgeye"] },
  { icon: "candlestick-chart", title: "Sinyal pasar + makro", players: ["Bloomberg Terminal", "LSEG / Refinitiv", "S&P Capital IQ"] },
];

const DIFF = [
  { icon: "layers", title: "Integrasi lintas-lapis", desc: "Benchmark negara + graph pengaruh + ketergantungan geoekonomi + foresight dalam satu aplikasi — bukan tersebar di 5 vendor." },
  { icon: "sliders-horizontal", title: "Model opinionated & transparan", desc: "Domain→Entity→Event→Foresight + kerangka National Excellence yang eksplisit dan bisa dikalibrasi — bukan indeks kotak-hitam." },
  { icon: "flag", title: "Vantage Indonesia", desc: "Membingkai risiko & peluang dari kepentingan nasional Indonesia; kebanyakan incumbent ber-vantage Barat/global." },
  { icon: "feather", title: "Stack ringan & self-host", desc: "Next.js + Supabase — biaya rendah, dapat dijalankan sendiri, dan cepat diperluas. Incumbent umumnya enterprise mahal." },
];

export default function LandscapePage() {
  return (
    <div>
      <PageHeader
        layer="Positioning · Lanskap"
        icon="map"
        title="Competitor Landscape"
        subtitle="Di mana GSIP berdiri di antara platform intelijen strategis dunia. Banyak pemain menguasai sebagian kapabilitas; sedikit yang menyatukan semuanya dalam satu produk terjangkau."
      />

      <div className="px-6 md:px-10 pb-24 space-y-12 max-w-6xl">
        {/* coverage matrix */}
        <section className="space-y-4">
          <div>
            <span className="eyebrow">Matriks cakupan</span>
            <h2 className="display text-2xl font-semibold tracking-tight mt-3">Terintegrasi vs terfragmentasi</h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">Tiap incumbent umumnya kuat di 1–2 kolom. GSIP dirancang menutup seluruh spektrum dalam satu tempat.</p>
          </div>
          <div className="card p-4 overflow-x-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr className="text-[var(--muted)]">
                  <th className="text-left font-medium text-xs px-3 py-2 w-64">Platform</th>
                  {CAPS.map((c) => (
                    <th key={c.s} className="text-center font-mono text-[11px] px-2 py-2" title={c.f}>{c.s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLAYERS.map((p) => (
                  <tr key={p.name} className={`border-t border-[var(--border)] ${p.self ? "bg-emerald-500/5" : ""}`}>
                    <td className="px-3 py-2.5">
                      <div className={`text-sm ${p.self ? "font-semibold text-accent" : "font-medium"}`}>{p.name}</div>
                      {p.note && <div className="text-[10px] text-[var(--muted)]/70">{p.note}</div>}
                    </td>
                    {p.cov.map((v, i) => (
                      <td key={i} className="text-center px-2 py-2.5"><Dot v={v} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Kuat</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-emerald-500/70" /> Sebagian</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--border)]" /> Tidak</span>
            <span className="ml-auto font-mono">Penilaian: sintesis analis GSIP · indikatif</span>
          </div>
        </section>

        {/* by category */}
        <section className="space-y-4">
          <div>
            <span className="eyebrow">Per kategori</span>
            <h2 className="display text-2xl font-semibold tracking-tight mt-3">Siapa bermain di mana</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c) => (
              <div key={c.title} className="card p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-accent"><Icon name={c.icon} size={17} /></span>
                  <span className="font-medium text-sm leading-tight">{c.title}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.players.map((pl) => (
                    <span key={pl} className="text-[11px] rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[var(--muted)]">{pl}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* differentiation */}
        <section className="space-y-4">
          <div>
            <span className="eyebrow">Diferensiasi</span>
            <h2 className="display text-2xl font-semibold tracking-tight mt-3">Ceruk GSIP</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {DIFF.map((d) => (
              <div key={d.title} className="card p-5 flex gap-3">
                <span className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-accent"><Icon name={d.icon} size={19} /></span>
                <div>
                  <div className="font-medium">{d.title}</div>
                  <p className="text-[13px] text-[var(--muted)] mt-1 leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* verdict */}
        <section className="card p-6">
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-2">Kesimpulan</div>
          <p className="text-sm leading-relaxed">
            GSIP <span className="text-foreground">bukan yang pertama</span> di tiap fungsi — hampir semua lapisnya punya incumbent kelas dunia. Namun padanan <span className="text-foreground">all-in-one</span> yang menyatukan negara, entitas, event, ketergantungan, dan foresight umumnya <span className="text-foreground">enterprise mahal &amp; terfragmentasi</span> atau berbasis laporan. Kombinasi <span className="text-accent">terintegrasi + terjangkau + ber-vantage Indonesia</span> itulah posisi yang GSIP isi.
          </p>
        </section>

        <p className="text-[11px] font-mono text-[var(--muted)]/70">
          Catatan: pemetaan bersifat indikatif dari pengetahuan publik & sintesis analis, bukan endorsement atau perbandingan resmi. Cakupan produk berubah seiring waktu.
        </p>
      </div>
    </div>
  );
}
