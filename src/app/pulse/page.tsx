import { supabase } from "@/lib/supabase";
import { countryName } from "@/lib/countries";
import { PulseGlobe, type Detail } from "@/components/pulse/PulseGlobe";
import { type GNode, type GArc } from "@/components/pulse/GlobeCanvas";

export const revalidate = 0;
export const metadata = { title: "Global Pulse · GSIP" };

type Attrs = { influence?: number | string } | null;
type EntRow = { id: string; name: string | null; country_code: string | null; attributes: Attrs };
type EdgeRow = { source_entity_id: string; target_entity_id: string; attributes: { what?: string | null; note?: string | null } | null; relationship_types: { code: string } | { code: string }[] | null };

const KIND_LEGEND = [
  { code: "supplies", label: "Memasok", color: "#34d399" },
  { code: "imports_from", label: "Mengimpor", color: "#fbbf24" },
  { code: "exports_to", label: "Mengekspor", color: "#38bdf8" },
  { code: "invests_in", label: "Investasi", color: "#a78bfa" },
  { code: "competes_with", label: "Bersaing", color: "#fb7185" },
];

export default async function PulsePage() {
  const [{ data: ents }, { data: edges }] = await Promise.all([
    supabase.from("entities").select("id,name,country_code,attributes").returns<EntRow[]>(),
    supabase.from("entity_edges").select("source_entity_id,target_entity_id,attributes,relationship_types(code)").returns<EdgeRow[]>(),
  ]);

  const idToCC = new Map<string, string>();
  const idToName = new Map<string, string>();
  const byNation = new Map<string, number>();
  (ents ?? []).forEach((e) => {
    if (e.name) idToName.set(e.id, e.name);
    const cc = e.country_code?.toUpperCase();
    if (!cc || cc.length !== 2) return;
    idToCC.set(e.id, cc);
    byNation.set(cc, (byNation.get(cc) ?? 0) + Number(e.attributes?.influence ?? 0));
  });

  const nodes: GNode[] = [...byNation.entries()].map(([cc, value]) => ({ cc, name: countryName(cc), value }));

  // Only meaningful geoeconomic relations become cross-border arcs.
  const ALLOWED = new Set(["supplies", "imports_from", "exports_to", "invests_in", "competes_with", "owns"]);

  // cross-border edges from the knowledge graph, kept concrete per country pair
  // so the focus panel can expand each relation into its underlying entity links.
  const pairEdges = new Map<string, { code: string; s: string; t: string; note: string | null }[]>();
  (edges ?? []).forEach((e) => {
    const a = idToCC.get(e.source_entity_id), b = idToCC.get(e.target_entity_id);
    if (!a || !b || a === b) return;
    const rt = e.relationship_types;
    const code = (Array.isArray(rt) ? rt[0]?.code : rt?.code) ?? "other";
    if (!ALLOWED.has(code)) return;
    const key = [a, b].sort().join("|");
    const list = pairEdges.get(key) ?? [];
    list.push({ code, s: e.source_entity_id, t: e.target_entity_id, note: e.attributes?.what ?? e.attributes?.note ?? null });
    pairEdges.set(key, list);
  });
  const arcs: GArc[] = [...pairEdges.entries()].map(([k, list]) => {
    const [a, b] = k.split("|");
    const kinds = new Map<string, number>();
    list.forEach((x) => kinds.set(x.code, (kinds.get(x.code) ?? 0) + 1));
    const kind = [...kinds.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
    return { a, b, w: list.length, kind };
  });

  // per-country detail for the click panel
  const details: Record<string, Detail> = {};
  for (const [cc, value] of byNation.entries()) {
    const relations = arcs
      .filter((a) => a.a === cc || a.b === cc)
      .map((a) => {
        const other = a.a === cc ? a.b : a.a;
        const key = [cc, other].sort().join("|");
        const items = (pairEdges.get(key) ?? []).map((pe) => ({
          kind: pe.code,
          src: idToName.get(pe.s) ?? "—",
          tgt: idToName.get(pe.t) ?? "—",
          note: pe.note,
        }));
        const context = items.find((it) => it.note)?.note ?? null;
        return { cc: other, name: countryName(other), kind: a.kind ?? "other", w: a.w, items, context };
      })
      .sort((x, y) => y.w - x.w)
      .slice(0, 6);
    details[cc] = { name: countryName(cc), value, relations };
  }

  return (
    <div className="p-4 md:p-6">
      <section className="relative h-[80vh] min-h-[540px] overflow-hidden rounded-[2rem] ring-1 ring-emerald-500/20 shadow-[0_50px_140px_-50px_rgba(16,185,129,0.45)] bg-[#05080a]">
        <PulseGlobe nodes={nodes} arcs={arcs} details={details} />
        {/* soft inner vignette so rounded edges melt into the scene */}
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] shadow-[inset_0_0_120px_40px_rgba(5,8,10,0.9)]" />

        {/* cinematic overlay (pointer-events-none so drag reaches the canvas) */}
        <div className="absolute inset-0 pointer-events-none p-6 md:p-12 flex flex-col">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-300/80 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live · Knowledge Graph
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-white leading-[1.03]">Global Pulse</h1>
            <p className="text-sm md:text-base text-emerald-100/70 mt-4 leading-relaxed">
              Denyut dunia dari knowledge graph GSIP: tiap simpul adalah bobot pengaruh sebuah negara, tiap busur berdenyut adalah relasi lintas-batas — pasokan, ketergantungan, ekspor, pengaruh. Seret untuk memutar bola dunia.
            </p>
          </div>

          <div className="mt-auto flex flex-wrap items-end gap-8">
            {[
              { v: nodes.length, l: "Negara aktif" },
              { v: arcs.length, l: "Busur relasi" },
              { v: (edges ?? []).length, l: "Edge graf" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-3xl md:text-4xl font-semibold tabular-nums text-white">{s.v}</div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-200/60 mt-1">{s.l}</div>
              </div>
            ))}
            <div className="text-[11px] font-mono text-emerald-200/50 flex items-center gap-2">
              <span className="inline-block h-6 w-6 rounded-full border border-emerald-300/30 grid place-items-center">↻</span>
              <span className="hidden sm:inline">seret memutar · klik negara untuk fokus</span>
            </div>
          </div>
        </div>

        {/* relation legend */}
        <div className="absolute top-6 right-6 pointer-events-none hidden md:flex flex-col gap-1.5 rounded-2xl bg-black/25 backdrop-blur-sm border border-emerald-500/15 px-3.5 py-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-200/60 mb-0.5">Jenis relasi</div>
          {KIND_LEGEND.map((k) => (
            <div key={k.code} className="flex items-center gap-2 text-[11px] text-emerald-100/80">
              <span className="h-2 w-4 rounded-full" style={{ background: k.color }} /> {k.label}
            </div>
          ))}
        </div>
      </section>

      <div className="px-6 md:px-10 py-10 max-w-6xl">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: "Simpul = pengaruh negara", d: "Ukuran & kilau tiap titik sebanding dengan agregat skor pengaruh entitas yang berbasis di negara itu." },
            { t: "Busur = relasi lintas-batas", d: "Ditarik dari edge knowledge graph yang menghubungkan dua entitas di negara berbeda — makin tebal, makin banyak relasi." },
            { t: "Denyut = arah aliran", d: "Titik cahaya yang bergerak menyusuri busur memberi rasa arah & kehidupan pada jaringan strategis global." },
          ].map((c) => (
            <div key={c.t} className="card p-5">
              <div className="font-medium text-sm">{c.t}</div>
              <p className="text-[13px] text-[var(--muted)] mt-1.5 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-mono text-[var(--muted)]/70 mt-6">
          Data langsung dari knowledge graph GSIP (entitas + entity_edges). Bola dunia dirender dengan Canvas 2D murni — tanpa library eksternal.
        </p>
      </div>
    </div>
  );
}
