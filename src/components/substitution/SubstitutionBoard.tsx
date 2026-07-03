"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";

export type SubRow = {
  shock_label: string;
  shock_kind: string;
  shock_icon: string | null;
  shock_note: string | null;
  beneficiary_code: string | null;
  beneficiary_name: string;
  rationale: string | null;
  readiness: string | null;
  magnitude: string | null;
  source: string | null;
  shock_order: number;
  sort_order: number;
};

const READY: Record<string, { label: string; color: string; w: number }> = {
  high: { label: "Siap", color: "#10b981", w: 3 },
  medium: { label: "Sebagian", color: "#f59e0b", w: 2 },
  low: { label: "Terbatas", color: "#38bdf8", w: 1 },
};
function flag(iso2: string | null): string {
  if (!iso2 || iso2.length !== 2) return "";
  const A = 0x1f1e6;
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65)) + String.fromCodePoint(A + (cc.charCodeAt(1) - 65));
}
const cn = (r: SubRow) => (r.beneficiary_code ? countryName(r.beneficiary_code) : r.beneficiary_name);

export function SubstitutionBoard({ rows }: { rows: SubRow[] }) {
  const [sel, setSel] = useState<string | null>(null);

  const leaderboard = useMemo(() => {
    const m = new Map<string, { code: string; gain: number; shocks: Set<string> }>();
    for (const r of rows) {
      const key = r.beneficiary_code ?? r.beneficiary_name;
      if (!m.has(key)) m.set(key, { code: r.beneficiary_code ?? "", gain: 0, shocks: new Set() });
      const e = m.get(key)!;
      e.gain += READY[r.readiness ?? "medium"]?.w ?? 2;
      e.shocks.add(r.shock_label);
    }
    return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.gain - a.gain);
  }, [rows]);

  const shocks = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, SubRow[]>();
    for (const r of rows) {
      if (!map.has(r.shock_label)) { map.set(r.shock_label, []); order.push(r.shock_label); }
      map.get(r.shock_label)!.push(r);
    }
    order.sort((a, b) => (map.get(a)![0].shock_order) - (map.get(b)![0].shock_order));
    return order
      .map((label) => ({ label, items: map.get(label)!.sort((x, y) => x.sort_order - y.sort_order) }))
      .filter((s) => !sel || s.items.some((r) => (r.beneficiary_code ?? r.beneficiary_name) === sel));
  }, [rows, sel]);

  const maxGain = leaderboard[0]?.gain || 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
      {/* leaderboard */}
      <aside className="space-y-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-700 mb-1">
            <Icon name="trophy" size={14} /> Siapa Untung dari Decoupling
          </div>
          <p className="text-[11px] text-[var(--muted)] mb-3 leading-snug">Indeks keuntungan agregat lintas guncangan (bobot kesiapan). Klik untuk menyaring.</p>
          <div className="space-y-1.5">
            {leaderboard.map((b) => {
              const active = sel === b.key;
              return (
                <button key={b.key} onClick={() => setSel(active ? null : b.key)}
                  className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors cursor-pointer border ${active ? "border-emerald-500/50 bg-emerald-500/[0.06]" : "border-transparent hover:bg-[var(--surface)]"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none shrink-0">{flag(b.code)}</span>
                    <span className="text-sm flex-1 min-w-0 truncate">{b.code ? countryName(b.code) : b.key}</span>
                    <span className="font-mono text-xs tabular-nums text-emerald-600">{b.gain}</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-600" style={{ width: `${(b.gain / maxGain) * 100}%` }} />
                  </div>
                  <div className="text-[10px] text-[var(--muted)]/70 mt-1">{b.shocks.size} guncangan</div>
                </button>
              );
            })}
          </div>
        </div>
        {sel && (
          <button onClick={() => setSel(null)} className="w-full text-xs rounded-lg border border-[var(--border)] px-3 py-2 text-[var(--muted)] hover:border-[var(--muted)] transition-colors cursor-pointer">
            Hapus filter · {countryName(sel)}
          </button>
        )}
      </aside>

      {/* shock cards */}
      <div className="space-y-4">
        {shocks.map((s) => {
          const head = s.items[0];
          return (
            <section key={s.label} className="card p-5">
              <div className="flex items-start gap-3">
                <span className="h-9 w-9 shrink-0 rounded-xl bg-rose-500/10 border border-rose-500/20 grid place-items-center text-rose-600">
                  <Icon name={head.shock_icon} size={17} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{s.label}</h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)] rounded bg-[var(--surface-2)] px-1.5 py-0.5">{head.shock_kind}</span>
                  </div>
                  {head.shock_note && <p className="text-[11px] text-[var(--muted)] mt-0.5">{head.shock_note}</p>}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">
                <Icon name="arrow-down" size={12} /> Beneficiary
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {s.items.map((r, i) => {
                  const rd = READY[r.readiness ?? "medium"] ?? READY.medium;
                  const isSel = sel && (r.beneficiary_code ?? r.beneficiary_name) === sel;
                  return (
                    <div key={i} className={`rounded-xl border p-3 ${isSel ? "border-emerald-500/50 bg-emerald-500/[0.05]" : "border-[var(--border)] bg-[var(--surface)]"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none shrink-0">{flag(r.beneficiary_code)}</span>
                        <span className="text-sm font-medium flex-1 min-w-0 truncate">{cn(r)}</span>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono shrink-0" style={{ color: rd.color, background: rd.color + "1a" }}>
                          {rd.label}
                        </span>
                      </div>
                      {r.rationale && <p className="text-[11px] text-[var(--muted)] mt-1.5 leading-snug">{r.rationale}</p>}
                      {r.magnitude && <p className="text-[11px] text-emerald-700/90 mt-1 font-mono">{r.magnitude}</p>}
                      {r.source?.includes("analyst") && (
                        <div className="text-[9px] font-mono text-amber-600/80 mt-1 flex items-center gap-1"><Icon name="flask-conical" size={10} /> estimasi analis</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
