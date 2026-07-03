"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";
import { visibleGroups, isActive } from "./shell/nav";
import { useUI } from "./shell/ui-context";
import { signOut } from "@/app/auth/actions";

export type NavUser = {
  email: string | null;
  full_name: string | null;
  role: "viewer" | "analyst" | "admin";
} | null;

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  analyst: "Analyst",
  viewer: "Viewer",
};

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-300 via-green-400 to-emerald-600 grid place-items-center text-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
        <Icon name="satellite" size={20} strokeWidth={1.6} />
      </div>
      {!collapsed && (
        <div>
          <div className="display font-semibold tracking-tight leading-none text-[15px]">GSIP</div>
          <div className="text-[9px] uppercase tracking-[0.28em] text-[var(--muted)] mt-1.5">
            Strategic Intelligence
          </div>
        </div>
      )}
    </div>
  );
}

function initials(user: NonNullable<NavUser>): string {
  const base = user.full_name || user.email || "?";
  return base
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function UserChip({ collapsed, user, showLogout = false }: { collapsed: boolean; user: NavUser; showLogout?: boolean }) {
  if (!user) {
    return (
      <Link
        href="/login"
        title="Masuk"
        className={`flex items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] hover:border-emerald-500/40 transition-colors ${
          collapsed ? "p-2 justify-center" : "p-2.5"
        }`}
      >
        <div className="h-9 w-9 shrink-0 rounded-full bg-[var(--surface-2)] border border-[var(--border)] grid place-items-center text-[var(--muted)]">
          <Icon name="log-in" size={16} />
        </div>
        {!collapsed && <span className="text-sm font-medium">Masuk</span>}
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] ${collapsed ? "p-2 justify-center" : "p-2.5"}`}>
      <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-emerald-400/30 to-amber-400/30 border border-[var(--border)] grid place-items-center text-xs font-semibold text-emerald-800">
        {initials(user)}
      </div>
      {!collapsed && (
        <>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{user.full_name || user.email}</div>
            <div className="text-[11px] text-[var(--muted)] truncate">{ROLE_LABEL[user.role]}</div>
          </div>
          {showLogout && (
            <form action={signOut} className="ml-auto shrink-0">
              <button
                type="submit"
                aria-label="Keluar"
                title="Keluar"
                className="h-8 w-8 rounded-lg grid place-items-center text-[var(--muted)] hover:text-foreground hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
              >
                <Icon name="log-out" size={16} />
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export function Sidebar({ user }: { user: NavUser }) {
  const path = usePathname();
  const { collapsed, toggleCollapsed } = useUI();
  const [open, setOpen] = useState(false);
  const groups = visibleGroups(user?.role ?? null);

  return (
    <>
      {/* ============ DESKTOP GLASS RAIL ============ */}
      <aside
        className={`hidden md:flex shrink-0 flex-col p-3 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          collapsed ? "w-[5.5rem]" : "w-[17rem]"
        }`}
      >
        <div className="bezel flex-1 flex flex-col">
          <div className="core flex-1 flex flex-col">
            <div className={`flex items-center gap-2 border-b border-[var(--hairline-soft)] ${collapsed ? "px-3 py-6 justify-center" : "px-5 py-6"}`}>
              <Brand collapsed={collapsed} />
              {!collapsed && (
                <button
                  onClick={toggleCollapsed}
                  aria-label="Collapse sidebar"
                  title="Collapse"
                  className="ml-auto h-8 w-8 rounded-lg grid place-items-center text-[var(--muted)] hover:text-foreground hover:bg-[var(--surface-2)] cursor-pointer transition-colors"
                >
                  <Icon name="panel-left-close" size={16} />
                </button>
              )}
            </div>

            <nav className="p-3 flex flex-col gap-1 flex-1 overflow-y-auto">
              {groups.map((group, gi) => (
                <div key={gi} className={gi > 0 ? "mt-4" : ""}>
                  {group.title &&
                    (collapsed ? (
                      <div className="mx-3 my-2 border-t border-[var(--hairline-soft)]" />
                    ) : (
                      <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--muted)]/70">
                        {group.title}
                      </div>
                    ))}
                  {group.items.map((item) => {
                    const active = isActive(path, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                          collapsed ? "justify-center" : ""
                        } ${
                          active
                            ? "text-emerald-700 bg-emerald-400/[0.08] border border-emerald-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                            : "text-[var(--muted)] hover:text-foreground border border-transparent hover:bg-[var(--surface)]"
                        }`}
                      >
                        {active && !collapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gradient-to-b from-emerald-300 to-green-500" />
                        )}
                        <span className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 shrink-0">
                          <Icon name={item.icon} size={18} />
                        </span>
                        {!collapsed && <span className="flex-1">{item.label}</span>}
                        {!collapsed && item.layer && (
                          <span className="text-[10px] font-mono text-[var(--muted)]/70 group-hover:text-emerald-600/80 transition-colors">
                            {item.layer}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-[var(--hairline-soft)]">
              <UserChip collapsed={collapsed} user={user} />
            </div>
          </div>
        </div>
      </aside>

      {/* ============ MOBILE FLOATING PILL BAR ============ */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex justify-center px-4 pt-6 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md flex items-center justify-between rounded-full pl-4 pr-2 py-2 bg-white/80 backdrop-blur-2xl border border-[var(--border)] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.9)]">
          <Brand collapsed={false} />
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="relative h-11 w-11 rounded-full bg-[var(--surface)] border border-[var(--border)] grid place-items-center active:scale-95 transition-transform duration-300 cursor-pointer"
          >
            <span className={`absolute h-[1.5px] w-5 bg-foreground rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "rotate-45" : "-translate-y-1.5"}`} />
            <span className={`absolute h-[1.5px] w-5 bg-foreground rounded-full transition-all duration-300 ${open ? "opacity-0 scale-x-0" : "opacity-100"}`} />
            <span className={`absolute h-[1.5px] w-5 bg-foreground rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "-rotate-45" : "translate-y-1.5"}`} />
          </button>
        </div>
      </div>

      {/* ============ MOBILE FULLSCREEN GLASS OVERLAY ============ */}
      <div
        aria-hidden={!open}
        inert={!open}
        className={`md:hidden fixed inset-0 z-30 bg-[var(--background)]/92 backdrop-blur-3xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <nav className="flex flex-col justify-center h-full px-8 gap-1.5">
          {groups.flatMap((g) => g.items).map((item, i) => {
            const active = isActive(path, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{ transitionDelay: open ? `${100 + i * 55}ms` : "0ms" }}
                className={`flex items-center gap-4 py-3 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
                } ${active ? "text-emerald-700" : "text-foreground/90"}`}
              >
                <Icon name={item.icon} size={22} />
                <span className="display text-3xl font-medium tracking-tight">{item.label}</span>
                {item.layer && <span className="ml-auto text-xs font-mono text-[var(--muted)]">{item.layer}</span>}
              </Link>
            );
          })}
          <div className="mt-8">
            <UserChip collapsed={false} user={user} showLogout />
          </div>
        </nav>
      </div>
    </>
  );
}
