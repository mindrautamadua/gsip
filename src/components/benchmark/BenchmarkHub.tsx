"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export type BRow = {
  id: string;
  name: string;
  metric: number;
  sub?: string | null;
  flag?: string | null;
  logo?: string | null;
  logoFallback?: string | null;
  icon?: string | null;
  href?: string | null;
};
export type BTab = { key: string; label: string; icon: string; metricLabel: string; accent: string; rows: BRow[] };

function RowMedia({ row }: { row: BRow }) {
  const [idx, setIdx] = useState(0);
  const chain = [row.logo, row.logoFallback].filter((s): s is string => !!s);
  if (row.flag) return <span className="text-lg leading-none w-7 text-center shrink-0">{row.flag}</span>;
  const src = chain[idx];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={row.name} onError={() => setIdx((i) => i + 1)}
        className="h-7 w-7 shrink-0 rounded-md object-contain bg-white/60 border border-[var(--border)]" />
    );
  }
  return (
    <span className="h-7 w-7 shrink-0 rounded-md grid place-items-center bg-[var(--surface-2)] text-accent">
      <Icon name={row.icon} size={14} />
    </span>
  );
}

export function BenchmarkHub({ tabs }: { tabs: BTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!tab) return null;
  const max = Math.max(1, ...tab.rows.map((r) => r.metric));
  const top = tab.rows[0];

  return (
    <div className="space-y-6">
      {/* tab selector */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const on = t.key === tab.key;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
                on ? "border-emerald-500/50 bg-emerald-500/10 text-accent" : "border-[var(--border)] hover:bg-[var(--surface)]"
              }`}
            >
              <Icon name={t.icon} size={15} /> {t.label}
              <span className="text-[11px] font-mono text-[var(--muted)]/70">{t.rows.length}</span>
            </button>
          );
        })}
      </div>

      {/* headline */}
      {top && (
        <div className="card p-6 flex items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">Pemuncak</span>
          </div>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <RowMedia row={top} />
            <span className="display text-xl font-semibold tracking-tight truncate">{top.name}</span>
          </div>
          <div className="text-right shrink-0">
            <div className="display text-3xl font-semibold tabular-nums" style={{ color: tab.accent }}>{top.metric.toLocaleString()}</div>
            <div className="text-[11px] text-[var(--muted)]">{tab.metricLabel}</div>
          </div>
        </div>
      )}

      {/* ranked list */}
      <div className="card divide-y divide-[var(--border)]">
        {tab.rows.map((r, i) => {
          const inner = (
            <>
              <span className="w-6 shrink-0 text-xs font-mono text-[var(--muted)]/60 text-right">{i + 1}</span>
              <RowMedia row={r} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm truncate group-hover:text-accent transition-colors">{r.name}</span>
                {r.sub && <span className="block text-[11px] font-mono text-[var(--muted)]/70 truncate">{r.sub}</span>}
              </span>
              <span className="w-20 shrink-0 hidden sm:block">
                <span className="block h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${(r.metric / max) * 100}%`, background: tab.accent }} />
                </span>
              </span>
              <span className="w-14 shrink-0 text-right text-sm font-mono tabular-nums" style={{ color: tab.accent }}>{r.metric.toLocaleString()}</span>
            </>
          );
          return r.href ? (
            <Link key={r.id} href={r.href} className="flex items-center gap-3 px-4 md:px-5 py-3 group">{inner}</Link>
          ) : (
            <div key={r.id} className="flex items-center gap-3 px-4 md:px-5 py-3 group">{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
