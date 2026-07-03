"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { captureSnapshotsAction } from "@/app/materiality/actions";

// Admin-only manual trigger for a materiality + GSIP metric snapshot.
export function CaptureSnapshotButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = () =>
    start(async () => {
      const r = await captureSnapshotsAction();
      setMsg(
        r.ok
          ? { ok: true, text: `Snapshot direkam — ${r.materiality} materialitas, ${r.gsip} metrik.` }
          : { ok: false, text: r.error }
      );
    });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[var(--fg)] transition-colors hover:border-emerald-500/60 hover:text-emerald-600 disabled:opacity-50 cursor-pointer disabled:cursor-wait"
      >
        <Icon name={pending ? "loader-2" : "camera"} size={13} className={pending ? "animate-spin" : ""} />
        {pending ? "Merekam…" : "Rekam snapshot"}
      </button>
      {msg && (
        <span
          className="inline-flex items-center gap-1 text-[11px]"
          style={{ color: msg.ok ? "#10b981" : "#f43f5e" }}
        >
          <Icon name={msg.ok ? "check" : "triangle-alert"} size={12} />
          {msg.text}
        </span>
      )}
    </div>
  );
}
