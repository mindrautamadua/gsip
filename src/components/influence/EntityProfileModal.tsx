"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";
import { logoUrls } from "@/lib/logo";
import { Skeleton } from "@/components/Skeleton";
import { EntityLogo } from "@/components/EntityLogo";

export type Profile = {
  name: string;
  slug: string;
  country_code: string | null;
  description: string | null;
  title: string | null;
  influence: number;
  fg500_rank: number | null;
  domain: string | null;
  breakdown: { degree?: number; event_impact?: number; market_cap_usd_bn?: number | null } | null;
  type: string | null;
  icon: string;
  wiki: string | null;
  photo: string | null;
  gallery: { url: string; caption: string | null }[];
  insights: { label: string; value: string }[];
  benchmark: {
    scope: string;
    count: number;
    dims: { key: string; label: string; rank: number; of: number; percentile: number; value: number; leaderName: string; leaderValue: number; betterLow: boolean }[];
    peers: { name: string; slug: string; cc: string | null; domain: string | null; marketCap: number | null; influence: number; fg500: number | null; self: boolean }[];
  } | null;
  leads: { name: string; slug: string; icon: string | null }[];
  relationships: { rel: string; name: string; slug: string; icon: string | null; outgoing: boolean }[];
  events: { id: string; title: string; event_date: string | null; role: string; icon: string }[];
};

const ROLE_LABEL: Record<string, string> = {
  initiated_by: "Initiated by", impacts: "Impacts", involves: "Involves", occurs_in: "Occurs in", target_of: "Target of",
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function Avatar({ src, domain, name, size = 52 }: { src?: string | null; domain?: string | null; name: string; size?: number }) {
  // photo (wiki portrait) first, then company logo from domain, then initials
  const chain = [src, ...logoUrls(domain)].filter((s): s is string => !!s);
  const [idx, setIdx] = useState(0);
  const url = chain[idx];
  const isPhoto = !!src && idx === 0;

  if (!url) {
    return (
      <div className="rounded-full grid place-items-center bg-gradient-to-br from-emerald-400/30 to-amber-400/30 border border-[var(--border)] text-accent font-semibold"
        style={{ width: size, height: size, fontSize: size * 0.32 }}>
        {initials(name)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      onError={() => setIdx((i) => i + 1)}
      className={
        isPhoto
          ? "rounded-full object-cover border border-[var(--border)]"
          : "rounded-2xl object-contain bg-white border border-[var(--border)] p-1.5"
      }
      style={{ width: size, height: size }}
    />
  );
}

export function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-600" style={{ width: `${value}%` }} />
    </div>
  );
}

// Full entity profile modal — fetches /api/influence/[slug] on open. Works for
// any entity (person, org, company, nation): person-only sections hide when empty.
export function EntityProfileModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let alive = true;
    fetch(`/api/influence/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Gagal memuat profil"))))
      .then((d) => { if (alive) setProfile(d); })
      .catch((err) => { if (alive) setError(err.message); });
    return () => {
      alive = false;
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [slug, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 backdrop-blur-sm p-4 sm:p-8"
    >
      <div className="relative w-full max-w-2xl my-4 sm:my-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)] animate-[float-in_0.28s_cubic-bezier(0.16,1,0.3,1)]">
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-3 top-3 z-10 h-9 w-9 rounded-xl grid place-items-center text-[var(--muted)] bg-[var(--surface)] border border-[var(--hairline)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors"
        >
          <Icon name="x" size={17} />
        </button>

        {error ? (
          <div className="p-10 text-center text-sm text-rose-600">
            <Icon name="alert-triangle" size={20} className="mx-auto mb-2" /> {error}
          </div>
        ) : !profile ? (
          <div>
            <div className="px-6 md:px-8 pt-8 pb-6 border-b border-[var(--hairline-soft)] flex items-start gap-4">
              <Skeleton className="h-[76px] w-[76px] rounded-full shrink-0" />
              <div className="flex-1 space-y-2.5 pt-1">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2 w-40 rounded-full mt-1" />
              </div>
            </div>
            <div className="px-6 md:px-8 py-6 space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="px-6 md:px-8 pt-8 pb-6 border-b border-[var(--hairline-soft)] flex items-start gap-4">
              <Avatar src={profile.photo} domain={profile.domain} name={profile.name} size={76} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="eyebrow"><Icon name={profile.icon} size={12} className="text-accent" /> {profile.type}</span>
                  {profile.country_code && <span className="eyebrow">{countryName(profile.country_code)}</span>}
                  {profile.fg500_rank && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-amber-700">
                      <Icon name="award" size={11} /> Fortune Global 500 · #{profile.fg500_rank}
                    </span>
                  )}
                </div>
                <h2 className="display text-2xl font-semibold tracking-tight leading-tight pr-8">{profile.name}</h2>
                {profile.title && <p className="text-sm text-[var(--muted)] mt-1">{profile.title}</p>}
                {profile.influence > 0 && (
                  <div className="flex items-center gap-2 mt-3 max-w-xs">
                    <Bar value={profile.influence} />
                    <span className="text-xs font-mono tabular-nums text-accent w-14 text-right">{profile.influence}/100</span>
                  </div>
                )}
                {profile.breakdown && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5" title="Signals behind the score">
                    <BdChip icon="waypoints" label="graph" value={profile.breakdown.degree ?? 0} />
                    <BdChip icon="radar" label="events" value={profile.breakdown.event_impact ?? 0} />
                    {profile.breakdown.market_cap_usd_bn ? (
                      <BdChip icon="landmark" label="mkt cap" value={`$${profile.breakdown.market_cap_usd_bn}bn`} />
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 md:px-8 py-6 space-y-6">
              {profile.description && <p className="text-sm leading-relaxed text-foreground/90">{profile.description}</p>}

              {profile.benchmark && (
                <Section icon="target" title={`Positioning Kompetitif — vs ${profile.benchmark.count} peer di ${profile.benchmark.scope}`}>
                  <div className="space-y-3">
                    {profile.benchmark.dims.map((d) => (
                      <div key={d.key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[var(--muted)]">{d.label}</span>
                          <span className="font-mono">
                            <span className="text-accent font-semibold">#{d.rank}</span>
                            <span className="text-[var(--muted)]"> / {d.of}</span>
                            <span className="text-[var(--muted)]/70"> · top {100 - d.percentile}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-600" style={{ width: `${d.percentile}%` }} />
                        </div>
                        {d.rank > 1 && (
                          <div className="text-[10px] text-[var(--muted)]/70 mt-1">
                            pemimpin: {d.leaderName} ({d.key === "fg500" ? `#${d.leaderValue}` : d.key === "market_cap" ? `$${d.leaderValue}bn` : d.leaderValue})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-[var(--border)] overflow-hidden">
                    {profile.benchmark.peers.map((p) => {
                      const inner = (
                        <>
                          <EntityLogo domain={p.domain} icon="building" name={p.name} size={22} />
                          <span className={`flex-1 min-w-0 truncate ${p.self ? "font-semibold text-accent" : ""}`}>{p.name}</span>
                          {p.marketCap != null && <span className="text-[11px] font-mono text-[var(--muted)] hidden sm:inline">${p.marketCap}bn</span>}
                          <span className="text-xs font-mono tabular-nums text-accent w-7 text-right">{p.influence}</span>
                        </>
                      );
                      const cls = "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm border-b border-[var(--hairline-soft)] last:border-0";
                      return p.self ? (
                        <div key={p.slug} className={`${cls} bg-emerald-500/10`}>{inner}</div>
                      ) : (
                        <Link key={p.slug} href={`/entities/${p.slug}`} className={`${cls} hover:bg-[var(--surface)] transition-colors`}>
                          {inner}
                        </Link>
                      );
                    })}
                  </div>
                </Section>
              )}

              {profile.gallery?.length > 0 && (
                <Section icon="image" title="Foto Lokasi">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {profile.gallery.map((g, i) => (
                      <figure key={i} className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={g.url}
                          alt={g.caption ?? profile.name}
                          loading="lazy"
                          className="h-28 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {g.caption && (
                          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-[10px] leading-tight text-white/90 line-clamp-2">
                            {g.caption}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                </Section>
              )}

              {profile.insights?.length > 0 && (
                <Section icon="lightbulb" title="Insight Strategis">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {profile.insights.map((it, i) => (
                      <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">{it.label}</div>
                        <div className="text-sm mt-0.5 leading-snug">{it.value}</div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {profile.leads.length > 0 && (
                <Section icon="crown" title="Memimpin">
                  <div className="flex flex-wrap gap-2">
                    {profile.leads.map((l) => (
                      <Link key={l.slug} href={`/entities/${l.slug}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:border-emerald-500/40 transition-colors">
                        <Icon name={l.icon} size={14} className="text-accent" /> {l.name}
                      </Link>
                    ))}
                  </div>
                </Section>
              )}

              {profile.relationships.length > 0 && (
                <Section icon="share-2" title={`Relasi (${profile.relationships.length})`}>
                  <RelationGroups items={profile.relationships} />
                </Section>
              )}

              {profile.events.length > 0 && (
                <Section icon="radar" title={`Peristiwa Terkait (${profile.events.length})`}>
                  <div className="space-y-2">
                    {profile.events.map((ev) => (
                      <Link key={ev.id} href={`/events/${ev.id}`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[var(--surface)] transition-colors">
                        <Icon name={ev.icon} size={16} className="text-accent shrink-0" />
                        <span className="text-sm flex-1 min-w-0 truncate">{ev.title}</span>
                        <span className="text-[11px] font-mono text-[var(--muted)] shrink-0">{ROLE_LABEL[ev.role] ?? ev.role}</span>
                        {ev.event_date && <span className="text-[11px] font-mono text-[var(--muted)] shrink-0">{ev.event_date}</span>}
                      </Link>
                    ))}
                  </div>
                </Section>
              )}

              <div className="flex items-center gap-4 pt-2">
                <Link href={`/entities/${profile.slug}`} className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
                  <Icon name="external-link" size={15} /> Profil entitas lengkap
                </Link>
                {profile.wiki && (
                  <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(profile.wiki)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-foreground">
                    <Icon name="book-open" size={15} /> Wikipedia
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type Rel = Profile["relationships"][number];

// Groups relationships by kind + direction. Single-item kinds stay direct links;
// multi-item kinds collapse into an expandable header (same pattern as Global Pulse).
function RelationGroups({ items }: { items: Rel[] }) {
  const map = new Map<string, { rel: string; outgoing: boolean; items: Rel[] }>();
  for (const r of items) {
    const key = `${r.outgoing ? 1 : 0}|${r.rel}`;
    const g = map.get(key) ?? { rel: r.rel, outgoing: r.outgoing, items: [] };
    g.items.push(r);
    map.set(key, g);
  }
  const groups = [...map.values()].sort((a, b) => b.items.length - a.items.length);
  const soloDefault = groups.length <= 1;

  return (
    <div className="space-y-1.5">
      {groups.map((g, i) => (
        <RelationGroup key={i} group={g} defaultOpen={soloDefault} />
      ))}
    </div>
  );
}

function relDir(rel: string, outgoing: boolean) {
  return outgoing ? `${rel} →` : `← ${rel}`;
}

function RelationGroup({ group, defaultOpen }: { group: { rel: string; outgoing: boolean; items: Rel[] }; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const single = group.items.length === 1;

  if (single) {
    const r = group.items[0];
    return (
      <Link href={`/entities/${r.slug}`} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm hover:border-emerald-500/40 transition-colors">
        <span className="text-[11px] font-mono text-[var(--muted)] shrink-0">{relDir(group.rel, group.outgoing)}</span>
        <Icon name={r.icon} size={13} className="text-accent shrink-0" />
        <span className="truncate">{r.name}</span>
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-left"
      >
        <Icon name="chevron-right" size={14} className={`text-[var(--muted)] shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="text-[11px] font-mono text-[var(--muted)]">{relDir(group.rel, group.outgoing)}</span>
        <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-emerald-500/12 text-[11px] font-mono text-emerald-700 px-1.5">{group.items.length}</span>
      </button>
      {open && (
        <div className="border-t border-[var(--hairline-soft)] divide-y divide-[var(--hairline-soft)] animate-[float-in_0.2s_cubic-bezier(0.16,1,0.3,1)]">
          {group.items.map((r, i) => (
            <Link key={i} href={`/entities/${r.slug}`} className="flex items-center gap-2 pl-9 pr-3 py-2 text-sm hover:bg-[var(--surface-2)] transition-colors">
              <Icon name={r.icon} size={13} className="text-accent shrink-0" />
              <span className="truncate">{r.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function BdChip({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-mono text-[var(--muted)]">
      <Icon name={icon} size={11} className="text-accent" /> {label} {value}
    </span>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--muted)] mb-3">
        <Icon name={icon} size={13} className="text-emerald-600" /> {title}
      </div>
      {children}
    </section>
  );
}
