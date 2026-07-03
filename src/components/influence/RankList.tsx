"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Bar, EntityProfileModal } from "./EntityProfileModal";

export type RankRow = {
  id: string;
  name: string;
  slug: string;
  score: number;
  photo: string | null;
  photoFallback?: string | null;
  icon: string | null;
  why?: string | null;
};

// Logo/photo with a graceful fallback chain: primary → fallback → icon glyph.
function RowLogo({ photo, fallback, name, icon }: { photo: string | null; fallback?: string | null; name: string; icon: string | null }) {
  const chain = [photo, fallback].filter((s): s is string => !!s);
  const [idx, setIdx] = useState(0);
  const src = chain[idx];
  if (!src) {
    return (
      <span className="h-7 w-7 shrink-0 rounded-md grid place-items-center bg-[var(--surface-2)] text-accent">
        <Icon name={icon} size={14} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setIdx((i) => i + 1)}
      className="h-7 w-7 shrink-0 rounded-md object-contain bg-white/60 border border-[var(--border)]"
    />
  );
}

// Ranked entity list (organizations / companies / nations) — each row opens the
// shared profile modal instead of navigating away.
export function RankList({ title, rows, wide = false }: { title: string; rows: RankRow[]; wide?: boolean }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  if (rows.length === 0) return null;

  return (
    <section className="card p-6">
      <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-4">{title}</div>
      <div className={`grid gap-x-8 gap-y-3 ${wide ? "sm:grid-cols-2" : ""}`}>
        {rows.map((e, i) => (
          <button
            key={e.id}
            onClick={() => setOpenSlug(e.slug)}
            className="flex items-center gap-3 group text-left cursor-pointer w-full min-w-0"
          >
            <span className="w-5 shrink-0 text-xs font-mono text-[var(--muted)]/60 text-right">{i + 1}</span>
            <RowLogo photo={e.photo} fallback={e.photoFallback} name={e.name} icon={e.icon} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm truncate group-hover:text-accent transition-colors">{e.name}</span>
              {e.why && (
                <span className="block text-[10px] font-mono text-[var(--muted)]/70 truncate">{e.why}</span>
              )}
            </span>
            <div className="w-16 shrink-0 hidden md:block">
              <Bar value={e.score} />
            </div>
            <span className="w-9 shrink-0 text-right text-xs font-mono tabular-nums text-accent">{e.score}</span>
          </button>
        ))}
      </div>
      {openSlug && <EntityProfileModal slug={openSlug} onClose={() => setOpenSlug(null)} />}
    </section>
  );
}
