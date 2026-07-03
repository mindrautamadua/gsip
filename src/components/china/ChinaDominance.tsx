"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { CHINA_RINGS } from "@/lib/china-geo";
import { EntityProfileModal } from "@/components/influence/EntityProfileModal";

export type Cluster = { city: string; province: string; lat: number; lng: number; note: string | null };
export type Industry = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  global_share: number | null;
  rank_note: string | null;
  description: string | null;
  clusters: Cluster[];
  gics_code: string | null;
  gics_industry: string | null;
  gics_sector: string | null;
  entity_slug?: string | null;
  entity_name?: string | null;
  entity_icon?: string | null;
};

const PALETTE = ["#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#8b5cf6", "#14b8a6", "#eab308"];

function shareColor(v: number): string {
  if (v >= 80) return "text-rose-600";
  if (v >= 60) return "text-orange-600";
  if (v >= 45) return "text-amber-600";
  return "text-emerald-600";
}

// Equirectangular projection with cos(lat) correction, fitted to the real
// China boundary extent so the outline and cluster points share one transform.
function useGeo() {
  return useMemo(() => {
    const cosLat = Math.cos(35.5 * (Math.PI / 180));
    const pts = CHINA_RINGS.flat();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [lng, lat] of pts) {
      const x = lng * cosLat, y = -lat;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const pad = 14;
    const W = 640;
    const scale = (W - 2 * pad) / (maxX - minX);
    const H = (maxY - minY) * scale + 2 * pad;
    const project = (lat: number, lng: number) => ({
      x: (lng * cosLat - minX) * scale + pad,
      y: (-lat - minY) * scale + pad,
    });
    const paths = CHINA_RINGS.map(
      (r) => "M " + r.map(([lng, lat]) => { const p = project(lat, lng); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" L ") + " Z"
    );
    return { W, H, project, paths };
  }, []);
}

export function ChinaDominance({ industries }: { industries: Industry[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const geo = useGeo();

  const points = useMemo(
    () =>
      industries.flatMap((ind, idx) =>
        ind.clusters.map((c) => ({
          ...geo.project(c.lat, c.lng),
          color: PALETTE[idx % PALETTE.length],
          slug: ind.slug,
          label: `${c.city} · ${ind.name}${c.note ? ` (${c.note})` : ""}`,
          share: ind.global_share ?? 0,
        }))
      ),
    [industries, geo]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ===== MAP ===== */}
      <div className="card p-5">
        <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">
          Peta Klaster Industri China
        </div>
        <svg viewBox={`0 0 ${geo.W} ${geo.H}`} className="w-full h-auto" role="img" aria-label="Peta klaster industri China">
          {/* graticule */}
          {[80, 90, 100, 110, 120, 130].map((lng) => {
            const p = geo.project(35, lng);
            return <line key={`v${lng}`} x1={p.x} y1={0} x2={p.x} y2={geo.H} stroke="var(--hairline)" strokeWidth="0.8" />;
          })}
          {[20, 30, 40, 50].map((lat) => {
            const p = geo.project(lat, 100);
            return <line key={`h${lat}`} x1={0} y1={p.y} x2={geo.W} y2={p.y} stroke="var(--hairline)" strokeWidth="0.8" />;
          })}
          {/* precise landmass */}
          {geo.paths.map((d, i) => (
            <path key={i} d={d} fill="rgba(52,211,153,0.07)" stroke="rgba(52,211,153,0.45)" strokeWidth="1.2" strokeLinejoin="round" />
          ))}

          {/* cluster points */}
          {points.map((pt, i) => {
            const dim = selected && pt.slug !== selected;
            const active = selected && pt.slug === selected;
            const r = 3.5 + (pt.share / 100) * 6;
            return (
              <g key={i} opacity={dim ? 0.15 : 1} style={{ transition: "opacity 0.25s" }}
                 onMouseEnter={() => setHover({ x: pt.x, y: pt.y, label: pt.label })}
                 onMouseLeave={() => setHover(null)}>
                {active && <circle cx={pt.x} cy={pt.y} r={r + 6} fill="none" stroke={pt.color} strokeWidth="1" opacity="0.5" />}
                <circle cx={pt.x} cy={pt.y} r={r} fill={pt.color} fillOpacity="0.9" stroke="white" strokeWidth="1" />
              </g>
            );
          })}

          {hover && (
            <g pointerEvents="none">
              <rect x={Math.min(hover.x + 8, geo.W - 214)} y={Math.max(hover.y - 26, 2)} width="208" height="22" rx="5" fill="var(--panel)" stroke="var(--border)" />
              <text x={Math.min(hover.x + 14, geo.W - 208)} y={Math.max(hover.y - 11, 17)} fontSize="11" fill="var(--foreground)" className="font-mono">
                {hover.label.length > 42 ? hover.label.slice(0, 41) + "…" : hover.label}
              </text>
            </g>
          )}
        </svg>
        <p className="text-[11px] text-[var(--muted)] mt-2">
          Ukuran titik ∝ pangsa global. Klik industri di kanan untuk menyorot klasternya.
        </p>
      </div>

      {/* ===== INDUSTRY LIST ===== */}
      <div className="space-y-2.5">
        {industries.map((ind) => {
          const on = selected === ind.slug;
          return (
            <div
              key={ind.id}
              className={`card p-4 transition-colors ${on ? "border-emerald-500/50 bg-emerald-500/[0.04]" : "hover:border-emerald-500/30"}`}
            >
              <button onClick={() => setSelected(on ? null : ind.slug)} className="w-full text-left cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 shrink-0 rounded-xl bg-[var(--surface-2)] grid place-items-center text-accent">
                    <Icon name={ind.icon} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm leading-snug truncate">{ind.name}</div>
                    {ind.rank_note && <div className="text-[11px] text-[var(--muted)] truncate">{ind.rank_note}</div>}
                  </div>
                  {ind.global_share != null && (
                    <span className={`display text-xl font-semibold tabular-nums ${shareColor(ind.global_share)}`}>
                      {ind.global_share}<span className="text-xs">%</span>
                    </span>
                  )}
                </div>
              </button>

              {/* classification + graph cross-links */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {ind.gics_industry && (
                  <Link
                    href="/taxonomy"
                    className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/25 bg-sky-500/[0.06] px-2.5 py-1 text-[11px] text-sky-700 hover:border-sky-500/50 transition-colors"
                    title={`GICS ${ind.gics_code} · ${ind.gics_sector}`}
                  >
                    <Icon name="network" size={11} />
                    GICS · {ind.gics_industry}
                    <span className="text-sky-700/60">· {ind.gics_sector}</span>
                  </Link>
                )}
                {ind.entity_slug && (
                  <button
                    onClick={() => setCompany(ind.entity_slug!)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.06] px-2.5 py-1 text-[11px] text-emerald-700 hover:border-emerald-500/50 transition-colors cursor-pointer"
                    title="Lihat profil perusahaan"
                  >
                    <Icon name={ind.entity_icon ?? "building-2"} size={11} />
                    {ind.entity_name ?? "Perusahaan"}
                  </button>
                )}
              </div>

              {on && (
                <div className="mt-3 pt-3 border-t border-[var(--hairline-soft)] space-y-2">
                  {ind.description && <p className="text-xs text-[var(--muted)] leading-relaxed">{ind.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {ind.clusters.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px]">
                        <Icon name="map-pin" size={11} className="text-accent" />
                        <span className="font-medium">{c.city}</span>
                        <span className="text-[var(--muted)]">· {c.province}</span>
                        {c.note && <span className="text-[var(--muted)]/70">· {c.note}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {company && <EntityProfileModal slug={company} onClose={() => setCompany(null)} />}
    </div>
  );
}
