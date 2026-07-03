"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { EntityProfileModal } from "@/components/influence/EntityProfileModal";

export type PosRow = {
  name: string;
  slug: string;
  influence: number;
  scale: number;
  integration: number;
  icon: string | null;
  category: string | null;
};

const CAT_COLOR: Record<string, string> = {
  geo: "#38bdf8", org: "#a78bfa", tech: "#34d399", market: "#fbbf24",
  asset: "#fb7185", norm: "#e879f9", program: "#22d3ee", person: "#f472b6",
};
const color = (c: string | null) => (c && CAT_COLOR[c]) || "#94a3b8";

const W = 640, H = 520, m = 44, T = 50; // threshold 50

export function PositioningScatter({ rows }: { rows: PosRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);

  const px = (integ: number) => m + (integ / 100) * (W - 2 * m);
  const py = (scale: number) => m + (1 - scale / 100) * (H - 2 * m);

  const isolated = useMemo(() => rows.filter((r) => r.scale >= 60 && r.integration < 40).sort((a, b) => b.scale - a.scale), [rows]);
  const hubs = useMemo(() => rows.filter((r) => r.integration >= 60 && r.scale < 60).sort((a, b) => b.integration - a.integration), [rows]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* scatter */}
        <div className="card p-5">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Scale vs Integration positioning">
            {/* quadrant fills */}
            <rect x={px(T)} y={m} width={px(100) - px(T)} height={py(T) - m} fill="rgba(52,211,153,0.05)" />
            <rect x={m} y={m} width={px(T) - m} height={py(T) - m} fill="rgba(251,113,133,0.05)" />
            {/* threshold lines */}
            <line x1={px(T)} y1={m} x2={px(T)} y2={H - m} stroke="var(--border)" strokeDasharray="4 4" />
            <line x1={m} y1={py(T)} x2={W - m} y2={py(T)} stroke="var(--border)" strokeDasharray="4 4" />
            {/* axes */}
            <line x1={m} y1={m} x2={m} y2={H - m} stroke="var(--border)" />
            <line x1={m} y1={H - m} x2={W - m} y2={H - m} stroke="var(--border)" />
            {/* axis labels */}
            <text x={W - m} y={H - m + 28} textAnchor="end" fontSize="12" fill="var(--muted)">Integrasi (keterjalinan) →</text>
            <text x={m - 8} y={m + 2} textAnchor="end" fontSize="12" fill="var(--muted)" transform={`rotate(-90 ${m - 30} ${m + (H - 2 * m) / 2})`} style={{ transformOrigin: "0 0" }}>Skala (ukuran) ↑</text>
            {/* quadrant captions */}
            <text x={px(T) + 10} y={m + 16} fontSize="11" fill="var(--muted)" opacity={0.85}>Kekuatan Terjalin</text>
            <text x={m + 10} y={m + 16} fontSize="11" fill="#e11d48" opacity={0.85}>Besar tapi Terisolasi</text>
            <text x={px(T) + 10} y={H - m - 8} fontSize="11" fill="var(--muted)" opacity={0.85}>Hub Terjalin</text>
            <text x={m + 10} y={H - m - 8} fontSize="11" fill="var(--muted)" opacity={0.7}>Perifer</text>

            {/* points */}
            {rows.map((r) => {
              const c = color(r.category);
              const rad = 4 + (r.influence / 100) * 6;
              return (
                <g key={r.slug}
                   onMouseEnter={() => setHover({ x: px(r.integration), y: py(r.scale), label: r.name })}
                   onMouseLeave={() => setHover(null)}
                   onClick={() => setOpen(r.slug)}
                   style={{ cursor: "pointer" }}>
                  <circle cx={px(r.integration)} cy={py(r.scale)} r={rad} fill={c} fillOpacity="0.85" stroke="white" strokeWidth="1" />
                </g>
              );
            })}

            {hover && (
              <g pointerEvents="none">
                <rect x={Math.min(hover.x + 8, W - 150)} y={Math.max(hover.y - 24, 2)} width="144" height="20" rx="5" fill="var(--panel)" stroke="var(--border)" />
                <text x={Math.min(hover.x + 14, W - 144)} y={Math.max(hover.y - 10, 16)} fontSize="11" fill="var(--foreground)" className="font-mono">
                  {hover.label.length > 22 ? hover.label.slice(0, 21) + "…" : hover.label}
                </text>
              </g>
            )}
          </svg>
          <p className="text-[11px] text-[var(--muted)] mt-2">
            Ukuran titik ∝ skor influence. Skala = ukuran/bobot; Integrasi = keterjalinan dalam graf (relasi + peristiwa). Klik untuk profil.
          </p>
        </div>

        {/* callouts */}
        <div className="space-y-4">
          <CalloutList
            title="Besar tapi Terisolasi"
            hint="Skala tinggi, integrasi rendah — arketipe 'scale without integration' McKinsey."
            color="#f43f5e" icon="unlink"
            items={isolated} metric={(r) => r.scale} onOpen={setOpen}
          />
          <CalloutList
            title="Hub Terjalin"
            hint="Integrasi tinggi meski skala lebih kecil — simpul penghubung sistem."
            color="#38bdf8" icon="waypoints"
            items={hubs} metric={(r) => r.integration} onOpen={setOpen}
          />
        </div>
      </div>

      {open && <EntityProfileModal slug={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function CalloutList({ title, hint, color, icon, items, metric, onOpen }: {
  title: string; hint: string; color: string; icon: string;
  items: PosRow[]; metric: (r: PosRow) => number; onOpen: (slug: string) => void;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest mb-1" style={{ color }}>
        <Icon name={icon} size={14} /> {title}
      </div>
      <p className="text-[11px] text-[var(--muted)] mb-3 leading-snug">{hint}</p>
      {items.length === 0 ? (
        <p className="text-[11px] text-[var(--muted)]">—</p>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 6).map((r) => (
            <button key={r.slug} onClick={() => onOpen(r.slug)}
              className="w-full text-left flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--surface)] transition-colors cursor-pointer">
              <Icon name={r.icon} size={13} className="text-accent shrink-0" />
              <span className="text-sm flex-1 min-w-0 truncate">{r.name}</span>
              <span className="font-mono text-xs tabular-nums shrink-0" style={{ color }}>{metric(r)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
