"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { generateBriefAction } from "@/app/brief/actions";

export function GenerateBrief() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = (period: "daily" | "weekly") =>
    startTransition(async () => {
      setError(null);
      const res = await generateBriefAction(period);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => run("daily")}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 border border-[var(--border)] bg-[var(--surface)] text-sm font-medium hover:border-emerald-400/40 disabled:opacity-60 disabled:cursor-wait cursor-pointer transition-colors"
        >
          <Icon name={pending ? "loader-2" : "sun"} size={15} className={pending ? "animate-spin" : ""} />
          Brief Harian
        </button>
        <button
          onClick={() => run("weekly")}
          disabled={pending}
          className="group inline-flex items-center gap-3 rounded-full pl-6 pr-2 py-2.5 bg-gradient-to-r from-emerald-400 to-amber-400 text-black font-semibold text-sm active:scale-[0.98] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_10px_30px_-12px_rgba(52,211,153,0.6)] disabled:opacity-60 disabled:cursor-wait cursor-pointer"
        >
          {pending ? "Menyintesis…" : "Buat Brief Mingguan"}
          <span className="h-8 w-8 rounded-full bg-black/15 grid place-items-center">
            <Icon name={pending ? "loader-2" : "sparkles"} size={15} className={pending ? "animate-spin" : ""} />
          </span>
        </button>
        {pending && <span className="text-sm text-[var(--muted)]">AI menyintesis event terbaru — ±20 detik.</span>}
      </div>
      {error && (
        <div className="card p-3 border-rose-500/30 text-sm text-rose-700 flex items-center gap-2">
          <Icon name="alert-triangle" size={15} /> {error}
        </div>
      )}
    </div>
  );
}
