"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { breadcrumbs } from "./nav";
import { useUI } from "./ui-context";
import { HeaderUser } from "./HeaderUser";
import type { NavUser } from "@/components/Sidebar";

export function TopBar({ user }: { user: NavUser }) {
  const path = usePathname();
  const { collapsed, toggleCollapsed, setPaletteOpen, theme, toggleTheme } = useUI();
  const trail = breadcrumbs(path);

  return (
    <header className="hidden md:flex sticky top-0 z-20 h-16 items-center gap-4 px-6 border-b border-[var(--hairline-soft)] bg-[var(--background)]/70 backdrop-blur-xl">
      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title="Toggle sidebar"
        className="h-9 w-9 rounded-xl border border-[var(--hairline)] bg-[var(--surface)] grid place-items-center text-[var(--muted)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors duration-200"
      >
        <Icon name={collapsed ? "panel-left-open" : "panel-left-close"} size={17} />
      </button>

      {/* breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <Fragment key={c.href}>
              {i > 0 && <Icon name="chevron-right" size={14} className="text-[var(--muted)]/50 shrink-0" />}
              {last ? (
                <span className="text-sm font-medium truncate">{c.label}</span>
              ) : (
                <Link href={c.href} className="text-sm text-[var(--muted)] hover:text-foreground transition-colors truncate">
                  {c.label}
                </Link>
              )}
            </Fragment>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          onClick={() => setPaletteOpen(true)}
          className="group flex items-center gap-2 rounded-full pl-3.5 pr-2 py-1.5 border border-[var(--hairline)] bg-[var(--surface)] text-sm text-[var(--muted)] hover:border-emerald-400/40 hover:text-foreground cursor-pointer transition-colors duration-200"
        >
          <Icon name="search" size={15} />
          <span className="hidden lg:inline">Search…</span>
          <kbd className="text-[10px] font-mono border border-[var(--hairline)] rounded-md px-1.5 py-0.5 group-hover:border-emerald-400/30">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title="Toggle theme"
          className="h-9 w-9 rounded-xl border border-[var(--hairline)] bg-[var(--surface)] grid place-items-center text-[var(--muted)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors duration-200"
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
        </button>

        <Link
          href="/events"
          aria-label="Early warnings"
          title="Early warnings"
          className="relative h-9 w-9 rounded-xl border border-[var(--hairline)] bg-[var(--surface)] grid place-items-center text-[var(--muted)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors duration-200"
        >
          <Icon name="bell" size={16} />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
        </Link>

        <div className="ml-1 pl-2.5 border-l border-[var(--hairline)]">
          <HeaderUser user={user} />
        </div>
      </div>
    </header>
  );
}
