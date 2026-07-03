"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/Icon";
import { signOut } from "@/app/auth/actions";
import type { NavUser } from "@/components/Sidebar";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  analyst: "Analyst",
  viewer: "Viewer",
};

function initials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function HeaderUser({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full pl-3.5 pr-4 py-1.5 border border-[var(--hairline)] bg-[var(--surface)] text-sm text-[var(--muted)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors duration-200"
      >
        <Icon name="log-in" size={15} /> Masuk
      </Link>
    );
  }

  const name = user.full_name || user.email || "User";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full pl-1.5 pr-2.5 py-1.5 border border-[var(--hairline)] bg-[var(--surface)] hover:border-emerald-400/40 cursor-pointer transition-colors duration-200"
      >
        <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-emerald-400/40 to-amber-400/40 border border-[var(--border)] grid place-items-center text-[11px] font-semibold text-emerald-800">
          {initials(name)}
        </span>
        <span className="hidden lg:block text-sm font-medium max-w-[10rem] truncate">{name}</span>
        <Icon name="chevron-down" size={14} className={`text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.35)] p-2 z-30"
        >
          <div className="px-3 py-2.5 border-b border-[var(--hairline-soft)] mb-1">
            <div className="text-sm font-medium truncate">{name}</div>
            <div className="text-xs text-[var(--muted)] truncate">{user.email}</div>
            <span className="inline-block mt-1.5 text-[10px] font-mono uppercase tracking-wider rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 px-2 py-0.5">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </div>
          {user.role === "admin" && (
            <Link
              href="/admin/users"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-[var(--surface)] transition-colors"
              role="menuitem"
            >
              <Icon name="users" size={15} className="text-[var(--muted)]" /> Manajemen User
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Icon name="log-out" size={15} /> Keluar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
