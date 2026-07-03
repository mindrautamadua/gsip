"use client";

import { useEffect, useRef, useState } from "react";

const TONE: Record<string, string> = {
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
};

// Circular gauge — arc sweeps to the score when it enters the viewport.
export function ScoreGauge({
  label,
  value,
  max = 5,
  tone = "emerald",
  decimals = 1,
}: {
  label: string;
  value: number;
  max?: number;
  tone?: keyof typeof TONE;
  decimals?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setArmed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setArmed(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const R = 34;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, value / max));
  const color = TONE[tone];

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
          <circle cx="42" cy="42" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
          <circle
            cx="42"
            cy="42"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={armed ? C * (1 - frac) : C}
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1) 0.15s" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="display text-xl font-semibold tabular-nums">{value.toFixed(decimals)}</span>
        </div>
      </div>
      <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">{label}</span>
    </div>
  );
}
