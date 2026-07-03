"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { countryName } from "@/lib/countries";

type Indicator = { name: string; source: string | null; unit: string | null; direction: string; normalized: number; raw: number | null };
type Pillar = { name: string; description: string | null; weight: number; score: number | null; indicators: Indicator[] };
type Dimension = { code: string; label: string; description: string | null; score: number | null; pillars: Pillar[] };
type Detail = {
  code: string; name: string; iso2: string | null; region: string | null; income_group: string | null;
  composite: number | null; dimensions: Dimension[];
};

const AXIS_COLOR: Record<string, string> = { status: "#34d399", cap: "#38bdf8", fut: "#fbbf24" };
function axisColor(code: string): string {
  if (code.startsWith("cap")) return AXIS_COLOR.cap;
  if (code.startsWith("fut")) return AXIS_COLOR.fut;
  return AXIS_COLOR.status;
}
function scoreColor(v: number | null): string {
  if (v == null) return "var(--muted)";
  if (v >= 65) return "#10b981";
  if (v >= 45) return "#f59e0b";
  return "#f43f5e";
}
function flag(iso2: string | null): string {
  if (!iso2 || iso2.length !== 2) return "";
  const A = 0x1f1e6;
  const cc = iso2.toUpperCase();
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65)) + String.fromCodePoint(A + (cc.charCodeAt(1) - 65));
}

function Bar({ value, color, h = "h-1.5" }: { value: number; color: string; h?: string }) {
  return (
    <div className={`${h} w-full rounded-full bg-[var(--surface-2)] overflow-hidden`}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function NationModal({ code, onClose }: { code: string; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let alive = true;
    fetch(`/api/nation/${code}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Gagal memuat rincian"))))
      .then((j) => { if (alive) setD(j); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [code, onClose]);

  return (
    <div
      role="dialog" aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 backdrop-blur-sm p-4 sm:p-8"
    >
      <div className="relative w-full max-w-2xl my-4 sm:my-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)] animate-[float-in_0.28s_cubic-bezier(0.16,1,0.3,1)]">
        <button
          onClick={onClose} aria-label="Tutup"
          className="absolute right-3 top-3 z-10 h-9 w-9 rounded-xl grid place-items-center text-[var(--muted)] bg-[var(--surface)] border border-[var(--hairline)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors"
        >
          <Icon name="x" size={17} />
        </button>

        {error ? (
          <div className="p-10 text-center text-sm text-rose-600"><Icon name="alert-triangle" size={20} className="mx-auto mb-2" /> {error}</div>
        ) : !d ? (
          <div className="p-6 md:p-8 space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <div className="grid grid-cols-3 gap-3">{[0,1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div>
            {/* header */}
            <div className="px-6 md:px-8 pt-8 pb-6 border-b border-[var(--hairline-soft)]">
              <div className="flex items-center gap-3">
                <span className="text-3xl leading-none">{flag(d.iso2)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="eyebrow">National Excellence Index</span>
                    {d.region && <span className="text-[11px] text-[var(--muted)]">{d.region}</span>}
                  </div>
                  <h2 className="display text-2xl font-semibold tracking-tight leading-tight mt-1">{d.name}</h2>
                  <div className="text-[11px] text-[var(--muted)]">{countryName(d.iso2)}{d.income_group ? ` · ${d.income_group}` : ""}</div>
                </div>
                {d.composite != null && (
                  <div className="text-right shrink-0">
                    <div className="display text-3xl font-semibold tabular-nums" style={{ color: scoreColor(d.composite) }}>{d.composite.toFixed(0)}</div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted)]">composite</div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 md:px-8 py-6 space-y-6">
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Index tersusun dari 3 sumbu → 18 pilar → indikator lembaga internasional. Klik tiap pilar untuk melihat indikator pembentuknya (nilai ternormalisasi 0–100).
              </p>

              {d.dimensions.map((dim) => (
                <section key={dim.code}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: axisColor(dim.code) }} />
                      <h3 className="text-sm font-semibold">{dim.label}</h3>
                    </div>
                    <span className="font-mono text-sm tabular-nums" style={{ color: scoreColor(dim.score) }}>
                      {dim.score != null ? dim.score.toFixed(0) : "—"}
                    </span>
                  </div>
                  {dim.description && <p className="text-[11px] text-[var(--muted)] mb-3">{dim.description}</p>}

                  <div className="space-y-1.5">
                    {dim.pillars.map((p, pi) => (
                      <details key={pi} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] group">
                        <summary className="flex items-center gap-3 px-3 py-2 cursor-pointer list-none">
                          <Icon name="chevron-right" size={14} className="text-[var(--muted)] transition-transform group-open:rotate-90 shrink-0" />
                          <span className="text-sm flex-1 min-w-0 truncate">{p.name}</span>
                          {p.indicators.length > 0 && (
                            <span className="text-[10px] font-mono text-[var(--muted)]/70 shrink-0">{p.indicators.length} ind</span>
                          )}
                          <div className="w-20 shrink-0"><Bar value={p.score ?? 0} color={scoreColor(p.score)} /></div>
                          <span className="w-7 text-right font-mono text-xs tabular-nums shrink-0" style={{ color: scoreColor(p.score) }}>
                            {p.score != null ? p.score.toFixed(0) : "—"}
                          </span>
                        </summary>
                        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[var(--hairline-soft)]">
                          {p.description && <p className="text-[11px] text-[var(--muted)] pt-2">{p.description}</p>}
                          {p.indicators.length === 0 ? (
                            <p className="text-[11px] text-[var(--muted)] pt-2">Belum ada indikator berdata untuk pilar ini.</p>
                          ) : (
                            p.indicators.map((ind, ii) => (
                              <div key={ii} className="flex items-center gap-3 pt-1">
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs truncate">{ind.name}</div>
                                  {ind.source && <div className="text-[10px] text-[var(--muted)]/70 truncate">{ind.source}</div>}
                                </div>
                                <div className="w-24 shrink-0"><Bar value={ind.normalized} color={scoreColor(ind.normalized)} /></div>
                                <span className="w-7 text-right font-mono text-[11px] tabular-nums shrink-0 text-[var(--muted)]">{ind.normalized.toFixed(0)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
