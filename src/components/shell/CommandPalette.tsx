"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Icon } from "@/components/Icon";
import { NAV } from "./nav";
import { useUI } from "./ui-context";

type Item = { title: string; sub?: string; href: string; icon: string; group: string };

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useUI();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [entities, setEntities] = useState<{ id: string; name: string; entity_types: { label: string } | null }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // lazy-load searchable data on first open
  useEffect(() => {
    if (!paletteOpen || loaded) return;
    (async () => {
      const [ev, en] = await Promise.all([
        supabase.from("events").select("id,title").limit(200),
        supabase.from("entities").select("id,name,entity_types(label)").limit(300),
      ]);
      setEvents(ev.data ?? []);
      setEntities((en.data as unknown as typeof entities) ?? []);
      setLoaded(true);
    })();
  }, [paletteOpen, loaded]);

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [paletteOpen]);

  const results = useMemo<Item[]>(() => {
    const term = q.trim().toLowerCase();
    const pages: Item[] = NAV.map((n) => ({ title: n.label, href: n.href, icon: n.icon, group: "Pages" }));
    const evItems: Item[] = events.map((e) => ({
      title: e.title,
      href: `/events/${e.id}`,
      icon: "radar",
      group: "Events",
    }));
    const enItems: Item[] = entities.map((e) => ({
      title: e.name,
      sub: e.entity_types?.label,
      href: "/entities",
      icon: "share-2",
      group: "Entities",
    }));
    const all = [...pages, ...evItems, ...enItems];
    if (!term) return [...pages, ...evItems.slice(0, 4), ...enItems.slice(0, 4)];
    return all.filter((i) => i.title.toLowerCase().includes(term)).slice(0, 24);
  }, [q, events, entities]);

  useEffect(() => {
    if (active >= results.length) setActive(0);
  }, [results, active]);

  if (!paletteOpen) return null;

  const go = (href: string) => {
    setPaletteOpen(false);
    router.push(href);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setPaletteOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active].href); }
  };

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={() => setPaletteOpen(false)}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        role="dialog"
        aria-label="Command palette"
        className="relative w-full max-w-xl bezel"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="core overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--hairline-soft)]">
            <Icon name="search" size={18} className="text-[var(--muted)]" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Cari halaman, event, atau entity…"
              aria-label="Search"
              className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[var(--muted)]"
            />
            <kbd className="text-[10px] font-mono text-[var(--muted)] border border-[var(--hairline)] rounded-md px-1.5 py-0.5">
              ESC
            </kbd>
          </div>

          <div className="max-h-[52vh] overflow-y-auto py-2">
            {results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                {loaded ? "Tidak ada hasil." : "Memuat…"}
              </div>
            )}
            {results.map((r, i) => {
              const header = r.group !== lastGroup ? ((lastGroup = r.group), r.group) : null;
              return (
                <div key={`${r.href}-${i}`}>
                  {header && (
                    <div className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]/70">
                      {header}
                    </div>
                  )}
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors duration-150 ${
                      i === active ? "bg-emerald-400/10 text-accent" : "text-foreground/90 hover:bg-[var(--surface)]"
                    }`}
                  >
                    <Icon name={r.icon} size={16} className={i === active ? "text-accent" : "text-[var(--muted)]"} />
                    <span className="flex-1 truncate text-sm">{r.title}</span>
                    {r.sub && <span className="text-[11px] font-mono text-[var(--muted)]">{r.sub}</span>}
                    {i === active && <Icon name="corner-down-left" size={14} className="text-accent/80" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
