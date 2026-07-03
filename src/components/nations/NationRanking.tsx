"use client";

import { useState } from "react";
import { NationModal } from "./NationModal";

export type RankNation = {
  code: string;
  iso2: string | null;
  name: string;
  region: string | null;
  status: number;
  capability: number;
  future: number;
  composite: number;
};

function flag(iso2: string | null): string {
  if (!iso2 || iso2.length !== 2) return "";
  const A = 0x1f1e6;
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65)) + String.fromCodePoint(A + (cc.charCodeAt(1) - 65));
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function NationRanking({ nations }: { nations: RankNation[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <div className="card divide-y divide-[var(--border)]">
        {nations.map((n, i) => (
          <button
            key={n.code}
            onClick={() => setOpen(n.code)}
            className="w-full text-left grid grid-cols-[2rem_1.5rem_1fr_auto] md:grid-cols-[2.5rem_1.5rem_14rem_1fr_4rem] items-center gap-3 md:gap-4 px-4 md:px-5 py-3 hover:bg-[var(--surface)] transition-colors cursor-pointer"
          >
            <span className="text-sm font-mono text-[var(--muted)] tabular-nums">{i + 1}</span>
            <span className="text-lg leading-none">{flag(n.iso2)}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{n.name}</div>
              <div className="text-[11px] text-[var(--muted)] truncate">{n.region}</div>
            </div>
            <div className="hidden md:grid grid-cols-3 gap-3">
              {[["Status", n.status, "#34d399"], ["Capability", n.capability, "#38bdf8"], ["Future", n.future, "#fbbf24"]].map(([label, val, c]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1">
                    <span>{label as string}</span><span className="font-mono tabular-nums">{(val as number).toFixed(0)}</span>
                  </div>
                  <Bar value={val as number} color={c as string} />
                </div>
              ))}
            </div>
            <span className="display text-xl font-semibold tabular-nums text-right">{n.composite.toFixed(0)}</span>
          </button>
        ))}
      </div>
      {open && <NationModal code={open} onClose={() => setOpen(null)} />}
    </>
  );
}
