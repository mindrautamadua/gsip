import { Icon } from "@/components/Icon";

const FEATURES = [
  { icon: "layers", title: "Model 5-Lapis", desc: "Domain → Entity → Event → Analysis → Action" },
  { icon: "waypoints", title: "Knowledge Graph", desc: "Relasi + skor pengaruh objektif" },
  { icon: "network", title: "Taksonomi GICS", desc: "Standar klasifikasi kelas dunia" },
];

const DOTS = [
  { x: 250, y: 60, d: "0s" }, { x: 400, y: 180, d: "0.6s" }, { x: 150, y: 200, d: "1.2s" },
  { x: 330, y: 340, d: "0.9s" }, { x: 110, y: 360, d: "1.5s" }, { x: 420, y: 300, d: "0.3s" },
  { x: 210, y: 430, d: "1.1s" },
];

export function LoginHero() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16 text-white bg-[#04140d]">
      {/* ambient glows */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(50rem 40rem at 80% 10%, rgba(52,211,153,0.16), transparent 60%), radial-gradient(40rem 30rem at 10% 90%, rgba(245,158,11,0.10), transparent 60%)",
        }}
      />

      {/* radar */}
      <svg
        aria-hidden
        viewBox="0 0 500 500"
        className="absolute -right-24 top-1/2 -translate-y-1/2 h-[42rem] w-[42rem] opacity-50"
      >
        <defs>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[80, 155, 230].map((r) => (
          <circle key={r} cx="250" cy="250" r={r} fill="none" stroke="rgba(52,211,153,0.22)" strokeWidth="1" />
        ))}
        <line x1="20" y1="250" x2="480" y2="250" stroke="rgba(52,211,153,0.14)" strokeWidth="1" />
        <line x1="250" y1="20" x2="250" y2="480" stroke="rgba(52,211,153,0.14)" strokeWidth="1" />
        {/* rotating sweep */}
        <g style={{ transformOrigin: "250px 250px", animation: "gsip-radar 8s linear infinite" }}>
          <path d="M250,250 L250,20 A230,230 0 0 1 452,140 Z" fill="url(#sweep)" />
          <line x1="250" y1="250" x2="250" y2="20" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.8" />
        </g>
        {/* blips */}
        {DOTS.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.2" fill="#6ee7b7"
            style={{ animation: `gsip-breathe 3s ease-in-out ${p.d} infinite` }} />
        ))}
      </svg>

      {/* brand */}
      <div className="relative flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-300 via-green-400 to-emerald-600 grid place-items-center text-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
          <Icon name="satellite" size={22} strokeWidth={1.6} />
        </div>
        <div>
          <div className="display font-semibold tracking-tight text-lg leading-none">GSIP</div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-200/70 mt-1.5">
            Strategic Intelligence
          </div>
        </div>
      </div>

      {/* headline + features */}
      <div className="relative max-w-md" style={{ animation: "gsip-rise 0.8s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Global Strategic Intelligence OS
        </div>
        <h2 className="display text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.05]">
          Radar strategis untuk dunia yang bergeser.
        </h2>
        <p className="text-emerald-100/70 mt-4 leading-relaxed">
          Dari sinyal mentah menjadi keputusan — negara, perusahaan, komoditas, dan tokoh di baliknya,
          dalam satu peta intelijen.
        </p>

        <div className="mt-9 space-y-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-3.5">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-emerald-300">
                <Icon name={f.icon} size={18} />
              </div>
              <div>
                <div className="text-sm font-medium">{f.title}</div>
                <div className="text-xs text-emerald-100/55">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <div className="relative flex items-center gap-6 text-[11px] text-emerald-100/45 font-mono">
        <span>© 2026 GSIP</span>
        <span className="inline-flex items-center gap-1.5"><Icon name="lock" size={12} /> Akses terklasifikasi</span>
      </div>
    </div>
  );
}
