"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";
import { Avatar, Bar, EntityProfileModal } from "./EntityProfileModal";

export type InfluencerCard = {
  id: string;
  name: string;
  slug: string;
  country_code: string | null;
  title: string | null;
  score: number;
  photo: string | null;
  lead: { name: string; icon: string | null } | null;
  why?: string | null;
};

export function InfluencerCards({ cards }: { cards: InfluencerCard[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpenSlug(p.slug)}
            className="card p-5 text-left block hover:border-emerald-500/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Avatar src={p.photo} name={p.name} size={52} />
              <div className="min-w-0">
                <div className="font-medium leading-snug truncate">{p.name}</div>
                <div className="text-xs text-[var(--muted)] truncate">{p.title}</div>
              </div>
              {p.country_code && <span className="ml-auto text-[10px] text-[var(--muted)] self-start max-w-[7rem] truncate" title={countryName(p.country_code)}>{countryName(p.country_code)}</span>}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Bar value={p.score} />
              <span className="text-xs font-mono tabular-nums text-accent w-8 text-right">{p.score}</span>
            </div>
            {p.why && (
              <div className="mt-2 text-[10px] font-mono text-[var(--muted)]/70" title="signals behind the score">
                {p.why}
              </div>
            )}
            {p.lead && (
              <div className="mt-3 pt-3 border-t border-[var(--hairline-soft)] flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Icon name="arrow-right" size={12} /> leads
                <Icon name={p.lead.icon} size={13} className="text-accent ml-0.5" />
                <span className="text-foreground truncate">{p.lead.name}</span>
              </div>
            )}
          </button>
        ))}
      </div>
      {openSlug && <EntityProfileModal slug={openSlug} onClose={() => setOpenSlug(null)} />}
    </>
  );
}
