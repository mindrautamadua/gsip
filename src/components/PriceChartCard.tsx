"use client";

import { useState } from "react";
import { PriceChart } from "./PriceChart";
import type { HistPoint, Range } from "@/lib/quotes";

const RANGES: { key: Range; label: string }[] = [
  { key: "1mo", label: "1M" },
  { key: "6mo", label: "6M" },
  { key: "1y", label: "1Y" },
];

export function PriceChartCard({
  ticker,
  initial,
  initialRange = "6mo",
}: {
  ticker: string;
  initial: HistPoint[];
  initialRange?: Range;
}) {
  const [range, setRange] = useState<Range>(initialRange);
  const [points, setPoints] = useState<HistPoint[]>(initial);
  const [loading, setLoading] = useState(false);
  const cache = useState<Record<string, HistPoint[]>>(() => ({ [initialRange]: initial }))[0];

  async function pick(next: Range) {
    if (next === range) return;
    setRange(next);
    if (cache[next]) {
      setPoints(cache[next]);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/history?symbol=${encodeURIComponent(ticker)}&range=${next}`);
      const j = await r.json();
      const pts: HistPoint[] = j.points ?? [];
      cache[next] = pts;
      setPoints(pts);
    } catch {
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => pick(r.key)}
              aria-pressed={range === r.key}
              className={`px-3 py-1 text-xs font-mono rounded-full cursor-pointer transition-colors duration-200 ${
                range === r.key
                  ? "bg-emerald-500/15 text-accent"
                  : "text-[var(--muted)] hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className={loading ? "opacity-40 transition-opacity" : "transition-opacity"}>
        <PriceChart points={points} />
      </div>
    </div>
  );
}
