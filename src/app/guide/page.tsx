import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { NAV_GROUPS, type NavItem } from "@/components/shell/nav";

export const revalidate = 0;
export const metadata = { title: "Panduan Penggunaan · GSIP" };

// Per-route guidance keyed by href. `what` = apa fungsinya, `how` = cara pakai kunci.
const GUIDE: Record<string, { what: string; how?: string }> = {
  "/": { what: "Ringkasan tingkat tinggi: sinyal utama, statistik, dan pintu masuk ke seluruh layer." },
  "/materiality": { what: "Menyaring 'apa yang paling penting sekarang' — memprioritaskan entitas & isu berdasarkan materialitas strategis." },
  "/posture": { what: "Papan sintesis: risiko & peluang strategis terbesar dalam satu tampilan — gabungan analisis peristiwa, ketergantungan struktural, pemenang substitusi, dan sinyal prediksi.", how: "Menjawab 'apa risiko & peluang terbesar kita' langsung; klik item untuk ke peristiwa sumbernya." },
  "/global-benchmark": { what: "Hub benchmark terpadu: bandingkan negara (NEF), perusahaan, sektor GICS, dan entitas dalam satu tampilan bertab.", how: "Pilih tab subjek; klik baris untuk menyelam ke halaman sumbernya." },
  "/pulse": { what: "Bola dunia sinematik berputar: simpul = pengaruh negara, busur berdenyut = relasi lintas-batas dari knowledge graph.", how: "Seret untuk memutar globe." },
  "/insights": { what: "Analitik lintas-data — pola, skor, dan visual ringkas dari knowledge graph & event." },
  "/guide": { what: "Halaman ini — panduan penggunaan platform." },
  "/landscape": { what: "Lanskap kompetitor: posisi GSIP vs platform intelijen strategis dunia, dengan matriks cakupan & diferensiasi." },
  "/brief": { what: "Ringkasan intelijen periodik (harian/mingguan) yang dirangkum AI dari peristiwa terbaru.", how: "Analyst/Admin dapat men-generate brief baru." },
  "/domains": { what: "Layer 1 — domain sebagai lensa pengamatan dunia. Fondasi klasifikasi semua entitas & peristiwa.", how: "Klik kartu domain untuk detail: deskripsi penuh + daftar entitas & event di dalamnya." },
  "/taxonomy": { what: "Klasifikasi industri GICS: 11 sektor → 25 grup → 74 industri.", how: "Ketik untuk mencari, Expand/Collapse all, atau klik kartu sektor untuk melompat & meng-expand cabangnya." },
  "/graph": { what: "Peta relasi antar-entitas (siapa terhubung ke siapa).", how: "Tarik node untuk mengatur, scroll untuk zoom, klik node untuk fokus ke tetangganya. Kotak search di kiri-atas menyorot hasil; tombol ⛶ untuk fullscreen." },
  "/influence": { what: "Peringkat pengaruh global: negara, organisasi, perusahaan, dan tokoh di baliknya.", how: "Klik baris mana pun untuk membuka profil lengkap dalam modal. Logo perusahaan muncul otomatis." },
  "/positioning": { what: "Peta posisi strategis entitas pada dua sumbu (skala × integrasi)." },
  "/entities": { what: "Direktori seluruh entitas dengan pencarian & filter; pintu ke halaman detail tiap entitas." },
  "/events": { what: "Layer 3 — peristiwa strategis dengan analisis 5W1H, skor impact/risk/opportunity, dan reliabilitas sumber (NATO Admiralty).", how: "Klik peristiwa untuk analisis penuh." },
  "/nations": { what: "Scorecard keunggulan nasional 3-sumbu (Status · Capability · Future) dari 18 pilar & kerangka lembaga internasional.", how: "Baca scatter 'developed vs leading' dan peringkat composite; warna titik = Future Readiness." },
  "/china-industry": { what: "Dominasi industri China per kategori (pangsa global), kontrol ekspor material kritis, dan jejak aset global.", how: "Termasuk barang-modal 'factory of the factories' + batasnya (semikonduktor)." },
  "/dependency": { what: "Ketergantungan strategis: paparan timbal-balik China ↔ dunia dari waktu ke waktu (efek 'gunting')." },
  "/substitution": { what: "Efek orde-kedua: saat sebuah guncangan terjadi, siapa yang diuntungkan dan seberapa siap menyerapnya." },
  "/markets": { what: "Sinyal pasar & harga instrumen strategis (live)." },
  "/predictions": { what: "Catatan prediksi terstruktur dengan probabilitas & skor Brier untuk mengukur kalibrasi.", how: "Analyst/Admin menyelesaikan (resolve) prediksi saat outcome diketahui." },
  "/scenarios": { what: "Simulasi nilai yang dipertaruhkan (value at stake) untuk tiap skenario strategis." },
  "/trajectory": { what: "Lintasan & tren indikator sepanjang waktu." },
  "/ingest": { what: "Pipeline asupan: menarik berita/data (RSS → ekstraksi) menjadi entitas & peristiwa.", how: "Terbatas untuk Analyst/Admin." },
  "/admin/users": { what: "Manajemen pengguna & peran (viewer/analyst/admin).", how: "Khusus Admin." },
};

const LAYERS = [
  { icon: "layers", name: "Layer 1 · Domain", desc: "Lensa paling atas — 20 domain tempat segala sesuatu dipetakan. Stabil & jarang berubah." },
  { icon: "share-2", name: "Layer 2 · Entity", desc: "Aktor dunia: negara, organisasi, perusahaan, teknologi, komoditas — plus taksonomi GICS, knowledge graph, dan skor pengaruh." },
  { icon: "radar", name: "Layer 3 · Event", desc: "Peristiwa strategis yang menghubungkan aktor lintas waktu, dengan analisis dampak & risiko." },
  { icon: "git-fork", name: "Foresight", desc: "Dari pengamatan ke antisipasi: prediksi terkalibrasi, skenario nilai-dipertaruhkan, dan lintasan tren." },
];

const GESTURES = [
  { icon: "waypoints", title: "Knowledge Graph", items: ["Tarik node untuk menata ulang", "Scroll = zoom, seret latar = geser", "Klik node → fokus ke tetangga", "Search di kanvas menyorot & memusatkan", "Tombol ⛶ = fullscreen (Esc keluar)"] },
  { icon: "network", title: "GICS Taxonomy", items: ["Search sektor/grup/industri (highlight cocok)", "Expand all / Collapse all", "Klik kartu sektor → lompat + expand"] },
  { icon: "globe", title: "Domains", items: ["Klik kartu → modal detail", "Lihat daftar entitas & event domain", "Baris menautkan ke halaman terkait"] },
  { icon: "crown", title: "Influence", items: ["Klik baris → profil modal lengkap", "Logo perusahaan otomatis dari domain", "Bagan share AS vs China"] },
];

const ROLES = [
  { icon: "eye", role: "Viewer", desc: "Akses baca ke seluruh intelijen: domain, entitas, graph, influence, event, foresight, markets." },
  { icon: "pencil", role: "Analyst", desc: "Semua akses Viewer + menulis: generate Intelligence Brief, resolve prediksi, jalankan Ingestion." },
  { icon: "shield", role: "Admin", desc: "Semua akses Analyst + manajemen pengguna & peran." },
];

function RequiresBadge({ requires }: { requires?: NavItem["requires"] }) {
  if (!requires) return null;
  const label = requires === "admin" ? "Admin" : "Login";
  return <span className="ml-auto shrink-0 text-[10px] font-mono uppercase tracking-wider text-amber-600 border border-amber-500/30 rounded px-1.5 py-0.5">{label}</span>;
}

export default function GuidePage() {
  return (
    <div>
      <PageHeader
        layer="Panduan"
        icon="book-open"
        title="Panduan Penggunaan"
        subtitle="Cara membaca dan menggunakan Global Strategic Intelligence Platform — dari konsep berlapis, peta fitur tiap halaman, gestur interaksi, hingga peran akses."
      />

      <div className="px-6 md:px-10 pb-24 space-y-12 max-w-6xl">
        {/* jump nav */}
        <div className="flex flex-wrap gap-2">
          {[["#konsep", "Konsep inti"], ["#fitur", "Peta fitur"], ["#gestur", "Gestur & interaksi"], ["#peran", "Peran & akses"]].map(([href, label]) => (
            <a key={href} href={href} className="text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--border)] hover:bg-[var(--surface)] hover:border-emerald-500/40 transition-colors">
              {label}
            </a>
          ))}
        </div>

        {/* konsep */}
        <section id="konsep" className="scroll-mt-24 space-y-4">
          <div>
            <span className="eyebrow">Konsep inti</span>
            <h2 className="display text-2xl font-semibold tracking-tight mt-3">Model intelijen berlapis</h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">
              GSIP menyusun dunia dari yang paling stabil ke paling dinamis: <span className="text-foreground">Domain → Entity → Event → Foresight</span>. Tiap layer memberi konteks bagi layer di atasnya.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LAYERS.map((l, i) => (
              <div key={l.name} className="card p-5 relative">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-accent mb-3">
                  <Icon name={l.icon} size={19} />
                </div>
                <div className="text-[11px] font-mono text-[var(--muted)]">{String(i + 1).padStart(2, "0")}</div>
                <div className="font-medium mt-0.5">{l.name}</div>
                <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">{l.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* fitur — synced with real navigation */}
        <section id="fitur" className="scroll-mt-24 space-y-6">
          <div>
            <span className="eyebrow">Peta fitur</span>
            <h2 className="display text-2xl font-semibold tracking-tight mt-3">Setiap halaman, singkatnya</h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">Mengikuti struktur menu di sidebar. Badge menandai halaman yang butuh login atau hak admin.</p>
          </div>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.title ?? `g${gi}`}>
              <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">{group.title ?? "Umum"}</div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((item) => {
                  const g = GUIDE[item.href];
                  return (
                    <div key={item.href} className="card p-4 flex gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-[var(--surface-2)] grid place-items-center text-accent">
                        <Icon name={item.icon} size={17} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-[10px] font-mono text-[var(--muted)]/60">{item.href}</span>
                          <RequiresBadge requires={item.requires} />
                        </div>
                        <p className="text-[13px] text-[var(--muted)] mt-1 leading-relaxed">{g?.what ?? "—"}</p>
                        {g?.how && (
                          <p className="text-[12px] text-[var(--muted)]/80 mt-1.5 flex gap-1.5">
                            <Icon name="mouse-pointer-click" size={13} className="mt-0.5 shrink-0 text-accent" />
                            <span>{g.how}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {/* gestur */}
        <section id="gestur" className="scroll-mt-24 space-y-4">
          <div>
            <span className="eyebrow">Gestur & interaksi</span>
            <h2 className="display text-2xl font-semibold tracking-tight mt-3">Cara berinteraksi</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GESTURES.map((g) => (
              <div key={g.title} className="card p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-accent">
                    <Icon name={g.icon} size={17} />
                  </span>
                  <span className="font-medium text-sm">{g.title}</span>
                </div>
                <ul className="space-y-1.5">
                  {g.items.map((it) => (
                    <li key={it} className="text-[13px] text-[var(--muted)] flex gap-2 leading-snug">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" /> {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* peran */}
        <section id="peran" className="scroll-mt-24 space-y-4">
          <div>
            <span className="eyebrow">Peran & akses</span>
            <h2 className="display text-2xl font-semibold tracking-tight mt-3">Siapa bisa apa</h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">Akses bertingkat. Sebagian besar halaman bersifat baca untuk semua; menulis & mengelola dibatasi.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.role} className="card p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-accent">
                    <Icon name={r.icon} size={17} />
                  </span>
                  <span className="font-medium">{r.role}</span>
                </div>
                <p className="text-[13px] text-[var(--muted)] leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
