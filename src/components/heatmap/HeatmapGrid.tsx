"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export type HPoint = { id: string; title: string; x: number; y: number }; // x,y in 1..5

// Zone base color (RGB) by severity = x + y (2..10), per mode.
function baseRGB(mode: "risk" | "opportunity", x: number, y: number): string {
  const sev = x + y;
  if (mode === "risk") {
    if (sev >= 8) return "244,63,94"; // rose
    if (sev >= 6) return "249,115,22"; // orange
    if (sev >= 4) return "245,158,11"; // amber
    return "16,185,129"; // emerald (low)
  }
  if (sev >= 8) return "16,185,129"; // emerald (strong opp)
  if (sev >= 6) return "52,211,153";
  if (sev >= 4) return "132,204,22"; // lime
  return "148,163,184"; // muted
}

export function HeatmapGrid({
  points,
  mode,
  yLabel,
}: {
  points: HPoint[];
  mode: "risk" | "opportunity";
  yLabel: string;
}) {
  const [cell, setCell] = useState<{ x: number; y: number } | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    points.forEach((p) => m.set(`${p.x}-${p.y}`, (m.get(`${p.x}-${p.y}`) ?? 0) + 1));
    return m;
  }, [points]);
  const maxCount = Math.max(1, ...counts.values());

  const selected = cell ? points.filter((p) => p.x === cell.x && p.y === cell.y) : [];
  const cols = [1, 2, 3, 4, 5];
  const rowsY = [5, 4, 3, 2, 1];

  return (
    <div>
      <div className="flex gap-2">
        {/* y-axis label */}
        <div className="flex items-center">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--muted)]/70 -rotate-90 whitespace-nowrap">
            {yLabel} →
          </span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1.5">
            {rowsY.map((y) =>
              cols.map((x) => {
                const n = counts.get(`${x}-${y}`) ?? 0;
                const rgb = baseRGB(mode, x, y);
                const active = cell?.x === x && cell?.y === y;
                const alpha = n > 0 ? 0.22 + 0.6 * (n / maxCount) : 0.07;
                return (
                  <button
                    key={`${x}-${y}`}
                    onClick={() => setCell(active ? null : { x, y })}
                    aria-label={`impact ${x}, ${yLabel.toLowerCase()} ${y}: ${n} event`}
                    className={`aspect-square rounded-lg grid place-items-center text-sm font-mono font-semibold transition-all ${
                      n > 0 ? "cursor-pointer hover:brightness-110" : "cursor-default"
                    } ${active ? "ring-2 ring-accent" : ""}`}
                    style={{ background: `rgba(${rgb},${alpha})`, color: n > 0 ? "#fff" : "transparent" }}
                    disabled={n === 0}
                  >
                    {n > 0 ? n : ""}
                  </button>
                );
              })
            )}
          </div>
          {/* x-axis */}
          <div className="grid grid-cols-5 gap-1.5 mt-1">
            {cols.map((x) => (
              <div key={x} className="text-center text-[10px] font-mono text-[var(--muted)]/60">{x}</div>
            ))}
          </div>
          <div className="text-center text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--muted)]/70 mt-0.5">
            Impact →
          </div>
        </div>
      </div>

      {/* selected cell events */}
      <div className="mt-4">
        <div className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
          {cell ? `Impact ${cell.x} × ${yLabel} ${cell.y} — ${selected.length} event` : `Klik sel untuk lihat event`}
        </div>
        {selected.length > 0 && (
          <div className="space-y-1.5">
            {selected.map((p) => (
              <Link key={p.id} href={`/events/${p.id}`}
                className="flex items-center gap-2 rounded-lg p-2 hover:bg-[var(--surface)] transition-colors text-sm">
                <Icon name={mode === "risk" ? "alert-triangle" : "sparkles"} size={14}
                  className={mode === "risk" ? "text-rose-500 shrink-0" : "text-emerald-500 shrink-0"} />
                <span className="truncate">{p.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
