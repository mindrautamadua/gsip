"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { STATUS_LABEL } from "@/lib/status";

export type MAction = {
  id: string; title: string; owner: string | null; status: string;
  type: string | null; typeCode: string | null; priority: number | null; due: string | null;
};
export type ActionType = { code: string; label: string };

const STATUSES: [string, string][] = (
  ["open", "in_progress", "done", "cancelled"] as const
).map((s) => [s, STATUS_LABEL[s]]);

export function ActionManager({
  eventId, eventTitle, actions, actionTypes, onClose,
}: {
  eventId: string; eventTitle: string; actions: MAction[]; actionTypes: ActionType[]; onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nt, setNt] = useState("");
  const [ntype, setNtype] = useState(actionTypes[0]?.code ?? "mitigate");
  const [nowner, setNowner] = useState("");
  const [nstatus, setNstatus] = useState("open");
  const [ndue, setNdue] = useState("");

  async function post(body: Record<string, unknown>) {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error ?? "Gagal menyimpan"); }
      router.refresh();
      return true;
    } catch (e) { setErr(e instanceof Error ? e.message : "Gagal"); return false; }
    finally { setBusy(false); }
  }

  const patch = (a: MAction, p: Partial<MAction>) =>
    post({ id: a.id, event_id: eventId, action_type_code: p.typeCode ?? a.typeCode ?? "mitigate",
      title: p.title ?? a.title, owner: p.owner ?? a.owner ?? "", status: p.status ?? a.status,
      priority: a.priority ?? "", due_date: a.due ?? "" });

  async function addNew() {
    if (!nt.trim()) return;
    if (await post({ event_id: eventId, action_type_code: ntype, title: nt, owner: nowner, status: nstatus, due_date: ndue })) {
      setNt(""); setNowner(""); setNdue("");
    }
  }

  return (
    <div role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 backdrop-blur-sm p-4 sm:p-8">
      <div className="relative w-full max-w-xl my-4 sm:my-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)]">
        <button onClick={onClose} aria-label="Tutup"
          className="absolute right-3 top-3 h-9 w-9 rounded-xl grid place-items-center text-[var(--muted)] bg-[var(--surface)] border border-[var(--hairline)] hover:text-foreground cursor-pointer transition-colors">
          <Icon name="x" size={17} />
        </button>

        <div className="px-6 pt-7 pb-4 border-b border-[var(--hairline-soft)]">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)] mb-1">Kelola Aksi — Layer 5</div>
          <h2 className="text-base font-semibold leading-snug pr-8 line-clamp-2">{eventTitle}</h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          {err && (
            <div role="alert" className="text-sm text-rose-600 bg-rose-500/[0.07] border border-rose-500/20 rounded-xl px-3 py-2">{err}</div>
          )}

          {/* existing actions */}
          {actions.length > 0 && (
            <div className="space-y-2.5">
              {actions.map((a) => (
                <div key={a.id} className="rounded-xl border border-[var(--border)] p-3">
                  <div className="text-sm font-medium mb-2">{a.title}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <select defaultValue={a.status} onChange={(e) => patch(a, { status: e.target.value })} disabled={busy}
                      aria-label="Status" className="gsip-input py-1.5 text-[13px] cursor-pointer">
                      {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input defaultValue={a.owner ?? ""} onBlur={(e) => { if (e.target.value !== (a.owner ?? "")) patch(a, { owner: e.target.value }); }}
                      placeholder="Owner" aria-label="Owner" disabled={busy} className="gsip-input py-1.5 text-[13px]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* add new */}
          <div className="rounded-xl border border-dashed border-[var(--border)] p-3 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">Tambah aksi</div>
            <input value={nt} onChange={(e) => setNt(e.target.value)} placeholder="Judul mitigasi / aksi…" className="gsip-input py-1.5 text-[13px]" />
            <div className="grid grid-cols-2 gap-2">
              <select value={ntype} onChange={(e) => setNtype(e.target.value)} aria-label="Tipe aksi" className="gsip-input py-1.5 text-[13px] cursor-pointer">
                {actionTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
              <select value={nstatus} onChange={(e) => setNstatus(e.target.value)} aria-label="Status baru" className="gsip-input py-1.5 text-[13px] cursor-pointer">
                {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input value={nowner} onChange={(e) => setNowner(e.target.value)} placeholder="Owner" className="gsip-input py-1.5 text-[13px]" />
              <input value={ndue} onChange={(e) => setNdue(e.target.value)} type="date" aria-label="Due date" className="gsip-input py-1.5 text-[13px]" />
            </div>
            <button onClick={addNew} disabled={busy || !nt.trim()}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-gradient-to-r from-emerald-400 to-amber-400 text-black font-semibold text-sm disabled:opacity-50 cursor-pointer">
              {busy ? <Icon name="loader-2" size={15} className="animate-spin" /> : <Icon name="plus" size={15} />} Tambah
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
