// Pure-SVG sparkline (no client JS). Colors by net direction over the window.
export function Sparkline({
  data,
  width = 120,
  height = 36,
  up,
}: {
  data: number[];
  width?: number;
  height?: number;
  up: boolean;
}) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="grid place-items-center text-[10px] text-[var(--muted)]">—</div>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const pts = data.map((v, i) => `${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${width},${height} L 0,${height} Z`;
  const color = up ? "#10b981" : "#f43f5e";
  const gid = `spark-${up ? "u" : "d"}-${data.length}-${Math.round(min)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(data.length - 1) * stepX} cy={y(data[data.length - 1])} r="2" fill={color} />
    </svg>
  );
}
