"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export type DomainEntity = { id: string; name: string; slug: string; type: string | null; icon: string | null };
export type DomainEvent = { id: string; title: string; date: string | null; importance: number | null };
export type DomainCard = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  entities: DomainEntity[];
  events: DomainEvent[];
};

export function DomainGrid({ domains }: { domains: DomainCard[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = domains.find((d) => d.id === openId) ?? null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {domains.map((d) => (
          <button
            key={d.id}
            onClick={() => setOpenId(d.id)}
            className="card p-5 text-left group hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-accent shrink-0">
                <Icon name={d.icon} size={20} />
              </div>
              <div className="font-medium group-hover:text-accent transition-colors">{d.name}</div>
            </div>
            {d.description && (
              <p className="text-sm text-[var(--muted)] mt-3 line-clamp-2">{d.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4 text-xs font-mono text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <Icon name="share-2" size={13} /> {d.entities.length} entities
              </span>
              <span className="inline-flex items-center gap-1">
                <Icon name="radar" size={13} /> {d.events.length} events
              </span>
              <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-accent">
                <Icon name="arrow-up-right" size={14} />
              </span>
            </div>
          </button>
        ))}
      </div>
      {open && <DomainModal domain={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

const IMPORTANCE_TONE = ["bg-[var(--surface-2)]", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-orange-500", "bg-rose-500"];

function DomainModal({ domain, onClose }: { domain: DomainCard; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={domain.name}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 backdrop-blur-sm p-4 sm:p-8"
    >
      <div className="relative w-full max-w-2xl my-4 sm:my-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)] animate-[float-in_0.28s_cubic-bezier(0.16,1,0.3,1)]">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 h-8 w-8 grid place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-foreground transition-colors"
        >
          <Icon name="x" size={16} />
        </button>

        {/* header */}
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="eyebrow">Layer 1 · Domain</span>
            <span className="text-[11px] font-mono text-[var(--muted)]">{domain.code}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-accent shrink-0">
              <Icon name={domain.icon} size={24} />
            </div>
            <h2 className="display text-2xl font-semibold tracking-tight">{domain.name}</h2>
          </div>
          {domain.description && (
            <p className="text-sm text-[var(--muted)] mt-4 leading-relaxed">{domain.description}</p>
          )}
          <div className="flex gap-6 mt-4 text-xs font-mono text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5"><Icon name="share-2" size={13} /> {domain.entities.length} entities</span>
            <span className="inline-flex items-center gap-1.5"><Icon name="radar" size={13} /> {domain.events.length} events</span>
          </div>
        </div>

        {/* body */}
        <div className="p-6 grid gap-6 md:grid-cols-2 max-h-[60vh] overflow-y-auto">
          {/* entities */}
          <section>
            <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">Entities</div>
            {domain.entities.length === 0 ? (
              <p className="text-sm text-[var(--muted)]/70">Belum ada entitas.</p>
            ) : (
              <div className="space-y-1">
                {domain.entities.map((e) => (
                  <Link
                    key={e.id}
                    href={`/entities/${e.slug}`}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-[var(--surface)] transition-colors group"
                  >
                    <span className="h-6 w-6 shrink-0 rounded-md grid place-items-center bg-[var(--surface-2)] text-accent">
                      <Icon name={e.icon} size={13} />
                    </span>
                    <span className="text-sm truncate group-hover:text-accent transition-colors">{e.name}</span>
                    {e.type && <span className="ml-auto text-[10px] text-[var(--muted)]/70 shrink-0">{e.type}</span>}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* events */}
          <section>
            <div className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-3">Recent Events</div>
            {domain.events.length === 0 ? (
              <p className="text-sm text-[var(--muted)]/70">Belum ada peristiwa.</p>
            ) : (
              <div className="space-y-1">
                {domain.events.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-[var(--surface)] transition-colors group"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${IMPORTANCE_TONE[ev.importance ?? 0] ?? IMPORTANCE_TONE[0]}`}
                      title={`importance ${ev.importance ?? "—"}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm leading-snug group-hover:text-accent transition-colors line-clamp-2">{ev.title}</span>
                      {ev.date && <span className="block text-[10px] font-mono text-[var(--muted)]/70 mt-0.5">{ev.date}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
