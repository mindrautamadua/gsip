"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type Simulation,
} from "d3-force";
import { Icon } from "./Icon";

export type GNode = {
  id: string;
  name: string;
  type: string;
  category: string | null;
  icon: string | null;
  domain: string | null;
  gics: string | null;
  slug?: string | null;
  ticker?: string | null;
  priceLabel?: string | null;
  changePct?: number | null;
  // mutated by d3:
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

export type GLink = {
  source: string | GNode;
  target: string | GNode;
  label: string;
};

const CATEGORY_COLOR: Record<string, string> = {
  geo: "#38bdf8",
  org: "#a78bfa",
  tech: "#34d399",
  market: "#fbbf24",
  asset: "#fb7185",
  norm: "#e879f9",
  program: "#22d3ee",
};
const DEFAULT_COLOR = "#94a3b8";
const color = (c: string | null) => (c && CATEGORY_COLOR[c]) || DEFAULT_COLOR;

function id(n: string | GNode) {
  return typeof n === "string" ? n : n.id;
}

export function GraphView({ nodes, links }: { nodes: GNode[]; links: GLink[] }) {
  const [, setTick] = useState(0);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [panning, setPanning] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const hubRef = useRef<GNode | null>(null);
  const size = useRef({ w: 900, h: 600 });
  const drag = useRef<{ node: GNode | null; panFrom: { x: number; y: number } | null }>({
    node: null,
    panFrom: null,
  });

  // adjacency for highlight
  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    links.forEach((l) => {
      const s = id(l.source), t = id(l.target);
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s)!.add(t);
      m.get(t)!.add(s);
    });
    return m;
  }, [links]);

  /* eslint-disable react-hooks/immutability -- d3-force owns & mutates node objects (x/y/fx/fy) by design; pinning the hub is intentional */
  useEffect(() => {
    const w = wrapRef.current?.clientWidth ?? 900;
    const h = wrapRef.current?.clientHeight ?? 600;
    size.current = { w, h };

    // pin the most-connected node to canvas center (default focus)
    let hub: GNode | null = null;
    let best = -1;
    for (const n of nodes) {
      const d = adj.get(n.id)?.size ?? 0;
      if (d > best) { best = d; hub = n; }
    }
    hubRef.current = hub;
    if (hub) { hub.fx = w / 2; hub.fy = h / 2; }
    /* eslint-enable react-hooks/immutability */

    const sim = forceSimulation<GNode>(nodes)
      .force("charge", forceManyBody().strength(-420))
      .force(
        "link",
        forceLink<GNode, GLink>(links)
          .id((d) => d.id)
          .distance(130)
          .strength(0.6)
      )
      .force("center", forceCenter(w / 2, h / 2))
      .force("collide", forceCollide(46))
      .on("tick", () => setTick((t) => t + 1));

    simRef.current = sim;
    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links]);

  const onNodePointerDown = (e: React.PointerEvent, n: GNode) => {
    e.stopPropagation();
    drag.current.node = n;
    setSelected(n);
    simRef.current?.alphaTarget(0.3).restart();
  };

  const onBgPointerDown = (e: React.PointerEvent) => {
    drag.current.panFrom = { x: e.clientX, y: e.clientY };
    setPanning(true);
    setSelected(null);
  };

  // Drive drag/pan from window-level listeners so it never depends on SVG
  // event routing or pointer capture. Handlers read live state via refs.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (drag.current.node) {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const v = viewRef.current;
        drag.current.node.fx = (e.clientX - rect.left - v.x) / v.k;
        drag.current.node.fy = (e.clientY - rect.top - v.y) / v.k;
      } else if (drag.current.panFrom) {
        const from = drag.current.panFrom;
        const dx = e.clientX - from.x;
        const dy = e.clientY - from.y;
        drag.current.panFrom = { x: e.clientX, y: e.clientY };
        setView((vw) => ({ ...vw, x: vw.x + dx, y: vw.y + dy }));
      }
    };
    const up = () => {
      if (drag.current.node) {
        drag.current.node.fx = null;
        drag.current.node.fy = null;
        simRef.current?.alphaTarget(0);
      }
      if (drag.current.node || drag.current.panFrom) setPanning(false);
      drag.current.node = null;
      drag.current.panFrom = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const onWheel = (e: React.WheelEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    setView((v) => {
      const k = Math.min(3, Math.max(0.3, v.k * (e.deltaY < 0 ? 1.12 : 0.89)));
      return { k, x: mx - ((mx - v.x) / v.k) * k, y: my - ((my - v.y) / v.k) * k };
    });
  };

  const zoomFit = () => setView({ x: 0, y: 0, k: 1 });

  // Fullscreen the whole graph container (so controls, legend & detail panel
  // come along). Uses the Fullscreen API with a webkit fallback for Safari.
  const toggleFs = () => {
    const el = rootRef.current;
    if (!el) return;
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    if (document.fullscreenElement ?? doc.webkitFullscreenElement) {
      (document.exitFullscreen ?? doc.webkitExitFullscreen)?.call(document);
    } else {
      const elx = el as HTMLElement & { webkitRequestFullscreen?: () => void };
      (elx.requestFullscreen ?? elx.webkitRequestFullscreen)?.call(el);
    }
  };

  // Keep isFs in sync (also catches ESC exit) and recenter the simulation to
  // the new canvas size when entering/leaving fullscreen.
  useEffect(() => {
    const onChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const active = (document.fullscreenElement ?? doc.webkitFullscreenElement) === rootRef.current;
      setIsFs(active);
      setView({ x: 0, y: 0, k: 1 });
      requestAnimationFrame(() => {
        const w = wrapRef.current?.clientWidth ?? size.current.w;
        const h = wrapRef.current?.clientHeight ?? size.current.h;
        size.current = { w, h };
        if (hubRef.current) { hubRef.current.fx = w / 2; hubRef.current.fy = h / 2; }
        const cf = simRef.current?.force("center") as
          | { x: (n: number) => void; y: (n: number) => void }
          | undefined;
        cf?.x(w / 2);
        cf?.y(h / 2);
        simRef.current?.alpha(0.5).restart();
      });
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
    };
  }, []);

  // search — match nodes by name or type
  const q = query.trim().toLowerCase();
  const matchIds = useMemo(() => {
    if (!q) return null;
    const s = new Set<string>();
    nodes.forEach((n) => {
      if (n.name.toLowerCase().includes(q) || n.type.toLowerCase().includes(q)) s.add(n.id);
    });
    return s;
  }, [q, nodes]);
  const matchList = matchIds ? nodes.filter((n) => matchIds.has(n.id)) : [];

  // Center the view on a node (from a search result) and select it.
  const focusNode = (n: GNode) => {
    const { w, h } = size.current;
    const k = Math.max(viewRef.current.k, 1.4);
    setView({ k, x: w / 2 - (n.x ?? 0) * k, y: h / 2 - (n.y ?? 0) * k });
    setSelected(n);
  };

  const activeSet = hover ?? selected?.id;
  const dim = (nid: string) => {
    if (activeSet) return !(nid === activeSet || adj.get(activeSet)?.has(nid));
    if (matchIds) return !matchIds.has(nid);
    return false;
  };
  const linkActive = (l: GLink) =>
    activeSet ? id(l.source) === activeSet || id(l.target) === activeSet : false;
  const linkDim = (l: GLink) =>
    !activeSet && matchIds ? !(matchIds.has(id(l.source)) || matchIds.has(id(l.target))) : false;

  return (
    <div ref={rootRef} className="relative" style={isFs ? { background: "var(--background)" } : undefined}>
      <div
        ref={wrapRef}
        className="card overflow-hidden select-none touch-none"
        style={{
          height: isFs ? "100vh" : "72vh",
          borderRadius: isFs ? 0 : undefined,
          border: isFs ? "none" : undefined,
          cursor: panning ? "grabbing" : "grab",
        }}
        onPointerDown={onBgPointerDown}
        onWheel={onWheel}
      >
        <svg width="100%" height="100%" role="img" aria-label={`Knowledge graph: ${nodes.length} entities and ${links.length} relationships. A full entity list is available on the Entities page.`}>
          {/* transparent pan surface — guarantees empty-canvas pointerdown starts a pan */}
          <rect x="0" y="0" width="100%" height="100%" fill="transparent" style={{ pointerEvents: "all" }} onPointerDown={onBgPointerDown} />
          <defs>
            <marker id="arrow" viewBox="0 -5 10 10" refX="22" refY="0" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,-5L10,0L0,5" style={{ fill: "#334155" }} />
            </marker>
            <marker id="arrow-on" viewBox="0 -5 10 10" refX="22" refY="0" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,-5L10,0L0,5" style={{ fill: "#34d399" }} />
            </marker>
          </defs>
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {/* edges */}
            {links.map((l, i) => {
              const s = l.source as GNode, t = l.target as GNode;
              if (s.x == null || t.x == null) return null;
              const on = linkActive(l);
              const mx = (s.x! + t.x!) / 2, my = (s.y! + t.y!) / 2;
              return (
                <g key={i} opacity={activeSet && !on ? 0.12 : linkDim(l) ? 0.08 : 1}>
                  <line
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke={on ? "#34d399" : "#334155"}
                    strokeWidth={on ? 2 : 1.2}
                    markerEnd={`url(#${on ? "arrow-on" : "arrow"})`}
                  />
                  {(on || view.k > 1.3) && (
                    <text x={mx} y={my - 4} textAnchor="middle" fontSize={9}
                      fill={on ? "#6ee7b7" : "#64748b"} className="font-mono pointer-events-none">
                      {l.label}
                    </text>
                  )}
                </g>
              );
            })}
            {/* nodes */}
            {nodes.map((n) => {
              if (n.x == null) return null;
              const c = color(n.category);
              const faded = dim(n.id);
              const isMatch = matchIds?.has(n.id) ?? false;
              const r = 18;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  opacity={faded ? 0.2 : 1}
                  style={{ cursor: "pointer" }}
                  onPointerDown={(e) => onNodePointerDown(e, n)}
                  onPointerEnter={() => setHover(n.id)}
                  onPointerLeave={() => setHover(null)}
                >
                  {isMatch && <circle r={r + 8} fill="none" stroke="#34d399" strokeWidth={2.5} opacity={0.95} />}
                  <circle r={r + 4} fill={c} opacity={0.12} />
                  <circle r={r} stroke={c} strokeWidth={2} style={{ fill: "var(--panel)" }} />
                  <foreignObject x={-10} y={-10} width={20} height={20} className="pointer-events-none">
                    <div style={{ color: c }} className="flex items-center justify-center">
                      <Icon name={n.icon} size={16} />
                    </div>
                  </foreignObject>
                  <text y={r + 14} textAnchor="middle" fontSize={11}
                    className="pointer-events-none" style={{ fill: "var(--foreground)", paintOrder: "stroke", stroke: "var(--background)", strokeWidth: 3 }}>
                    {n.name.length > 22 ? n.name.slice(0, 21) + "…" : n.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* controls */}
      <div className="absolute top-3 right-3 flex gap-2">
        <button aria-label="Zoom in" onClick={() => setView((v) => ({ ...v, k: Math.min(3, v.k * 1.15) }))} className="ctrl" title="Zoom in">＋</button>
        <button aria-label="Zoom out" onClick={() => setView((v) => ({ ...v, k: Math.max(0.3, v.k * 0.87) }))} className="ctrl" title="Zoom out">－</button>
        <button aria-label="Reset view" onClick={zoomFit} className="ctrl text-xs px-3" title="Reset view">reset</button>
        <button
          aria-label={isFs ? "Exit fullscreen" : "Fullscreen"}
          onClick={toggleFs}
          className="ctrl grid place-items-center"
          title={isFs ? "Exit fullscreen (Esc)" : "Fullscreen"}
        >
          <Icon name={isFs ? "minimize" : "maximize"} size={16} />
        </button>
      </div>

      {/* search */}
      <div className="absolute top-3 left-3 w-64 max-w-[calc(100%-1.5rem)]">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none">
            <Icon name="search" size={15} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matchList[0]) focusNode(matchList[0]);
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Cari entitas…"
            className="gsip-input w-full rounded-lg pl-9 pr-8 py-2 text-sm shadow-sm"
          />
          {query && (
            <button
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-foreground"
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
        {matchIds && (
          <div className="card mt-2 overflow-hidden">
            <div className="px-3 py-1.5 text-[11px] font-mono text-[var(--muted)] border-b border-[var(--border)]">
              {matchList.length} hasil{matchList.length > 8 ? " · 8 teratas" : ""}
            </div>
            {matchList.length > 0 && (
              <div className="max-h-56 overflow-auto">
                {matchList.slice(0, 8).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => focusNode(n)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface)] transition-colors"
                  >
                    <span style={{ color: color(n.category) }} className="shrink-0">
                      <Icon name={n.icon} size={14} />
                    </span>
                    <span className="truncate">{n.name}</span>
                    <span className="ml-auto text-[10px] text-[var(--muted)] shrink-0">{n.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* legend */}
      <div className="absolute bottom-3 left-3 card px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        {Object.entries(CATEGORY_COLOR).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5 capitalize text-[var(--muted)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: v }} /> {k}
          </span>
        ))}
      </div>

      {/* detail panel */}
      {selected && (
        <div className="absolute top-16 right-3 card p-4 w-64">
          <div className="flex items-center gap-2">
            <span style={{ color: color(selected.category) }}>
              <Icon name={selected.icon} size={18} />
            </span>
            <div className="font-medium leading-snug">{selected.name}</div>
          </div>
          <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
            <Row label="Type" value={selected.type} />
            {selected.domain && <Row label="Domain" value={selected.domain} />}
            {selected.gics && <Row label="GICS" value={selected.gics} />}
            <Row label="Relations" value={String(adj.get(selected.id)?.size ?? 0)} />
          </div>
          {selected.priceLabel && (
            <div className="mt-3 pt-3 border-t border-[var(--hairline-soft)] flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
                {selected.priceLabel}
              </span>
              {selected.changePct != null && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-mono ${
                    selected.changePct >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  <Icon name={selected.changePct >= 0 ? "trending-up" : "trending-down"} size={12} />
                  {selected.changePct >= 0 ? "+" : ""}
                  {selected.changePct.toFixed(2)}%
                </span>
              )}
              {selected.ticker && (
                <span className="ml-auto text-[10px] font-mono text-[var(--muted)]/70">{selected.ticker}</span>
              )}
            </div>
          )}
          <Link
            href={selected.slug ? `/entities/${selected.slug}` : "/entities"}
            className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Open entity <Icon name="arrow-right" size={13} />
          </Link>
        </div>
      )}

      <style>{`
        .ctrl{background:var(--panel-2);border:1px solid var(--border);border-radius:10px;height:40px;min-width:40px;color:var(--foreground);cursor:pointer;transition:border-color .2s var(--ease-fluid);}
        .ctrl:hover{border-color:#34d399;}
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="text-foreground/90 text-right">{value}</span>
    </div>
  );
}
