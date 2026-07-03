"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";
import { EntityProfileModal } from "@/components/influence/EntityProfileModal";
import { MAT_DOMAIN_LEVER } from "@/lib/materiality";

export type MatEntity = { name: string; slug: string; influence: number };
export type Lever = { name: string; low: number; high: number };
export type MatItem = {
  id: string;
  title: string;
  summary: string | null;
  event_date: string | null;
  domainName: string | null;
  domainIcon: string | null;
  domainCode: string | null;
  typeLabel: string | null;
  score: number;
  components: { significance: number; credibility: number; impact: number; leverage: number; urgency: number };
  why: { impact: number | null; risk: number | null; opportunity: number | null; recommendation: string | null; whyText: string | null };
  entities: MatEntity[];
  linkedCountries: string[];
  chinaThemed: boolean;
};

type Vas = { label: string; range: string } | null;
type Scoped = MatItem & { displayScore: number; relevance: number | null; relReason: string | null; vas: Vas };

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
function flag(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";
  const A = 0x1f1e6;
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65)) + String.fromCodePoint(A + (cc.charCodeAt(1) - 65));
}

// ---- personas (non-country stakeholders): domain weight maps ----
type Persona = { label: string; icon: string; weights: Record<string, number>; boost?: "opportunity" | "risk" | "china" };
const PERSONAS: Record<string, Persona> = {
  investor: { label: "Investor", icon: "trending-up", boost: "opportunity",
    weights: { finance: 1, economy: 0.9, technology: 0.8, energy: 0.7, healthcare: 0.6, regulation: 0.6, agriculture: 0.5, climate: 0.5, geopolitics: 0.5 } },
  supply: { label: "Rantai Pasok", icon: "factory", boost: "china",
    weights: { technology: 1, energy: 1, agriculture: 0.9, economy: 0.8, climate: 0.6, regulation: 0.5, geopolitics: 0.6, finance: 0.4, healthcare: 0.4 } },
  policy: { label: "Pembuat Kebijakan", icon: "landmark", boost: "risk",
    weights: { geopolitics: 1, regulation: 1, climate: 0.9, economy: 0.7, finance: 0.7, energy: 0.7, technology: 0.6, healthcare: 0.6, agriculture: 0.5 } },
};

const COMPS: { key: keyof MatItem["components"]; label: string; color: string }[] = [
  { key: "significance", label: "Signifikansi", color: "#10b981" },
  { key: "credibility", label: "Kredibilitas", color: "#38bdf8" },
  { key: "impact", label: "Dampak", color: "#f43f5e" },
  { key: "leverage", label: "Leverage", color: "#a78bfa" },
  { key: "urgency", label: "Urgensi", color: "#f59e0b" },
];
function topDriver(c: MatItem["components"]) { return COMPS.reduce((a, b) => (c[b.key] > c[a.key] ? b : a)); }
function scoreColor(v: number) { return v >= 70 ? "#f43f5e" : v >= 50 ? "#f59e0b" : "#10b981"; }

function Ring({ value, size = 52 }: { value: number; size?: number }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r, col = scoreColor(value);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.3} fontWeight="600" fill={col} className="tabular-nums">{Math.round(value)}</text>
    </svg>
  );
}

function Breakdown({ c }: { c: MatItem["components"] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
      {COMPS.map((k) => (
        <div key={k.key} className="flex items-center gap-2">
          <span className="w-20 text-[11px] text-[var(--muted)] shrink-0">{k.label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${c[k.key]}%`, background: k.color }} />
          </div>
          <span className="w-6 text-right font-mono text-[11px] tabular-nums" style={{ color: k.color }}>{Math.round(c[k.key])}</span>
        </div>
      ))}
    </div>
  );
}

function Sev({ label, v }: { label: string; v: number }) {
  const col = v >= 4 ? "#f43f5e" : v >= 3 ? "#f59e0b" : "#10b981";
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono" style={{ color: col, background: col + "1a" }}>{label} {v}/5</span>;
}

function WhyBlock({ it, onEntity }: { it: Scoped; onEntity: (slug: string) => void }) {
  return (
    <div className="space-y-3">
      {it.relevance != null && (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.05] px-3 py-2 flex items-center gap-2 text-[11px] flex-wrap">
          <span className="font-mono uppercase tracking-wider text-emerald-700">Relevansi {it.relevance}</span>
          <span className="text-[var(--muted)]">· {it.relReason}</span>
          <span className="ml-auto font-mono text-[var(--muted)]">materialitas dasar {it.score}</span>
        </div>
      )}
      <Breakdown c={it.components} />
      <div className="flex items-center gap-2 flex-wrap">
        {it.why.impact != null && <Sev label="Impact" v={it.why.impact} />}
        {it.why.risk != null && <Sev label="Risk" v={it.why.risk} />}
        {it.why.opportunity != null && <Sev label="Opp" v={it.why.opportunity} />}
        {it.vas && (
          <Link href="/scenarios" className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/[0.06] text-amber-700 px-2.5 py-0.5 text-[11px] hover:border-amber-500/60 transition-colors">
            <Icon name="git-fork" size={11} /> Nilai dipertaruhkan {it.vas.range} · {it.vas.label}
          </Link>
        )}
      </div>
      {(it.why.recommendation || it.why.whyText || it.summary) && (
        <p className="text-sm text-foreground/85 leading-relaxed">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700">Mengapa peduli · </span>
          {it.why.recommendation || it.why.whyText || it.summary}
        </p>
      )}
      {it.entities.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">Aktor:</span>
          {it.entities.map((e) => (
            <button key={e.slug} onClick={() => onEntity(e.slug)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] hover:border-emerald-500/40 transition-colors cursor-pointer">
              {e.name} <span className="font-mono text-emerald-600">{e.influence}</span>
            </button>
          ))}
        </div>
      )}
      <Link href={`/events/${it.id}`} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
        Buka analisis penuh <Icon name="arrow-right" size={13} />
      </Link>
    </div>
  );
}

function vasFor(it: MatItem, levers: Lever[], total: { low: number; high: number } | null): Vas {
  if (!it.chinaThemed) return null;
  const idx = it.domainCode ? MAT_DOMAIN_LEVER[it.domainCode] : undefined;
  if (idx != null && levers[idx]) return { label: levers[idx].name, range: `$${levers[idx].low}–${levers[idx].high}T` };
  if (total) return { label: "keterlibatan China↔dunia", range: `$${total.low}–${total.high}T` };
  return null;
}

function relevanceCountry(it: MatItem, scope: string, exposure: Record<string, number>): { relevance: number; reason: string } {
  if (it.linkedCountries.includes(scope)) return { relevance: 100, reason: "Aktor/aset di negara ini terlibat langsung" };
  const exp = exposure[scope] ?? 0;
  const affinity = Math.round(it.chinaThemed ? exp : exp * 0.4);
  return { relevance: affinity, reason: it.chinaThemed ? `Tema China · eksposur negara ${exp}/100` : `Relevansi tematik tak langsung (eksposur ${exp})` };
}
function relevancePersona(it: MatItem, key: string): { relevance: number; reason: string } {
  const p = PERSONAS[key];
  const w = (it.domainCode ? p.weights[it.domainCode] : undefined) ?? 0.3;
  let base = w * 100;
  if (p.boost === "opportunity" && it.why.opportunity != null) base = 0.7 * base + 0.3 * (it.why.opportunity / 5) * 100;
  if (p.boost === "risk" && it.why.risk != null) base = 0.7 * base + 0.3 * (it.why.risk / 5) * 100;
  if (p.boost === "china" && it.chinaThemed) base = Math.min(100, base + 15);
  return { relevance: Math.round(clamp(base)), reason: `Domain ${it.domainName ?? "—"} · bobot ${p.label}` };
}

function relevanceCustom(it: MatItem, weights: Record<string, number>, boost: string): { relevance: number; reason: string } {
  const w = (it.domainCode ? weights[it.domainCode] : undefined) ?? 50;
  let base = w;
  if (boost === "opportunity" && it.why.opportunity != null) base = 0.7 * base + 0.3 * (it.why.opportunity / 5) * 100;
  if (boost === "risk" && it.why.risk != null) base = 0.7 * base + 0.3 * (it.why.risk / 5) * 100;
  if (boost === "china" && it.chinaThemed) base = Math.min(100, base + 15);
  return { relevance: Math.round(clamp(base)), reason: `Kustom · domain ${it.domainName ?? "—"} bobot ${Math.round(w)}` };
}

export function MaterialityBoard({ items, exposure, stakeholders, levers, scenarioTotal }: {
  items: MatItem[];
  exposure: Record<string, number>;
  stakeholders: { code: string; name: string }[];
  levers: Lever[];
  scenarioTotal: { low: number; high: number } | null;
}) {
  const [scope, setScope] = useState<string>("");
  const [entity, setEntity] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(items[0]?.id ?? null);

  const domainList = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) if (it.domainCode && !m.has(it.domainCode)) m.set(it.domainCode, it.domainName ?? it.domainCode);
    return [...m.entries()].map(([code, name]) => ({ code, name }));
  }, [items]);
  const [customWeights, setCustomWeights] = useState<Record<string, number>>(() => Object.fromEntries(domainList.map((d) => [d.code, 50])));
  const [customBoost, setCustomBoost] = useState<"none" | "opportunity" | "risk" | "china">("none");

  const scopeLabel = scope === "custom" ? "lensa kustom" : scope.startsWith("p:") ? PERSONAS[scope.slice(2)]?.label : scope ? countryName(scope) : null;

  const view: Scoped[] = useMemo(() => {
    const scoped = items.map((it): Scoped => {
      const vas = vasFor(it, levers, scenarioTotal);
      if (!scope) return { ...it, displayScore: it.score, relevance: null, relReason: null, vas };
      const { relevance, reason } =
        scope === "custom" ? relevanceCustom(it, customWeights, customBoost)
        : scope.startsWith("p:") ? relevancePersona(it, scope.slice(2))
        : relevanceCountry(it, scope, exposure);
      return { ...it, relevance, relReason: reason, displayScore: Math.round(0.5 * it.score + 0.5 * relevance), vas };
    });
    return scoped.sort((a, b) => b.displayScore - a.displayScore);
  }, [items, scope, exposure, levers, scenarioTotal, customWeights, customBoost]);

  const featured = view[0];
  const rest = view.slice(1);
  if (!featured) return <p className="text-sm text-[var(--muted)]">Belum ada peristiwa untuk dinilai.</p>;

  return (
    <>
      {/* scope selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)]">Sudut pandang:</span>
        <div className="relative">
          <select value={scope} onChange={(e) => setScope(e.target.value)}
            className="appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-3 pr-8 py-1.5 text-sm cursor-pointer hover:border-emerald-500/40 transition-colors">
            <option value="">🌐 Global (semua)</option>
            <option value="custom">⚙️ Kustom (atur bobot sendiri)</option>
            <optgroup label="Persona">
              {Object.entries(PERSONAS).map(([k, p]) => <option key={k} value={`p:${k}`}>{p.label}</option>)}
            </optgroup>
            <optgroup label="Negara">
              {stakeholders.map((s) => <option key={s.code} value={s.code}>{flag(s.code)} {countryName(s.code)}</option>)}
            </optgroup>
          </select>
          <Icon name="chevron-down" size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
        </div>
        {scopeLabel && (
          <span className="text-[11px] text-[var(--muted)]">
            Diperingkat ulang untuk <span className="text-foreground">{scopeLabel}</span> (materialitas 50% + relevansi 50%)
          </span>
        )}
      </div>

      {/* custom lens builder */}
      {scope === "custom" && (
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
              <Icon name="sliders-horizontal" size={14} /> Atur bobot prioritas Anda
            </div>
            <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden text-[11px]">
              {(["none", "opportunity", "risk", "china"] as const).map((b) => (
                <button key={b} onClick={() => setCustomBoost(b)}
                  className={`px-2.5 py-1 cursor-pointer transition-colors ${customBoost === b ? "bg-emerald-500/15 text-emerald-700 font-medium" : "text-[var(--muted)] hover:bg-[var(--surface)]"}`}>
                  {b === "none" ? "tanpa boost" : b === "opportunity" ? "peluang" : b === "risk" ? "risiko" : "tema China"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {domainList.map((d) => (
              <div key={d.code} className="flex items-center gap-3">
                <span className="w-24 text-xs capitalize truncate shrink-0">{d.name}</span>
                <input type="range" min={0} max={100} value={customWeights[d.code] ?? 50}
                  onChange={(e) => setCustomWeights((w) => ({ ...w, [d.code]: Number(e.target.value) }))}
                  className="flex-1 accent-emerald-500 cursor-pointer" />
                <span className="w-8 text-right font-mono text-[11px] tabular-nums text-emerald-600">{customWeights[d.code] ?? 50}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-3">Geser untuk menaikkan/menurunkan bobot tiap domain; peringkat menyesuaikan langsung. Boost menambah bobot peluang/risiko/tema China.</p>
        </div>
      )}

      {/* featured #1 */}
      <section className="card p-6 md:p-7">
        <div className="flex items-start gap-4">
          <Ring value={featured.displayScore} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="eyebrow"><Icon name="flame" size={11} /> Paling material</span>
              {featured.domainName && <span className="text-[11px] text-[var(--muted)] inline-flex items-center gap-1"><Icon name={featured.domainIcon} size={12} /> {featured.domainName}</span>}
              {featured.event_date && <span className="text-[11px] font-mono text-[var(--muted)]">{featured.event_date}</span>}
            </div>
            <h2 className="display text-xl md:text-2xl font-semibold tracking-tight leading-snug">{featured.title}</h2>
          </div>
        </div>
        <div className="mt-5"><WhyBlock it={featured} onEntity={setEntity} /></div>
      </section>

      {/* ranked list */}
      <div className="space-y-2.5">
        {rest.map((it, i) => {
          const drv = topDriver(it.components);
          const on = expanded === it.id;
          return (
            <div key={it.id} className={`card p-4 transition-colors ${on ? "border-emerald-500/40" : "hover:border-emerald-500/25"}`}>
              <button onClick={() => setExpanded(on ? null : it.id)} className="w-full text-left flex items-center gap-4 cursor-pointer">
                <span className="text-sm font-mono text-[var(--muted)] tabular-nums w-5 shrink-0">{i + 2}</span>
                <Ring value={it.displayScore} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug truncate">{it.title}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {it.domainName && <span className="text-[11px] text-[var(--muted)] inline-flex items-center gap-1"><Icon name={it.domainIcon} size={11} /> {it.domainName}</span>}
                    <span className="text-[10px] font-mono rounded-full px-2 py-0.5" style={{ color: drv.color, background: drv.color + "1a" }}>↑ {drv.label}</span>
                    {it.vas && <span className="text-[10px] font-mono text-amber-700/80">{it.vas.range}</span>}
                  </div>
                </div>
                <Icon name="chevron-right" size={16} className={`text-[var(--muted)] shrink-0 transition-transform ${on ? "rotate-90" : ""}`} />
              </button>
              {on && <div className="mt-4 pt-4 border-t border-[var(--hairline-soft)]"><WhyBlock it={it} onEntity={setEntity} /></div>}
            </div>
          );
        })}
      </div>

      {entity && <EntityProfileModal slug={entity} onClose={() => setEntity(null)} />}
    </>
  );
}
