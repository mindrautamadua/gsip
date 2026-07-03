"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";

export type TaxNode = {
  id: string;
  code: string;
  name: string;
  count: number; // rolled-up entity count (leaf = own count)
  isLeaf?: boolean;
  children?: TaxNode[];
};

// GICS sector (code) -> icon + categorical hue. Codes are the MSCI/S&P standard.
const SECTOR_META: Record<string, { icon: string; color: string }> = {
  "10": { icon: "flame", color: "#f97316" }, // Energy
  "15": { icon: "gem", color: "#14b8a6" }, // Materials
  "20": { icon: "factory", color: "#64748b" }, // Industrials
  "25": { icon: "shopping-bag", color: "#f43f5e" }, // Consumer Discretionary
  "30": { icon: "shopping-cart", color: "#84cc16" }, // Consumer Staples
  "35": { icon: "heart-pulse", color: "#ef4444" }, // Health Care
  "40": { icon: "landmark", color: "#10b981" }, // Financials
  "45": { icon: "cpu", color: "#0ea5e9" }, // Information Technology
  "50": { icon: "radio-tower", color: "#8b5cf6" }, // Communication Services
  "55": { icon: "zap", color: "#eab308" }, // Utilities
  "60": { icon: "building-2", color: "#6366f1" }, // Real Estate
};
const metaFor = (code: string) => SECTOR_META[code] ?? { icon: "circle", color: "var(--accent)" };

const norm = (s: string) => s.toLowerCase();
function nodeMatches(n: TaxNode, q: string): boolean {
  if (!q) return true;
  if (norm(n.name).includes(q) || norm(n.code).includes(q)) return true;
  return (n.children ?? []).some((c) => nodeMatches(c, q));
}

// bold the matched substring
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = norm(text).indexOf(q);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-[var(--accent)]/20 text-foreground rounded px-0.5">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function Row({
  node,
  level,
  color,
  q,
  open,
  toggle,
  siblingMax,
}: {
  node: TaxNode;
  level: number;
  color: string;
  q: string;
  open: Set<string>;
  toggle: (id: string) => void;
  siblingMax: number;
}) {
  const hasChildren = !!node.children?.length;
  const isOpen = q ? true : open.has(node.id);
  const childMax = Math.max(1, ...(node.children ?? []).map((c) => c.count));
  const barPct = siblingMax > 0 ? (node.count / siblingMax) * 100 : 0;

  return (
    <div>
      <button
        onClick={() => hasChildren && toggle(node.id)}
        style={{ paddingLeft: `${level * 20 + 14}px` }}
        className={`group w-full flex items-center gap-2.5 py-2 pr-4 text-left transition-colors ${
          hasChildren ? "hover:bg-[var(--surface)] cursor-pointer" : "cursor-default"
        }`}
      >
        {/* disclosure */}
        {hasChildren ? (
          <Icon
            name={isOpen ? "chevron-down" : "chevron-right"}
            size={14}
            className="text-[var(--muted)] shrink-0 transition-transform"
          />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {/* level marker */}
        {level === 0 ? (
          <span
            className="h-6 w-6 shrink-0 rounded-lg grid place-items-center"
            style={{ background: `${color}1f`, color }}
          >
            <Icon name={metaFor(node.code).icon} size={13} strokeWidth={1.8} />
          </span>
        ) : (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color, opacity: level === 1 ? 0.7 : 0.4 }} />
        )}

        {/* code */}
        <span className="font-mono text-[11px] tabular-nums shrink-0 w-12 text-[var(--muted)]">{node.code}</span>

        {/* name */}
        <span className={level === 0 ? "font-medium truncate" : "text-sm truncate"}>
          <Highlight text={node.name} q={q} />
        </span>

        {/* count + relative bar */}
        {node.count > 0 && (
          <span className="ml-auto flex items-center gap-2 shrink-0">
            <span className="hidden sm:block h-1.5 w-16 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <span className="block h-full rounded-full" style={{ width: `${barPct}%`, background: color }} />
            </span>
            <span className="text-[11px] font-mono tabular-nums text-[var(--muted)] w-6 text-right">{node.count}</span>
          </span>
        )}
      </button>

      {isOpen && hasChildren && (
        <div className="border-l" style={{ borderColor: "var(--border)", marginLeft: `${level * 20 + 24}px` }}>
          {node
            .children!.filter((c) => nodeMatches(c, q))
            .map((c) => (
              <Row key={c.id} node={c} level={level + 1} color={color} q={q} open={open} toggle={toggle} siblingMax={childMax} />
            ))}
        </div>
      )}
    </div>
  );
}

export function TaxonomyExplorer({ roots }: { roots: TaxNode[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const treeRef = useRef<HTMLDivElement>(null);
  const q = norm(query.trim());

  const allParentIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (n: TaxNode) => {
      if (n.children?.length) {
        ids.push(n.id);
        n.children.forEach(walk);
      }
    };
    roots.forEach(walk);
    return ids;
  }, [roots]);

  const totals = useMemo(() => {
    const groups = roots.reduce((s, r) => s + (r.children?.length ?? 0), 0);
    const industries = roots.reduce(
      (s, r) => s + (r.children ?? []).reduce((ss, g) => ss + (g.children?.length ?? 0), 0),
      0
    );
    const entities = roots.reduce((s, r) => s + r.count, 0);
    return { sectors: roots.length, groups, industries, entities };
  }, [roots]);

  const rootMax = Math.max(1, ...roots.map((r) => r.count));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const focusSector = (id: string) => {
    setOpen((prev) => new Set(prev).add(id));
    setQuery("");
    requestAnimationFrame(() => {
      document.getElementById(`tax-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const visibleRoots = roots.filter((r) => nodeMatches(r, q));

  return (
    <div className="space-y-8">
      {/* summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "GICS Sectors", value: totals.sectors, icon: "layers", tone: "var(--accent)" },
          { label: "Industry Groups", value: totals.groups, icon: "network", tone: "#0ea5e9" },
          { label: "Industries", value: totals.industries, icon: "git-fork", tone: "#8b5cf6" },
          { label: "Mapped Entities", value: totals.entities, icon: "share-2", tone: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <span className="h-9 w-9 shrink-0 rounded-xl grid place-items-center" style={{ background: `${s.tone}1f`, color: s.tone }}>
              <Icon name={s.icon} size={16} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <div className="display text-2xl font-semibold tabular-nums leading-none">{s.value}</div>
              <div className="text-[11px] text-[var(--muted)] mt-1 truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* sector bento grid */}
      <div>
        <div className="eyebrow mb-3">11 GICS Sectors</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {roots.map((r) => {
            const m = metaFor(r.code);
            const groups = r.children?.length ?? 0;
            const inds = (r.children ?? []).reduce((s, g) => s + (g.children?.length ?? 0), 0);
            return (
              <button
                key={r.id}
                onClick={() => focusSector(r.id)}
                className="bezel text-left active:scale-[0.99] transition-transform duration-300"
              >
                <div className="core h-full p-4">
                  <div className="flex items-start gap-2.5">
                    <span className="h-9 w-9 shrink-0 rounded-xl grid place-items-center" style={{ background: `${m.color}1f`, color: m.color }}>
                      <Icon name={m.icon} size={17} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-[var(--muted)]">{r.code}</div>
                      <div className="text-[13px] font-medium leading-tight truncate">{r.name}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted)] font-mono">
                    <span>{groups}g · {inds}i</span>
                    <span className="tabular-nums" style={{ color: r.count ? m.color : undefined }}>{r.count} ent</span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(r.count / rootMax) * 100}%`, background: m.color }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <Icon name="search" size={15} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari sektor, grup, atau industri…"
            className="gsip-input w-full rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={() => setOpen(new Set(allParentIds))}
          className="text-xs font-medium px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] transition-colors inline-flex items-center gap-1.5"
        >
          <Icon name="unfold-vertical" size={14} /> Expand all
        </button>
        <button
          onClick={() => setOpen(new Set())}
          className="text-xs font-medium px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] transition-colors inline-flex items-center gap-1.5"
        >
          <Icon name="fold-vertical" size={14} /> Collapse all
        </button>
      </div>

      {/* tree */}
      <div ref={treeRef} className="card divide-y divide-[var(--border)] overflow-hidden">
        {visibleRoots.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--muted)]">
            Tidak ada hasil untuk “{query}”.
          </div>
        ) : (
          visibleRoots.map((r) => (
            <div key={r.id} id={`tax-${r.id}`} className="py-1 scroll-mt-24">
              <Row node={r} level={0} color={metaFor(r.code).color} q={q} open={open} toggle={toggle} siblingMax={rootMax} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
