// NATO Admiralty source grading badge (e.g. "C3"). Encapsulates the label
// lookups so event detail / insights render it consistently.

const RELIABILITY: Record<string, string> = {
  A: "Sepenuhnya andal",
  B: "Biasanya andal",
  C: "Cukup andal",
  D: "Kurang andal",
  E: "Tidak andal",
  F: "Tidak dapat dinilai",
};

const CREDIBILITY: Record<string, string> = {
  "1": "Terkonfirmasi sumber lain",
  "2": "Kemungkinan besar benar",
  "3": "Mungkin benar",
  "4": "Diragukan",
  "5": "Tidak mungkin",
  "6": "Tidak dapat dinilai",
};

function tone(reliability: string | null): string {
  if (!reliability) return "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]";
  if (["A", "B"].includes(reliability)) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25";
  if (["C", "D"].includes(reliability)) return "bg-amber-500/10 text-amber-700 border-amber-500/25";
  return "bg-rose-500/10 text-rose-700 border-rose-500/25";
}

export function GradingBadge({
  reliability,
  credibility,
  showLegend = false,
}: {
  reliability: string | null;
  credibility: string | null;
  showLegend?: boolean;
}) {
  if (!reliability && !credibility) return null;
  const code = `${reliability ?? "?"}${credibility ?? "?"}`;
  const title = `Admiralty: ${RELIABILITY[reliability ?? ""] ?? "—"} · ${CREDIBILITY[credibility ?? ""] ?? "—"}`;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono ${tone(reliability)}`}
    >
      <span className="font-semibold">{code}</span>
      {showLegend && (
        <span className="font-sans font-normal opacity-80">
          {RELIABILITY[reliability ?? ""] ?? "—"} · {CREDIBILITY[credibility ?? ""] ?? "—"}
        </span>
      )}
    </span>
  );
}
