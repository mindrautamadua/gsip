"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";

export type DepRow = {
  country_code: string;
  name: string;
  region: string | null;
  archetype: string | null;
  exp_prod_p1: number | null; exp_prod_p2: number | null;
  imp_cons_p1: number | null; imp_cons_p2: number | null;
  fdi_inv_p1: number | null; fdi_inv_p2: number | null;
  china_reliance_level: string | null;
  china_reliance_note: string | null;
  source: string | null;
};

const ARCHETYPE: Record<string, { label: string; icon: string; color: string }> = {
  regional_proximity: { label: "Kedekatan Regional", icon: "waypoints", color: "#38bdf8" },
  resource_related: { label: "Terkait Sumber Daya", icon: "pickaxe", color: "#f59e0b" },
  capital_exposure: { label: "Paparan Kapital (BRI)", icon: "landmark", color: "#a78bfa" },
  developed: { label: "Ekonomi Maju", icon: "building-2", color: "#10b981" },
};
const ARCH_ORDER = ["regional_proximity", "resource_related", "capital_exposure", "developed"];

const RELIANCE: Record<string, { label: string; color: string }> = {
  high: { label: "Tinggi", color: "#f43f5e" },
  medium: { label: "Sedang", color: "#f59e0b" },
  low: { label: "Rendah", color: "#38bdf8" },
  none: { label: "—", color: "var(--muted)" },
};

function flag(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";
  const A = 0x1f1e6;
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65)) + String.fromCodePoint(A + (cc.charCodeAt(1) - 65));
}
const v = (x: number | null) => (x == null ? 0 : x);
const fmt = (x: number | null) => (x == null ? "—" : x < 1 ? "<1" : x.toFixed(0));
const composite = (r: DepRow) => (v(r.exp_prod_p2) + v(r.imp_cons_p2) + v(r.fdi_inv_p2)) / 3;
const compositeP1 = (r: DepRow) => (v(r.exp_prod_p1) + v(r.imp_cons_p1) + v(r.fdi_inv_p1)) / 3;

function Trend({ p1, p2 }: { p1: number | null; p2: number | null }) {
  const d = v(p2) - v(p1);
  if (d > 0.75) return <Icon name="trending-up" size={12} className="text-rose-500" />;
  if (d < -0.75) return <Icon name="trending-down" size={12} className="text-emerald-500" />;
  return <Icon name="minus" size={12} className="text-[var(--muted)]" />;
}

const BAR_MAX = 22; // Taiwan export dependence is the ceiling
function Bar({ value, color }: { value: number | null; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (v(value) / BAR_MAX) * 100)}%`, background: color }} />
    </div>
  );
}

export function DependencyMatrix({ rows }: { rows: DepRow[] }) {
  const [open, setOpen] = useState<DepRow | null>(null);
  const groups = useMemo(
    () =>
      ARCH_ORDER.map((a) => ({
        key: a,
        meta: ARCHETYPE[a],
        items: rows.filter((r) => r.archetype === a).sort((x, y) => composite(y) - composite(x)),
      })).filter((g) => g.items.length),
    [rows]
  );

  return (
    <>
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.key}>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.meta.color }} />
              <Icon name={g.meta.icon} size={14} className="text-[var(--muted)]" />
              <h3 className="text-sm font-semibold">{g.meta.label}</h3>
              <span className="text-[11px] text-[var(--muted)]">({g.items.length})</span>
            </div>
            <div className="card divide-y divide-[var(--border)]">
              {/* header row */}
              <div className="hidden md:grid grid-cols-[1.5rem_12rem_1fr_1fr_1fr_5rem] items-center gap-4 px-4 md:px-5 py-2 text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                <span />
                <span>Negara</span>
                <span>Ekspor → China (% produksi)</span>
                <span>Impor ← China (% konsumsi)</span>
                <span>FDI China (% investasi)</span>
                <span className="text-right">China←</span>
              </div>
              {g.items.map((r) => {
                const rel = RELIANCE[r.china_reliance_level ?? "none"] ?? RELIANCE.none;
                return (
                  <button
                    key={r.country_code}
                    onClick={() => setOpen(r)}
                    className="w-full text-left grid grid-cols-[1.5rem_1fr_auto] md:grid-cols-[1.5rem_12rem_1fr_1fr_1fr_5rem] items-center gap-3 md:gap-4 px-4 md:px-5 py-3 hover:bg-[var(--surface)] transition-colors cursor-pointer"
                  >
                    <span className="text-lg leading-none">{flag(r.country_code)}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{countryName(r.country_code)}</div>
                      <div className="text-[11px] text-[var(--muted)] truncate md:hidden">Ketuk untuk rincian</div>
                    </div>
                    {[
                      { p1: r.exp_prod_p1, p2: r.exp_prod_p2 },
                      { p1: r.imp_cons_p1, p2: r.imp_cons_p2 },
                      { p1: r.fdi_inv_p1, p2: r.fdi_inv_p2 },
                    ].map((m, i) => (
                      <div key={i} className="hidden md:flex items-center gap-2">
                        <div className="flex-1"><Bar value={m.p2} color={g.meta.color} /></div>
                        <span className="w-6 text-right font-mono text-xs tabular-nums">{fmt(m.p2)}</span>
                        <Trend p1={m.p1} p2={m.p2} />
                      </div>
                    ))}
                    <span className="ml-auto md:ml-0 md:text-right">
                      <span
                        className="inline-block h-2 w-2 rounded-full align-middle"
                        style={{ background: rel.color }}
                        title={`Ketergantungan China: ${rel.label}`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {open && <DependencyModal row={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function DependencyModal({ row, onClose }: { row: DepRow; onClose: () => void }) {
  const rel = RELIANCE[row.china_reliance_level ?? "none"] ?? RELIANCE.none;
  const arch = ARCHETYPE[row.archetype ?? ""] ?? { label: "—", icon: "globe", color: "var(--muted)" };
  const delta = composite(row) - compositeP1(row);
  const metrics = [
    { label: "Ekspor ke China", sub: "% produksi domestik", p1: row.exp_prod_p1, p2: row.exp_prod_p2 },
    { label: "Impor dari China", sub: "% konsumsi domestik", p1: row.imp_cons_p1, p2: row.imp_cons_p2 },
    { label: "FDI masuk dari China", sub: "% investasi domestik", p1: row.fdi_inv_p1, p2: row.fdi_inv_p2 },
  ];
  const flagged = row.source?.includes("analyst");

  return (
    <div
      role="dialog" aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 backdrop-blur-sm p-4 sm:p-8"
    >
      <div className="relative w-full max-w-2xl my-4 sm:my-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)] animate-[float-in_0.28s_cubic-bezier(0.16,1,0.3,1)]">
        <button onClick={onClose} aria-label="Tutup" className="absolute right-3 top-3 z-10 h-9 w-9 rounded-xl grid place-items-center text-[var(--muted)] bg-[var(--surface)] border border-[var(--hairline)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors">
          <Icon name="x" size={17} />
        </button>

        <div className="px-6 md:px-8 pt-8 pb-6 border-b border-[var(--hairline-soft)]">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{flag(row.country_code)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="eyebrow"><Icon name={arch.icon} size={11} /> {arch.label}</span>
                {row.region && <span className="text-[11px] text-[var(--muted)]">{row.region}</span>}
              </div>
              <h2 className="display text-2xl font-semibold tracking-tight leading-tight mt-1">{countryName(row.country_code)}</h2>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 py-6 space-y-6">
          {/* Leg 1: country -> China */}
          <section>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">
              <Icon name="arrow-right" size={13} className="text-accent" /> Paparan negara → China
            </div>
            <div className="space-y-3">
              {metrics.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-40 shrink-0">
                    <div className="text-xs">{m.label}</div>
                    <div className="text-[10px] text-[var(--muted)]/70">{m.sub}</div>
                  </div>
                  <div className="flex-1"><Bar value={m.p2} color={arch.color} /></div>
                  <div className="flex items-center gap-1.5 shrink-0 w-24 justify-end">
                    <span className="font-mono text-[11px] text-[var(--muted)] tabular-nums">{fmt(m.p1)}</span>
                    <Icon name="arrow-right" size={11} className="text-[var(--muted)]/50" />
                    <span className="font-mono text-sm tabular-nums">{fmt(m.p2)}</span>
                    <Trend p1={m.p1} p2={m.p2} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--muted)] mt-3">
              Momentum ketergantungan {delta > 0.75 ? "meningkat" : delta < -0.75 ? "menurun" : "stabil"} sejak 2007 (perbandingan periode 2003–07 vs 2013–17).
            </p>
          </section>

          {/* Leg 2: China -> country (reverse) */}
          <section className="rounded-xl border p-4" style={{ borderColor: rel.color + "44", background: rel.color + "0d" }}>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: rel.color }}>
              <Icon name="arrow-left" size={13} /> Ketergantungan China → negara: {rel.label}
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {row.china_reliance_note ?? "Tidak ada ketergantungan balik yang menonjol menurut data ini."}
            </p>
          </section>

          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--muted)]/70">
            <Icon name={flagged ? "flask-conical" : "book-open"} size={12} />
            {row.source}
          </div>
        </div>
      </div>
    </div>
  );
}
