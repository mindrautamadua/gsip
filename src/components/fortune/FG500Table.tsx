"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";
import { EntityProfileModal } from "@/components/influence/EntityProfileModal";

export type FG500Row = {
  slug: string;
  name: string;
  rank: number;
  cc: string | null;
  gics: string | null;
  sector: string | null;
  ticker: string | null;
  marketCap: number | null; // USD bn
  influence: number;
  icon: string | null;
  domain: string | null;
};

// Company logo with fallback chain: Clearbit → Google favicon → icon glyph.
function Logo({ domain, name, icon }: { domain: string | null; name: string; icon: string | null }) {
  const chain = domain
    ? [`https://logo.clearbit.com/${domain}`, `https://www.google.com/s2/favicons?domain=${domain}&sz=64`]
    : [];
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
      className="h-7 w-7 shrink-0 rounded-md object-contain bg-white border border-[var(--border)] p-0.5"
    />
  );
}

type SortKey = "rank" | "marketCap" | "influence";

function fmtCap(bn: number | null): string {
  if (bn == null) return "—";
  if (bn >= 1000) return `$${(bn / 1000).toFixed(1)}T`;
  return `$${bn}bn`;
}

export function FG500Table({ rows }: { rows: FG500Row[] }) {
  const [sort, setSort] = useState<SortKey>("rank");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");

  const countryOpts = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => { if (r.cc) m.set(r.cc, (m.get(r.cc) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([cc, n]) => ({ cc, n }));
  }, [rows]);
  const sectorOpts = useMemo(
    () => [...new Set(rows.map((r) => r.sector).filter((s): s is string => !!s))].sort(),
    [rows]
  );

  const sorted = useMemo(() => {
    const term = q.trim().toLowerCase();
    let arr = rows.filter(
      (r) =>
        (!country || r.cc === country) &&
        (!sector || r.sector === sector) &&
        (!term || r.name.toLowerCase().includes(term) || (r.ticker ?? "").toLowerCase().includes(term))
    );
    arr = [...arr];
    if (sort === "rank") arr.sort((a, b) => a.rank - b.rank);
    else if (sort === "marketCap") arr.sort((a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1));
    else arr.sort((a, b) => b.influence - a.influence);
    return arr;
  }, [rows, sort, q, country, sector]);

  const Th = ({ k, label, className = "" }: { k: SortKey; label: string; className?: string }) => (
    <button
      onClick={() => setSort(k)}
      className={`inline-flex items-center gap-1 font-mono uppercase tracking-wider text-[10px] cursor-pointer transition-colors ${
        sort === k ? "text-accent" : "text-[var(--muted)] hover:text-foreground"
      } ${className}`}
    >
      {label}
      {sort === k && <Icon name="chevron-down" size={11} />}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* toolbar: search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari perusahaan atau ticker…"
            aria-label="Cari"
            className="gsip-input pl-9"
          />
        </div>
        <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Filter negara" className="gsip-input w-auto cursor-pointer">
          <option value="">Semua negara</option>
          {countryOpts.map((o) => (
            <option key={o.cc} value={o.cc}>{countryName(o.cc)} ({o.n})</option>
          ))}
        </select>
        <select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Filter sektor" className="gsip-input w-auto max-w-[15rem] cursor-pointer">
          <option value="">Semua sektor</option>
          {sectorOpts.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {(q || country || sector) && (
          <button
            onClick={() => { setQ(""); setCountry(""); setSector(""); }}
            className="text-xs text-[var(--muted)] hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
          >
            <Icon name="x" size={13} /> reset
          </button>
        )}
        <span className="ml-auto text-xs font-mono text-[var(--muted)]">{sorted.length} hasil</span>
      </div>

    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--hairline)]">
              <th className="text-left px-4 py-3 w-14"><Th k="rank" label="#" /></th>
              <th className="text-left px-2 py-3">Perusahaan</th>
              <th className="text-left px-3 py-3 hidden sm:table-cell">Negara</th>
              <th className="text-left px-3 py-3 hidden lg:table-cell">Sektor (GICS)</th>
              <th className="text-right px-3 py-3"><Th k="marketCap" label="Market Cap" className="justify-end" /></th>
              <th className="text-right px-4 py-3 w-28"><Th k="influence" label="Influence" className="justify-end" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.slug}
                onClick={() => setOpenSlug(r.slug)}
                className="border-b border-[var(--hairline-soft)] last:border-0 hover:bg-[var(--surface)] cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5 font-mono text-[var(--muted)] tabular-nums">{r.rank}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Logo domain={r.domain} name={r.name} icon={r.icon} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.name}</div>
                      {r.ticker && <div className="text-[10px] font-mono text-[var(--muted)]/70">{r.ticker}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[var(--muted)] hidden sm:table-cell whitespace-nowrap">
                  {r.cc ? countryName(r.cc) : "—"}
                </td>
                <td className="px-3 py-2.5 text-[var(--muted)] hidden lg:table-cell">
                  <span className="truncate inline-block max-w-[16rem] align-bottom">{r.sector ?? "—"}</span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">{fmtCap(r.marketCap)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-14 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden hidden sm:block">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-600"
                        style={{ width: `${r.influence}%` }} />
                    </div>
                    <span className="font-mono tabular-nums text-accent w-7 text-right">{r.influence}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      {openSlug && <EntityProfileModal slug={openSlug} onClose={() => setOpenSlug(null)} />}
    </div>
  );
}
