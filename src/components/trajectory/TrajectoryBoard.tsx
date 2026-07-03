"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";

export type Point = { y: number; v: number };
export type Series = {
  slug: string;
  label: string;
  category: string;
  unit: string | null;
  note: string | null;
  source: string | null;
  points: Point[];
};

function compact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1000) return (v / 1000).toFixed(a >= 10000 ? 0 : 1) + "k";
  if (a < 10 && !Number.isInteger(v)) return v.toFixed(1);
  return String(Math.round(v));
}

function stats(s: Series) {
  const pts = [...s.points].sort((a, b) => a.y - b.y);
  const first = pts[0], last = pts[pts.length - 1];
  const ratio = first.v !== 0 ? last.v / first.v : 1;
  const deltaPP = last.v - first.v;
  const momentum = Math.abs(Math.log(ratio || 1));
  const dir: "up" | "down" | "flat" = ratio > 1.02 ? "up" : ratio < 0.98 ? "down" : "flat";
  return { pts, first, last, ratio, deltaPP, momentum, dir };
}

const DIR_COLOR = { up: "#f59e0b", down: "#38bdf8", flat: "var(--muted)" };
const DIR_ICON = { up: "trending-up", down: "trending-down", flat: "minus" };

function Sparkline({ pts, w = 120, h = 34, color = "var(--accent)" }: { pts: Point[]; w?: number; h?: number; color?: string }) {
  const xs = pts.map((p) => p.y), vs = pts.map((p) => p.v);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const vMin = Math.min(...vs), vMax = Math.max(...vs);
  const px = (y: number) => (xMax === xMin ? w / 2 : ((y - xMin) / (xMax - xMin)) * (w - 4) + 2);
  const py = (v: number) => (vMax === vMin ? h / 2 : h - 3 - ((v - vMin) / (vMax - vMin)) * (h - 6));
  const line = pts.map((p) => `${px(p.y).toFixed(1)},${py(p.v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={px(p.y)} cy={py(p.v)} r={i === pts.length - 1 ? 2.4 : 1.4} fill={color} />
      ))}
    </svg>
  );
}

function MomentumBadge({ s }: { s: ReturnType<typeof stats> }) {
  const c = DIR_COLOR[s.dir];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums"
      style={{ color: c, background: c === "var(--muted)" ? "var(--surface-2)" : c + "1a" }}>
      <Icon name={DIR_ICON[s.dir]} size={11} />
      ×{s.ratio.toFixed(s.ratio >= 10 ? 0 : 1)}
    </span>
  );
}

export function TrajectoryBoard({ series }: { series: Series[] }) {
  const [open, setOpen] = useState<Series | null>(null);

  const withStats = useMemo(() => series.map((s) => ({ s, st: stats(s) })), [series]);
  const topMovers = useMemo(() => [...withStats].sort((a, b) => b.st.momentum - a.st.momentum).slice(0, 4), [withStats]);
  const categories = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, typeof withStats>();
    for (const x of withStats) {
      if (!map.has(x.s.category)) { map.set(x.s.category, []); order.push(x.s.category); }
      map.get(x.s.category)!.push(x);
    }
    return order.map((c) => ({ category: c, items: map.get(c)! }));
  }, [withStats]);

  return (
    <div className="space-y-10">
      {/* top movers */}
      <section>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">
          <Icon name="flame" size={14} className="text-amber-500" /> Penggerak Tercepat — berdasarkan momentum
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topMovers.map(({ s, st }) => (
            <button key={s.slug} onClick={() => setOpen(s)}
              className="card p-4 text-left hover:border-emerald-500/30 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium leading-snug pr-1">{s.label}</div>
                <MomentumBadge s={st} />
              </div>
              <div className="mt-2"><Sparkline pts={st.pts} color={DIR_COLOR[st.dir]} /></div>
              <div className="flex items-end justify-between mt-1">
                <span className="display text-xl font-semibold tabular-nums">{compact(st.last.v)}<span className="text-xs text-[var(--muted)] ml-0.5">{s.unit}</span></span>
                <span className="text-[10px] font-mono text-[var(--muted)]/70">{st.first.y}→{st.last.y}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* grouped */}
      {categories.map((g) => (
        <section key={g.category}>
          <div className="mb-3 text-sm font-semibold">{g.category}</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map(({ s, st }) => (
              <button key={s.slug} onClick={() => setOpen(s)}
                className="card p-4 text-left hover:border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-sm font-medium leading-snug truncate">{s.label}</div>
                    {s.note && <Icon name="info" size={11} className="text-amber-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="display text-lg font-semibold tabular-nums">{compact(st.last.v)}<span className="text-[11px] text-[var(--muted)] ml-0.5">{s.unit}</span></span>
                    <MomentumBadge s={st} />
                  </div>
                </div>
                <div className="w-24 shrink-0"><Sparkline pts={st.pts} color={DIR_COLOR[st.dir]} /></div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {open && <TrajectoryModal series={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function TrajectoryModal({ series, onClose }: { series: Series; onClose: () => void }) {
  const st = stats(series);
  const cagr = (() => {
    const yrs = st.last.y - st.first.y;
    if (yrs <= 0 || st.first.v <= 0) return null;
    return (Math.pow(st.last.v / st.first.v, 1 / yrs) - 1) * 100;
  })();
  const W = 560, H = 240, ml = 44, mr = 20, mt = 20, mb = 34;
  const pw = W - ml - mr, ph = H - mt - mb;
  const xs = st.pts.map((p) => p.y), vs = st.pts.map((p) => p.v);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const vMin = Math.min(0, ...vs), vMax = Math.max(...vs);
  const px = (y: number) => (xMax === xMin ? ml + pw / 2 : ml + ((y - xMin) / (xMax - xMin)) * pw);
  const py = (v: number) => mt + (1 - (v - vMin) / (vMax - vMin || 1)) * ph;
  const line = st.pts.map((p) => `${px(p.y).toFixed(1)},${py(p.v).toFixed(1)}`).join(" ");
  const c = DIR_COLOR[st.dir];

  return (
    <div role="dialog" aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 backdrop-blur-sm p-4 sm:p-8">
      <div className="relative w-full max-w-2xl my-4 sm:my-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)] animate-[float-in_0.28s_cubic-bezier(0.16,1,0.3,1)]">
        <button onClick={onClose} aria-label="Tutup" className="absolute right-3 top-3 z-10 h-9 w-9 rounded-xl grid place-items-center text-[var(--muted)] bg-[var(--surface)] border border-[var(--hairline)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors">
          <Icon name="x" size={17} />
        </button>

        <div className="px-6 md:px-8 pt-8 pb-4 border-b border-[var(--hairline-soft)]">
          <span className="eyebrow">{series.category}</span>
          <h2 className="display text-2xl font-semibold tracking-tight mt-2">{series.label}</h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="display text-3xl font-semibold tabular-nums">{compact(st.last.v)}<span className="text-sm text-[var(--muted)] ml-1">{series.unit}</span></span>
            <MomentumBadge s={st} />
            {cagr != null && <span className="text-[11px] font-mono text-[var(--muted)]">CAGR {cagr >= 0 ? "+" : ""}{cagr.toFixed(1)}%/thn</span>}
            <span className="text-[11px] font-mono text-[var(--muted)]">{st.first.y}→{st.last.y}</span>
          </div>
        </div>

        <div className="px-6 md:px-8 py-6 space-y-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${series.label} time series`}>
            {[vMin, (vMin + vMax) / 2, vMax].map((t, i) => (
              <g key={i}>
                <line x1={ml} y1={py(t)} x2={ml + pw} y2={py(t)} stroke="var(--hairline)" strokeWidth="1" />
                <text x={ml - 8} y={py(t) + 3} textAnchor="end" fontSize="10" fill="var(--muted)" className="tabular-nums">{compact(t)}</text>
              </g>
            ))}
            {st.pts.map((p, i) => (
              <text key={i} x={px(p.y)} y={mt + ph + 22} textAnchor="middle" fontSize="10" fill="var(--muted)" className="font-mono">{p.y}</text>
            ))}
            <polyline points={line} fill="none" stroke={c} strokeWidth="2.5" strokeLinejoin="round" />
            {st.pts.map((p, i) => (
              <g key={i}>
                <circle cx={px(p.y)} cy={py(p.v)} r="4" fill={c} />
                <text x={px(p.y)} y={py(p.v) - 9} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--foreground)" className="tabular-nums">{compact(p.v)}</text>
              </g>
            ))}
          </svg>

          {series.note && (
            <div className="text-[11px] text-amber-700 flex items-start gap-1.5"><Icon name="alert-triangle" size={12} className="mt-0.5 shrink-0" /> {series.note}</div>
          )}
          <p className="text-xs text-[var(--muted)]">
            Arah: <span className="text-foreground">{st.dir === "up" ? "menanjak" : st.dir === "down" ? "menurun" : "datar"}</span> · perubahan {st.dir === "up" ? "+" : ""}{compact(st.deltaPP)} {series.unit} selama {st.last.y - st.first.y} tahun.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--muted)]/70">
            <Icon name="book-open" size={12} /> {series.source}
          </div>
        </div>
      </div>
    </div>
  );
}
