"use client";

import { useMemo, useState } from "react";

export type AssetPt = { name: string; slug: string; kind: string; country: string | null; lat: number; lng: number };
export type ChokePt = { name: string; slug: string; lat: number; lng: number };
export type Link = { from: string; to: string };

const KIND_COLOR: Record<string, string> = {
  port: "#0ea5e9",
  base: "#f43f5e",
  mine: "#f59e0b",
  industrial_park: "#8b5cf6",
  rail: "#14b8a6",
};
const KIND_LABEL: Record<string, string> = {
  port: "Pelabuhan",
  base: "Pangkalan",
  mine: "Tambang",
  industrial_park: "Kawasan Industri",
  rail: "Rel",
};

const W = 960;
const H = 480;
const project = (lat: number, lng: number) => ({ x: ((lng + 180) / 360) * W, y: ((90 - lat) / 180) * H });
const CN = project(36, 116.4); // Beijing — BRI origin hub

const LABELS = [
  { t: "NORTH AMERICA", lat: 46, lng: -100 },
  { t: "SOUTH AMERICA", lat: -18, lng: -62 },
  { t: "EUROPE", lat: 54, lng: 12 },
  { t: "AFRICA", lat: 2, lng: 20 },
  { t: "ASIA", lat: 48, lng: 95 },
  { t: "OCEANIA", lat: -27, lng: 140 },
];

export function WorldAssetMap({
  assets,
  chokepoints,
  links,
}: {
  assets: AssetPt[];
  chokepoints: ChokePt[];
  links: Link[];
}) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const aMap = useMemo(() => new Map(assets.map((a) => [a.slug, project(a.lat, a.lng)])), [assets]);
  const cMap = useMemo(() => new Map(chokepoints.map((c) => [c.slug, project(c.lat, c.lng)])), [chokepoints]);

  return (
    <div className="card p-5">
      <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">
        Peta Jejak Global — Aset & Kendali Jalur Laut
      </div>
      <svg viewBox={`0 18 ${W} 404`} className="w-full h-auto" role="img" aria-label="Peta aset China luar negeri & chokepoint">
        {/* graticule */}
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng) => {
          const p = project(0, lng);
          return <line key={`v${lng}`} x1={p.x} y1={18} x2={p.x} y2={422} stroke="var(--hairline)" strokeWidth="0.7" />;
        })}
        {[60, 30, 0, -30].map((lat) => {
          const p = project(lat, 0);
          return <line key={`h${lat}`} x1={0} y1={p.y} x2={W} y2={p.y} stroke="var(--hairline)" strokeWidth="0.7" />;
        })}
        {LABELS.map((l) => {
          const p = project(l.lat, l.lng);
          return (
            <text key={l.t} x={p.x} y={p.y} textAnchor="middle" fontSize="11" className="font-mono"
              fill="var(--muted)" opacity="0.35" style={{ letterSpacing: "0.15em" }}>
              {l.t}
            </text>
          );
        })}

        {/* BRI outbound arcs: China -> each asset */}
        {assets.map((a) => {
          const p = aMap.get(a.slug)!;
          const mx = (CN.x + p.x) / 2;
          const my = (CN.y + p.y) / 2 - Math.hypot(p.x - CN.x, p.y - CN.y) * 0.16;
          return (
            <path key={`bri-${a.slug}`} d={`M ${CN.x} ${CN.y} Q ${mx} ${my} ${p.x} ${p.y}`}
              fill="none" stroke="#34d399" strokeWidth="0.8" opacity="0.22" />
          );
        })}

        {/* sea-lane control arcs: asset -> chokepoint */}
        {links.map((l, i) => {
          const a = aMap.get(l.from);
          const c = cMap.get(l.to);
          if (!a || !c) return null;
          const mx = (a.x + c.x) / 2;
          const my = (a.y + c.y) / 2 - Math.hypot(c.x - a.x, c.y - a.y) * 0.18;
          return (
            <path key={i} d={`M ${a.x} ${a.y} Q ${mx} ${my} ${c.x} ${c.y}`} fill="none"
              stroke="#f59e0b" strokeWidth="1.3" strokeDasharray="4 3" opacity="0.75" />
          );
        })}

        {/* chokepoints (amber diamonds) */}
        {chokepoints.map((c) => {
          const p = project(c.lat, c.lng);
          return (
            <g key={c.slug} onMouseEnter={() => setHover({ x: p.x, y: p.y, label: `⚓ Chokepoint · ${c.name}` })} onMouseLeave={() => setHover(null)}>
              <rect x={p.x - 4.5} y={p.y - 4.5} width="9" height="9" transform={`rotate(45 ${p.x} ${p.y})`}
                fill="#f59e0b" fillOpacity="0.25" stroke="#f59e0b" strokeWidth="1.3" />
            </g>
          );
        })}

        {/* assets (colored by kind) */}
        {assets.map((a) => {
          const p = aMap.get(a.slug)!;
          const color = KIND_COLOR[a.kind] ?? "#94a3b8";
          return (
            <g key={a.slug} style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover({ x: p.x, y: p.y, label: `${a.name}${a.country ? ` · ${a.country}` : ""}` })}
              onMouseLeave={() => setHover(null)}>
              <circle cx={p.x} cy={p.y} r="4.5" fill={color} fillOpacity="0.9" stroke="white" strokeWidth="1" />
            </g>
          );
        })}

        {/* China origin hub */}
        <g onMouseEnter={() => setHover({ x: CN.x, y: CN.y, label: "China — pusat Belt & Road" })} onMouseLeave={() => setHover(null)}>
          <circle cx={CN.x} cy={CN.y} r="7" fill="#34d399" fillOpacity="0.2" stroke="#34d399" strokeWidth="1.6" />
          <circle cx={CN.x} cy={CN.y} r="2.6" fill="#34d399" />
        </g>

        {hover && (
          <g pointerEvents="none">
            <rect x={Math.min(hover.x + 8, W - 236)} y={Math.max(hover.y - 26, 20)} width="230" height="22" rx="5" fill="var(--panel)" stroke="var(--border)" />
            <text x={Math.min(hover.x + 14, W - 230)} y={Math.max(hover.y - 11, 35)} fontSize="11" fill="var(--foreground)" className="font-mono">
              {hover.label.length > 44 ? hover.label.slice(0, 43) + "…" : hover.label}
            </text>
          </g>
        )}
      </svg>

      {/* legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[11px] text-[var(--muted)]">
        {Object.entries(KIND_LABEL).map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} /> {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rotate-45 border border-amber-500 bg-amber-500/25" /> Chokepoint
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-amber-500" /> kendali jalur
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> China (asal)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-emerald-500/40" /> jalur BRI
        </span>
      </div>
      <p className="text-[11px] text-[var(--muted)]/70 mt-2">
        Titik = aset China; berlian = chokepoint; garis putus-putus = aset yang memposisikan kendali atas jalur laut. Proyeksi equirectangular, posisi perkiraan.
      </p>
    </div>
  );
}
