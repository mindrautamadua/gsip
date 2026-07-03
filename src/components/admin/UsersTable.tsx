"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { updateUserRole, updateUserStatus } from "@/app/admin/users/actions";

export type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "viewer" | "analyst" | "admin";
  status: "active" | "suspended";
  last_sign_in_at: string | null;
  created_at: string;
};

const ROLE_STYLE: Record<string, string> = {
  admin: "bg-rose-500/10 text-rose-700 border-rose-500/25",
  analyst: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  viewer: "bg-sky-500/10 text-sky-700 border-sky-500/25",
};

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 10);
}

function Row({ u, selfId }: { u: UserRow; selfId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSelf = u.id === selfId;

  const setRole = (role: string) =>
    startTransition(async () => {
      setError(null);
      const res = await updateUserRole(u.id, role);
      if (!res.ok) setError(res.error);
    });

  const toggleStatus = () =>
    startTransition(async () => {
      setError(null);
      const res = await updateUserStatus(u.id, u.status === "active" ? "suspended" : "active");
      if (!res.ok) setError(res.error);
    });

  return (
    <tr className="border-t border-[var(--hairline-soft)] hover:bg-[var(--surface)] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-emerald-400/30 to-amber-400/30 border border-[var(--border)] grid place-items-center text-[11px] font-semibold text-emerald-800">
            {(u.full_name || u.email || "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {u.full_name || "—"} {isSelf && <span className="text-[10px] text-[var(--muted)]">(Anda)</span>}
            </div>
            <div className="text-xs text-[var(--muted)] truncate">{u.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-mono ${ROLE_STYLE[u.role]}`}>
            {u.role}
          </span>
          <select
            aria-label={`Ubah role ${u.email}`}
            value={u.role}
            disabled={pending}
            onChange={(e) => setRole(e.target.value)}
            className="gsip-input !w-auto !py-1 !px-2 text-xs cursor-pointer disabled:opacity-50"
          >
            <option value="viewer">viewer</option>
            <option value="analyst">analyst</option>
            <option value="admin">admin</option>
          </select>
        </div>
        {error && <div className="text-[11px] text-rose-600 mt-1">{error}</div>}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={toggleStatus}
          disabled={pending || isSelf}
          title={isSelf ? "Tidak bisa mengubah status sendiri" : "Klik untuk ubah status"}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            u.status === "active"
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
              : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${u.status === "active" ? "bg-emerald-500" : "bg-[var(--muted)]"}`} />
          {u.status}
        </button>
      </td>
      <td className="px-4 py-3 text-xs font-mono text-[var(--muted)] whitespace-nowrap">{fmt(u.last_sign_in_at)}</td>
      <td className="px-4 py-3 text-xs font-mono text-[var(--muted)] whitespace-nowrap">{fmt(u.created_at)}</td>
    </tr>
  );
}

export function UsersTable({ users, selfId }: { users: UserRow[]; selfId: string }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Sign-in terakhir</th>
              <th className="px-4 py-3 font-medium">Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <Row key={u.id} u={u} selfId={selfId} />
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && (
        <div className="p-8 text-center text-sm text-[var(--muted)]">
          <Icon name="users" size={20} className="mx-auto mb-2 opacity-50" />
          Belum ada user.
        </div>
      )}
    </div>
  );
}
