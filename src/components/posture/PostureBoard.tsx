"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ActionManager, type MAction, type ActionType } from "./ActionManager";
import { statusChip, statusLabel } from "@/lib/status";

export type PItem = {
  id: string | null;
  title: string;
  date: string | null;
  text: string;
  score: number | null;
  recommendation?: string | null;
  actions?: MAction[];
  haystack: string;
};

// Focus lenses. Native analyses are Indonesia-vantage, so this filters the board
// to items connected to a chosen actor/theme (by involvement or mention).
const FOCI: { key: string; label: string; icon: string; re: RegExp | null }[] = [
  { key: "all", label: "Semua", icon: "layers", re: null },
  { key: "china", label: "Tiongkok", icon: "flag", re: /china|tiongkok|tsmc|beijing|rrt|huawei/i },
  { key: "us", label: "Amerika", icon: "flag", re: /amerika|serikat|\bas\b|\bu\.?s\.?\b|united states|nvidia/i },
  { key: "eu", label: "Uni Eropa", icon: "flag", re: /eropa|uni eropa|eudr|\beu\b/i },
  { key: "energy", label: "Energi", icon: "zap", re: /energi|batu bara|listrik|terbarukan|karbon|minyak|transisi/i },
  { key: "palm", label: "Sawit", icon: "leaf", re: /sawit|palm|cpo|deforest/i },
];

function ScoreChip({ n, tone }: { n: number | null; tone: "risk" | "opp" }) {
  const v = tone === "risk" ? "var(--risk)" : "var(--opportunity)";
  return (
    <span
      className="shrink-0 h-7 w-7 grid place-items-center rounded-lg border text-xs font-mono font-semibold tabular-nums"
      style={{ color: v, borderColor: `color-mix(in srgb, ${v} 25%, transparent)`, background: `color-mix(in srgb, ${v} 12%, transparent)` }}
    >{n ?? "—"}</span>
  );
}

function ItemRow({ it, tone, canManage, onManage }: { it: PItem; tone: "risk" | "opp"; canManage: boolean; onManage: (it: PItem) => void }) {
  return (
    <div className="flex gap-3">
      <ScoreChip n={it.score} tone={tone} />
      <div className="min-w-0">
        {it.id ? (
          <Link href={`/events/${it.id}`} className="text-sm font-medium leading-snug hover:text-accent transition-colors line-clamp-2">{it.title}</Link>
        ) : <span className="text-sm font-medium">{it.title}</span>}
        <p className="text-[13px] text-[var(--muted)] mt-1 leading-relaxed">{it.text}</p>
        {tone === "risk" && it.recommendation && (
          <p className="text-[12px] text-[var(--muted)]/80 mt-1.5 flex gap-1.5">
            <Icon name="lightbulb" size={12} className="mt-0.5 shrink-0 text-amber-500" /><span>{it.recommendation}</span>
          </p>
        )}
        {it.actions && it.actions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[var(--hairline-soft)] space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]/70 flex items-center gap-1">
              <Icon name="shield-check" size={11} /> Mitigasi &amp; Owner
            </div>
            {it.actions.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className={`shrink-0 ${statusChip(a.status)}`}>
                  {statusLabel(a.status)}
                </span>
                <span className="truncate">{a.title}</span>
                {a.owner && <span className="text-[var(--muted)] shrink-0">· {a.owner}</span>}
              </div>
            ))}
          </div>
        )}
        {canManage && it.id && (
          <button onClick={() => onManage(it)}
            className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-accent transition-colors cursor-pointer">
            <Icon name="settings-2" size={12} /> Kelola aksi
          </button>
        )}
      </div>
    </div>
  );
}

export function PostureBoard({ risks, opps, depCount, predCount, actionTypes, canManage }: { risks: PItem[]; opps: PItem[]; depCount: number; predCount: number; actionTypes: ActionType[]; canManage: boolean }) {
  const [focus, setFocus] = useState("all");
  const [manage, setManage] = useState<PItem | null>(null);
  const active = FOCI.find((f) => f.key === focus) ?? FOCI[0];

  const fRisks = useMemo(() => (active.re ? risks.filter((r) => active.re!.test(r.haystack)) : risks), [risks, active]);
  const fOpps = useMemo(() => (active.re ? opps.filter((r) => active.re!.test(r.haystack)) : opps), [opps, active]);

  return (
    <div className="space-y-6">
      {/* focus / vantage lens */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
          <Icon name="scan-search" size={13} /> Lensa fokus
        </div>
        <div className="flex flex-wrap gap-2">
          {FOCI.map((f) => {
            const on = f.key === focus;
            return (
              <button
                key={f.key}
                onClick={() => setFocus(f.key)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  on ? "border-emerald-500/50 bg-emerald-500/10 text-accent" : "border-[var(--border)] hover:bg-[var(--surface)]"
                }`}
              >
                <Icon name={f.icon} size={13} /> {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* stats (risk/opp reflect the active lens) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Risiko" + (active.re ? " (lensa)" : ""), value: fRisks.length, icon: "shield-alert", tone: "txt-risk" },
          { label: "Peluang" + (active.re ? " (lensa)" : ""), value: fOpps.length, icon: "sparkles", tone: "txt-opportunity" },
          { label: "Titik ketergantungan", value: depCount, icon: "link", tone: "text-amber-600" },
          { label: "Sinyal prediksi", value: predCount, icon: "target", tone: "" },
        ].map((s) => (
          <div key={s.label} className="card p-5 flex items-center gap-3">
            <span className="h-10 w-10 shrink-0 rounded-xl bg-[var(--surface-2)] grid place-items-center text-accent"><Icon name={s.icon} size={18} /></span>
            <div className="min-w-0">
              <div className={`display text-2xl font-semibold tabular-nums ${s.tone}`}>{s.value}</div>
              <div className="text-[11px] text-[var(--muted)] truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* the board */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest txt-risk mb-4">
            <Icon name="shield-alert" size={14} /> Risiko Teratas
          </div>
          <div className="space-y-3">
            {fRisks.map((it, i) => <ItemRow key={i} it={it} tone="risk" canManage={canManage} onManage={setManage} />)}
            {fRisks.length === 0 && <p className="text-sm text-[var(--muted)]/70">Tidak ada risiko untuk lensa “{active.label}”.</p>}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest txt-opportunity mb-4">
            <Icon name="sparkles" size={14} /> Peluang Teratas
          </div>
          <div className="space-y-3">
            {fOpps.map((it, i) => <ItemRow key={i} it={it} tone="opp" canManage={canManage} onManage={setManage} />)}
            {fOpps.length === 0 && <p className="text-sm text-[var(--muted)]/70">Tidak ada peluang untuk lensa “{active.label}”.</p>}
          </div>
        </section>
      </div>

      {manage && manage.id && (
        <ActionManager
          eventId={manage.id}
          eventTitle={manage.title}
          actions={manage.actions ?? []}
          actionTypes={actionTypes}
          onClose={() => setManage(null)}
        />
      )}
    </div>
  );
}
