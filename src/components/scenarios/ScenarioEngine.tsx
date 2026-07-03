"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";

export type Lever = {
  id: string;
  name: string;
  description: string | null;
  value_low: number | null;
  value_high: number | null;
  more_engagement: string | null;
  less_engagement: string | null;
  transmission: string | null;
  note: string | null;
  icon: string | null;
};

type Posture = "less" | "undecided" | "more";
const AXIS_MAX = 12; // largest lever high (technology)

const COLOR: Record<Posture, string> = { more: "#10b981", less: "#f43f5e", undecided: "var(--muted)" };
const num = (x: number | null) => (x == null ? 0 : Number(x));
const rng = (lo: number, hi: number) => (lo === hi ? `$${lo}T` : `$${lo}–${hi}T`);

export function ScenarioEngine({ levers, unit = "$T" }: { levers: Lever[]; unit?: string }) {
  const [state, setState] = useState<Record<string, Posture>>(
    () => Object.fromEntries(levers.map((l) => [l.id, "more" as Posture]))
  );

  const tally = useMemo(() => {
    let capLo = 0, capHi = 0, riskLo = 0, riskHi = 0;
    for (const l of levers) {
      const p = state[l.id];
      if (p === "more") { capLo += num(l.value_low); capHi += num(l.value_high); }
      else if (p === "less") { riskLo += num(l.value_low); riskHi += num(l.value_high); }
    }
    return { capLo, capHi, riskLo, riskHi };
  }, [state, levers]);

  const setAll = (p: Posture) => setState(Object.fromEntries(levers.map((l) => [l.id, p])));

  return (
    <div className="space-y-6">
      {/* live tally */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5 border-emerald-500/30">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-emerald-700">
            <Icon name="trending-up" size={14} /> Nilai ditangkap · lebih terlibat
          </div>
          <div className="display text-3xl font-semibold tabular-nums text-emerald-600 mt-1">
            {tally.capHi === 0 ? "—" : rng(tally.capLo, tally.capHi)}
          </div>
        </div>
        <div className="card p-5 border-rose-500/30">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-rose-700">
            <Icon name="trending-down" size={14} /> Nilai berisiko · kurang terlibat
          </div>
          <div className="display text-3xl font-semibold tabular-nums text-rose-600 mt-1">
            {tally.riskHi === 0 ? "—" : rng(tally.riskLo, tally.riskHi)}
          </div>
        </div>
      </div>

      {/* quick controls */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-[var(--muted)]">Skenario cepat:</span>
        <button onClick={() => setAll("more")} className="rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 px-3 py-1 hover:border-emerald-500/60 transition-colors cursor-pointer">Semua Lebih</button>
        <button onClick={() => setAll("less")} className="rounded-full border border-rose-500/30 bg-rose-500/[0.06] text-rose-700 px-3 py-1 hover:border-rose-500/60 transition-colors cursor-pointer">Semua Kurang</button>
        <button onClick={() => setAll("undecided")} className="rounded-full border border-[var(--border)] text-[var(--muted)] px-3 py-1 hover:border-[var(--muted)] transition-colors cursor-pointer">Reset</button>
      </div>

      {/* levers */}
      <div className="space-y-2.5">
        {levers.map((l) => {
          const p = state[l.id];
          const lo = num(l.value_low), hi = num(l.value_high);
          const color = COLOR[p];
          const leftPct = (lo / AXIS_MAX) * 100;
          const widthPct = Math.max(2, ((hi - lo) / AXIS_MAX) * 100);
          return (
            <div key={l.id} className="card p-4">
              <div className="flex items-center gap-3">
                <span className="h-9 w-9 shrink-0 rounded-xl bg-[var(--surface-2)] grid place-items-center text-accent">
                  <Icon name={l.icon} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug">{l.name}</div>
                  {l.description && <div className="text-[11px] text-[var(--muted)] truncate">{l.description}</div>}
                </div>
                <span className="display text-lg font-semibold tabular-nums shrink-0" style={{ color }}>{rng(lo, hi)}</span>
              </div>

              {/* range bar on shared axis */}
              <div className="mt-3 relative h-2 rounded-full bg-[var(--surface-2)]">
                <div
                  className="absolute h-full rounded-full transition-all duration-500"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: color, opacity: p === "undecided" ? 0.4 : 0.9 }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-[var(--muted)]/60 mt-1">
                <span>$0</span><span>${AXIS_MAX}T</span>
              </div>

              {/* posture control */}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
                  {([["less", "Kurang"], ["undecided", "—"], ["more", "Lebih"]] as [Posture, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setState((s) => ({ ...s, [l.id]: val }))}
                      className={`px-3 py-1.5 cursor-pointer transition-colors ${
                        p === val
                          ? val === "more" ? "bg-emerald-500/15 text-emerald-700 font-medium"
                          : val === "less" ? "bg-rose-500/15 text-rose-700 font-medium"
                          : "bg-[var(--surface-2)] text-foreground font-medium"
                          : "text-[var(--muted)] hover:bg-[var(--surface)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* details */}
              <LeverDetails lever={l} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeverDetails({ lever }: { lever: Lever }) {
  return (
    <details className="group mt-3">
      <summary className="list-none cursor-pointer inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-foreground transition-colors">
        <Icon name="chevron-right" size={13} className="transition-transform group-open:rotate-90" /> Rincian & mekanisme
      </summary>
      <div className="pt-3 space-y-2.5 border-t border-[var(--hairline-soft)] mt-3">
        {lever.more_engagement && (
          <Row color="#10b981" icon="arrow-up-right" label="Lebih terlibat" text={lever.more_engagement} />
        )}
        {lever.less_engagement && (
          <Row color="#f43f5e" icon="arrow-down-right" label="Kurang terlibat" text={lever.less_engagement} />
        )}
        {lever.transmission && (
          <div className="text-[11px] text-[var(--muted)]"><span className="font-mono uppercase tracking-wider">Mekanisme:</span> {lever.transmission}</div>
        )}
        {lever.note && (
          <div className="text-[11px] text-amber-700 flex items-start gap-1.5"><Icon name="alert-triangle" size={12} className="mt-0.5 shrink-0" /> {lever.note}</div>
        )}
      </div>
    </details>
  );
}

function Row({ color, icon, label, text }: { color: string; icon: string; label: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0" style={{ color }}><Icon name={icon} size={13} /></span>
      <div>
        <span className="text-[11px] font-medium" style={{ color }}>{label}. </span>
        <span className="text-xs text-foreground/85">{text}</span>
      </div>
    </div>
  );
}
