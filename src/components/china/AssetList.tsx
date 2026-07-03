"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";
import { EntityProfileModal } from "@/components/influence/EntityProfileModal";

export type Asset = {
  id: string;
  name: string;
  slug: string;
  country_code: string | null;
  attributes: { kind?: string; operator?: string; stake?: string } | null;
};

const ASSET_KINDS: { kind: string; label: string; icon: string }[] = [
  { kind: "port", label: "Pelabuhan", icon: "ship" },
  { kind: "base", label: "Pangkalan Militer", icon: "shield" },
  { kind: "mine", label: "Tambang", icon: "pickaxe" },
  { kind: "industrial_park", label: "Kawasan Industri", icon: "factory" },
  { kind: "rail", label: "Rel & Infrastruktur", icon: "train-front" },
];

export function AssetList({ assets }: { assets: Asset[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {ASSET_KINDS.map((g) => {
          const items = assets.filter((a) => a.attributes?.kind === g.kind);
          if (items.length === 0) return null;
          return (
            <div key={g.kind}>
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--muted)] mb-2.5">
                <Icon name={g.icon} size={13} className="text-accent" /> {g.label} ({items.length})
              </div>
              <div className="space-y-1.5">
                {items.map((a) => (
                  <button
                    key={a.slug}
                    onClick={() => setOpen(a.slug)}
                    className="w-full text-left flex items-center gap-2.5 rounded-lg p-2 hover:bg-[var(--surface)] transition-colors group cursor-pointer"
                  >
                    {a.country_code && (
                      <span
                        className="text-[10px] font-mono text-[var(--muted)] shrink-0 rounded bg-[var(--surface-2)] px-1.5 py-0.5"
                        title={countryName(a.country_code)}
                      >
                        {a.country_code}
                      </span>
                    )}
                    <span className="text-sm min-w-0 truncate group-hover:text-accent transition-colors">
                      {a.name}
                      <span className="text-[var(--muted)] font-normal"> · {countryName(a.country_code)}</span>
                    </span>
                    <span className="ml-auto flex items-center gap-2 shrink-0">
                      {a.attributes?.operator && (
                        <span className="text-[11px] text-[var(--muted)] hidden sm:inline">{a.attributes.operator}</span>
                      )}
                      {a.attributes?.stake && (
                        <span className="text-[10px] font-mono text-rose-600/80">{a.attributes.stake}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {open && <EntityProfileModal slug={open} onClose={() => setOpen(null)} />}
    </>
  );
}
