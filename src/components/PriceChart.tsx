import type { HistPoint } from "@/lib/quotes";

// Dependency-free area+line chart. viewBox is stretched to the container
// (preserveAspectRatio=none) with non-scaling strokes so lines stay crisp.
export function PriceChart({ points }: { points: HistPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="h-40 grid place-items-center text-xs text-[var(--muted)]">
        Data harga tidak tersedia.
      </div>
    );
  }

  const W = 100;
  const H = 40;
  const PAD = 2;
  const cs = points.map((p) => p.c);
  const min = Math.min(...cs);
  const max = Math.max(...cs);
  const span = max - min || 1;
  const n = points.length;

  const x = (i: number) => (i / (n - 1)) * W;
  const y = (c: number) => H - PAD - ((c - min) / span) * (H - PAD * 2);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p.c).toFixed(2)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  const up = points[n - 1].c >= points[0].c;
  const stroke = up ? "#16a34a" : "#e11d48";
  const gid = `pc-${up ? "up" : "down"}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-40">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
