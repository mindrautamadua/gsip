import Link from "next/link";

export type MatrixPoint = {
  id: string;
  title: string;
  impact: number; // 1-5
  risk: number; // 1-5
  importance: number;
};

const QUADRANTS = [
  { label: "Pantau Ketat", pos: "top-3 left-4" },
  { label: "Mitigasi Segera", pos: "top-3 right-4" },
  { label: "Arsip Sinyal", pos: "bottom-3 left-4" },
  { label: "Manfaatkan", pos: "bottom-3 right-4" },
];

function dotColor(p: MatrixPoint): string {
  if (p.risk >= 4 && p.impact >= 4) return "bg-rose-500";
  if (p.risk >= 4) return "bg-orange-500";
  if (p.impact >= 4) return "bg-amber-500";
  return "bg-emerald-500";
}

// Impact (x) × Risk (y) scatter. Dots pop in staggered via the parent
// <Reveal> (`.reveal.in .rm-dot` in globals.css); critical ones get a sonar ring.
export function RiskMatrix({ points }: { points: MatrixPoint[] }) {
  return (
    <div className="relative h-80 md:h-96 rounded-xl border border-[var(--hairline)] bg-[var(--surface)] overflow-hidden">
      {/* quadrant grid */}
      <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--hairline)]" />
      <div aria-hidden className="absolute inset-y-0 left-1/2 border-l border-dashed border-[var(--hairline)]" />
      {QUADRANTS.map((q) => (
        <span
          key={q.label}
          className={`absolute ${q.pos} text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--muted)]/60 select-none`}
        >
          {q.label}
        </span>
      ))}
      {/* axis labels */}
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-mono text-[var(--muted)]/70 select-none">
        IMPACT →
      </span>
      <span className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[10px] font-mono text-[var(--muted)]/70 select-none">
        RISK →
      </span>

      {points.map((p, i) => {
        // deterministic jitter so co-located events stay distinguishable
        const jx = ((i * 37) % 11 - 5) * 0.55;
        const jy = ((i * 53) % 11 - 5) * 0.55;
        const left = ((p.impact - 0.5) / 5) * 100 + jx;
        const bottom = ((p.risk - 0.5) / 5) * 100 + jy;
        const size = 10 + p.importance * 2.4;
        const critical = p.risk >= 4 && p.impact >= 4;
        return (
          <Link
            key={p.id}
            href={`/events/${p.id}`}
            title={`${p.title} — impact ${p.impact}, risk ${p.risk}`}
            className="rm-dot group absolute grid place-items-center rounded-full cursor-pointer"
            style={{
              left: `${left}%`,
              bottom: `${bottom}%`,
              width: size,
              height: size,
              animationDelay: `${120 + i * 90}ms`,
            }}
          >
            {critical && (
              <span aria-hidden className={`pulse-ring absolute inset-0 rounded-full ${dotColor(p)} opacity-30`} />
            )}
            <span
              className={`absolute inset-0 rounded-full ${dotColor(p)} shadow-[0_0_12px_-2px_currentColor] transition-transform duration-300 group-hover:scale-125`}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs leading-snug shadow-lg opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 z-10">
              {p.title}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
