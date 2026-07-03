"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { resolvePredictionAction } from "@/app/predictions/actions";

export type Prediction = {
  id: string;
  statement: string;
  rationale: string | null;
  probability: number;
  horizon_date: string | null;
  status: "pending" | "resolved" | "expired" | "cancelled";
  outcome: boolean | null;
  brier_score: number | null;
  resolved_by: string | null;
  event_id: string | null;
  event_title: string | null;
  domain_name: string | null;
};

function probColor(p: number): string {
  if (p >= 0.7) return "text-emerald-600";
  if (p >= 0.4) return "text-amber-600";
  return "text-rose-600";
}

// Brier: 0 = perfect, 0.25 = coin-flip, 1 = maximally wrong.
function brierColor(b: number): string {
  if (b <= 0.1) return "text-emerald-600";
  if (b <= 0.25) return "text-amber-600";
  return "text-rose-600";
}

export function PredictionRow({ p, canResolve }: { p: Prediction; canResolve: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const overdue =
    p.status === "pending" && p.horizon_date != null && p.horizon_date < new Date().toISOString().slice(0, 10);

  const resolve = (outcome: boolean) =>
    startTransition(async () => {
      setError(null);
      const res = await resolvePredictionAction(p.id, outcome);
      if (!res.ok) setError(res.error);
    });

  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center shrink-0 w-16">
          <div className={`display text-2xl font-semibold tabular-nums ${probColor(p.probability)}`}>
            {Math.round(p.probability * 100)}%
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">prob</div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{p.statement}</p>
          {p.rationale && <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">{p.rationale}</p>}
          <div className="flex items-center gap-x-3 gap-y-1 mt-2.5 flex-wrap text-[11px] font-mono text-[var(--muted)]">
            {p.domain_name && (
              <span className="inline-flex items-center gap-1">
                <Icon name="globe" size={11} /> {p.domain_name}
              </span>
            )}
            {p.horizon_date && (
              <span className={`inline-flex items-center gap-1 ${overdue ? "text-amber-600" : ""}`}>
                <Icon name="calendar-clock" size={11} /> {p.horizon_date}
                {overdue && " · jatuh tempo"}
              </span>
            )}
            {p.event_id && p.event_title && (
              <Link href={`/events/${p.event_id}`} className="inline-flex items-center gap-1 hover:text-emerald-700">
                <Icon name="radar" size={11} /> {p.event_title.slice(0, 40)}
                {p.event_title.length > 40 ? "…" : ""}
              </Link>
            )}
          </div>
          {error && <div className="text-[11px] text-rose-600 mt-2">{error}</div>}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          {p.status === "resolved" ? (
            <>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-mono ${
                  p.outcome
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
                    : "bg-rose-500/10 text-rose-700 border-rose-500/25"
                }`}
              >
                <Icon name={p.outcome ? "check" : "x"} size={12} />
                {p.outcome ? "Terbukti" : "Tidak terbukti"}
              </span>
              {p.brier_score != null && (
                <span className={`text-[11px] font-mono ${brierColor(p.brier_score)}`}>
                  Brier {p.brier_score.toFixed(3)}
                </span>
              )}
            </>
          ) : canResolve ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => resolve(true)}
                disabled={pending}
                title="Tandai terbukti"
                className="h-8 w-8 rounded-lg grid place-items-center border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Icon name="check" size={15} />
              </button>
              <button
                onClick={() => resolve(false)}
                disabled={pending}
                title="Tandai tidak terbukti"
                className="h-8 w-8 rounded-lg grid place-items-center border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Icon name="x" size={15} />
              </button>
            </div>
          ) : (
            <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[11px] font-mono text-[var(--muted)]">
              {overdue ? "menunggu resolusi" : "pending"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
