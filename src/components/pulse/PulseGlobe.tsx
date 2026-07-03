"use client";

import { useState } from "react";
import { GlobeCanvas, type GNode, type GArc } from "./GlobeCanvas";

export type RelItem = { kind: string; src: string; tgt: string; note?: string | null };
export type Relation = { cc: string; name: string; kind: string; w: number; items: RelItem[]; context?: string | null };
export type Detail = { name: string; value: number; relations: Relation[] };

const KIND_LABEL: Record<string, string> = {
  supplies: "memasok", imports_from: "mengimpor dari", exports_to: "mengekspor ke",
  invests_in: "investasi di", competes_with: "bersaing dgn", owns: "memiliki", located_in: "berlokasi di",
};
const KIND_COLOR: Record<string, string> = {
  supplies: "#34d399", imports_from: "#fbbf24", exports_to: "#38bdf8", invests_in: "#a78bfa", competes_with: "#fb7185", owns: "#f0abfc",
};

export function PulseGlobe({ nodes, arcs, details }: { nodes: GNode[]; arcs: GArc[]; details: Record<string, Detail> }) {
  const [sel, setSel] = useState<string | null>(null);
  const d = sel ? details[sel] : null;

  return (
    <>
      <GlobeCanvas nodes={nodes} arcs={arcs} focusCc={sel} onPick={setSel} />

      {d && (
        <div className="absolute bottom-6 right-6 z-30 w-72 max-w-[calc(100%-3rem)] max-h-[calc(100%-3rem)] overflow-y-auto rounded-2xl bg-[#060d0a]/85 backdrop-blur-md border border-emerald-500/30 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] animate-[float-in_0.25s_cubic-bezier(0.16,1,0.3,1)]">
          <button onClick={() => setSel(null)} aria-label="Tutup" className="absolute top-3 right-3 h-7 w-7 grid place-items-center rounded-lg text-emerald-200/60 hover:text-white hover:bg-white/10 transition-colors">✕</button>
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300/70">Fokus negara</div>
          <div className="text-lg font-semibold text-white mt-0.5">{d.name}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-emerald-300">{Math.round(d.value)}</span>
            <span className="text-[11px] text-emerald-200/60">agregat pengaruh</span>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-500/15">
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-200/50 mb-2">Relasi lintas-batas</div>
            {d.relations.length === 0 ? (
              <p className="text-[12px] text-emerald-200/50">Belum ada relasi tercatat.</p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto -mx-1 px-1">
                {d.relations.map((r, i) => (
                  <RelationRow key={`${sel}:${i}`} r={r} focus={d.name} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function RelationRow({ r, focus }: { r: Relation; focus: string }) {
  const [open, setOpen] = useState(false);
  const color = KIND_COLOR[r.kind] ?? "#5eead4";
  return (
    <div className="rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-[12px] text-emerald-50/90 rounded-lg px-1.5 py-1 hover:bg-emerald-400/10 transition-colors cursor-pointer text-left"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="text-emerald-200/60">{KIND_LABEL[r.kind] ?? r.kind}</span>
        <span className="font-medium truncate">{r.name}</span>
        {r.w > 1 && <span className="ml-auto text-[10px] font-mono text-emerald-200/40">×{r.w}</span>}
        <span className={`shrink-0 text-emerald-200/50 transition-transform ${open ? "rotate-90" : ""} ${r.w > 1 ? "ml-1.5" : "ml-auto"}`}>›</span>
      </button>

      {!open && r.context && (
        <p className="ml-8 -mt-0.5 mb-0.5 text-[10.5px] text-emerald-300/60 truncate">{r.context}</p>
      )}

      {open && (
        <div className="mt-1 mb-1.5 ml-3.5 pl-3 border-l border-emerald-500/20 space-y-1.5 animate-[float-in_0.2s_cubic-bezier(0.16,1,0.3,1)]">
          <p className="text-[11px] text-emerald-100/60 leading-snug">
            {focus} memiliki {r.w} relasi dengan {r.name} di knowledge graph:
          </p>
          {r.items.map((it, j) => (
            <div key={j} className="flex items-start gap-1.5 text-[11px]">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[it.kind] ?? "#5eead4" }} />
              <span className="min-w-0">
                <span className="text-emerald-50/90">
                  <span className="font-medium">{it.src}</span>
                  <span className="text-emerald-200/50"> {KIND_LABEL[it.kind] ?? it.kind} </span>
                  <span className="font-medium">{it.tgt}</span>
                </span>
                {it.note && <span className="block text-emerald-300/80 mt-0.5">↳ {it.note}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
