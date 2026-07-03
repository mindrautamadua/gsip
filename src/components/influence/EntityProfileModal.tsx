"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { countryName } from "@/lib/countries";
import { Skeleton } from "@/components/Skeleton";

export type Profile = {
  name: string;
  slug: string;
  country_code: string | null;
  description: string | null;
  title: string | null;
  influence: number;
  breakdown: { degree?: number; event_impact?: number; market_cap_usd_bn?: number | null } | null;
  type: string | null;
  icon: string;
  wiki: string | null;
  photo: string | null;
  gallery: { url: string; caption: string | null }[];
  insights: { label: string; value: string }[];
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

export function Avatar({ src, name, size = 52 }: { src?: string | null; name: string; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="rounded-full object-cover border border-[var(--border)]" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full grid place-items-center bg-gradient-to-br from-emerald-400/30 to-amber-400/30 border border-[var(--border)] text-accent font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {initials(name)}
    </div>
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
              <Avatar src={profile.photo} name={profile.name} size={76} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="eyebrow"><Icon name={profile.icon} size={12} className="text-accent" /> {profile.type}</span>
                  {profile.country_code && <span className="eyebrow">{countryName(profile.country_code)}</span>}
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
                  <div className="flex flex-wrap gap-2">
                    {profile.relationships.map((r, i) => (
                      <Link key={i} href={`/entities/${r.slug}`} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:border-emerald-500/40 transition-colors">
                        <span className="text-[11px] font-mono text-[var(--muted)]">{r.outgoing ? "" : "← "}{r.rel}{r.outgoing ? " →" : ""}</span>
                        <Icon name={r.icon} size={13} className="text-accent" /> {r.name}
                      </Link>
                    ))}
                  </div>
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
