"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";
import { EntityLogo } from "@/components/EntityLogo";
import { EntityProfileModal } from "@/components/influence/EntityProfileModal";

export type BRow = {
  slug: string;
  name: string;
  cc: string | null;
  domain: string | null;
  marketCap: number | null;
  influence: number;
  fg500: number | null;
  sectorCode: string;
  sectorName: string;
};
export type BSector = { code: string; name: string; count: number };

const fmtCap = (bn: number | null) => (bn == null ? "—" : bn >= 1000 ? `$${(bn / 1000).toFixed(1)}T` : `$${bn}bn`);

export function BenchmarkExplorer({ rows, sectors }: { rows: BRow[]; sectors: BSector[] }) {
  const [sec, setSec] = useState(sectors[0]?.code ?? "");
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  const list = useMemo(
    () =>
      rows
        .filter((r) => r.sectorCode === sec)
        .sort((a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1) || b.influence - a.influence),
    [rows, sec]
  );
  const maxCap = Math.max(...list.map((r) => r.marketCap ?? 0), 1);
  const secName = sectors.find((s) => s.code === sec)?.name ?? "";
  const leader = list[0];

  return (
    <div className="space-y-4">
      {/* sector selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">Sektor GICS</label>
        <select
          value={sec}
          onChange={(e) => setSec(e.target.value)}
          aria-label="Pilih sektor"
          className="gsip-input w-auto max-w-[22rem] cursor-pointer"
        >
          {sectors.map((s) => (
            <option key={s.code} value={s.code}>{s.name} ({s.count})</option>
          ))}
        </select>
        {leader && (
          <span className="ml-auto text-xs text-[var(--muted)]">
            Pemimpin: <span className="text-accent font-medium">{leader.name}</span> · {list.length} pemain
          </span>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--hairline)] text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                <th className="text-left px-4 py-3 w-12">#</th>
                <th className="text-left px-2 py-3">Perusahaan</th>
                <th className="text-left px-3 py-3 hidden sm:table-cell">Negara</th>
                <th className="text-left px-3 py-3 w-[34%] hidden md:table-cell">Market Cap</th>
                <th className="text-right px-3 py-3">FG500</th>
                <th className="text-right px-4 py-3 w-24">Influence</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr
                  key={r.slug}
                  onClick={() => setOpenSlug(r.slug)}
                  className="border-b border-[var(--hairline-soft)] last:border-0 hover:bg-[var(--surface)] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-[var(--muted)] tabular-nums">{i + 1}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <EntityLogo domain={r.domain} icon="building" name={r.name} size={26} />
                      <span className="font-medium truncate">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--muted)] hidden sm:table-cell whitespace-nowrap">
                    {r.cc ? countryName(r.cc) : "—"}
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-600"
                          style={{ width: `${((r.marketCap ?? 0) / maxCap) * 100}%` }} />
                      </div>
                      <span className="font-mono tabular-nums text-[var(--muted)] w-14 text-right">{fmtCap(r.marketCap)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[var(--muted)]">{r.fg500 ? `#${r.fg500}` : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-accent">{r.influence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-[var(--muted)]/70">
        Lanskap kompetitif {secName}. Market cap = snapshot indikatif; state-owned tanpa market cap diperingkat via influence/FG500. Klik baris untuk positioning lengkap.
      </p>

      {openSlug && <EntityProfileModal slug={openSlug} onClose={() => setOpenSlug(null)} />}
    </div>
  );
}
