// Shared materiality scoring — fuses GSIP signals into one transparent 0-100 score.
// Used by /materiality (full board) and the dashboard "What Matters Most" block.

export const MAT_WEIGHTS = { significance: 0.3, credibility: 0.15, impact: 0.25, leverage: 0.2, urgency: 0.1 };
export const MAT_RELIABILITY: Record<string, number> = { A: 100, B: 83, C: 67, D: 50, E: 33, F: 17 };
export const clampScore = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export type MatComponents = { significance: number; credibility: number; impact: number; leverage: number; urgency: number };

export function materiality(input: {
  importance: number | null;
  confidence: number | null;
  sourceReliability: string | null;
  sev: number[]; // non-null impact/risk/opportunity scores (1-5)
  leverageInfluence: number; // max influence of linked entities (0-100)
  hasEntities: boolean;
  eventDate: string | null;
  now: number; // Date.now()
}): { components: MatComponents; score: number } {
  const significance = clampScore(((input.importance ?? 2) / 5) * 100);
  const conf = (input.confidence ?? 0.5) * 100;
  const rel = input.sourceReliability ? MAT_RELIABILITY[input.sourceReliability] ?? 60 : 60;
  const credibility = clampScore(0.6 * conf + 0.4 * rel);
  const impact = input.sev.length ? clampScore((Math.max(...input.sev) / 5) * 100) : 55;
  const leverage = input.hasEntities ? clampScore(input.leverageInfluence) : 25;
  let urgency = 50;
  if (input.eventDate) {
    const days = (input.now - new Date(input.eventDate).getTime()) / 86_400_000;
    urgency = clampScore(100 - Math.abs(days) / 2.5, 15, 100);
  }
  const components = { significance, credibility, impact, leverage, urgency };
  const score = Math.round(
    MAT_WEIGHTS.significance * significance +
      MAT_WEIGHTS.credibility * credibility +
      MAT_WEIGHTS.impact * impact +
      MAT_WEIGHTS.leverage * leverage +
      MAT_WEIGHTS.urgency * urgency
  );
  return { components, score };
}

// Domain → scenario lever (name + $T range). Kept here so dashboard + board agree.
export const MAT_DOMAIN_LEVER: Record<string, number> = {
  technology: 4, economy: 0, finance: 2, climate: 3, energy: 0, agriculture: 0, healthcare: 1, regulation: 1,
};

export const MAT_COMPONENT_META: { key: keyof MatComponents; label: string; color: string }[] = [
  { key: "significance", label: "Signifikansi", color: "#10b981" },
  { key: "credibility", label: "Kredibilitas", color: "#38bdf8" },
  { key: "impact", label: "Dampak", color: "#f43f5e" },
  { key: "leverage", label: "Leverage", color: "#a78bfa" },
  { key: "urgency", label: "Urgensi", color: "#f59e0b" },
];
export function topDriver(c: MatComponents) {
  return MAT_COMPONENT_META.reduce((a, b) => (c[b.key] > c[a.key] ? b : a));
}
export function matScoreColor(v: number) {
  return v >= 70 ? "#f43f5e" : v >= 50 ? "#f59e0b" : "#10b981";
}
