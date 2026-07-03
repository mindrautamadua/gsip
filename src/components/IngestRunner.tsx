"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { runIngestAction } from "@/app/ingest/actions";
import type { IngestResult } from "@/lib/ingest/pipeline";

const STATUS_STYLE: Record<IngestResult["details"][number]["status"], { icon: string; cls: string; label: string }> = {
  created: { icon: "check-circle-2", cls: "text-emerald-600", label: "Dibuat" },
  irrelevant: { icon: "eye-off", cls: "text-[var(--muted)]", label: "Tidak strategis" },
  skipped: { icon: "copy-x", cls: "text-amber-600", label: "Dilewati" },
  error: { icon: "alert-triangle", cls: "text-rose-600", label: "Error" },
};

export function IngestRunner() {
  const [report, setReport] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () =>
    startTransition(async () => {
      setError(null);
      const res = await runIngestAction();
      if ("error" in res) {
        setError(res.error);
        setReport(null);
      } else {
        setReport(res);
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <button
          onClick={run}
          disabled={pending}
          className="group inline-flex items-center gap-3 rounded-full pl-6 pr-2 py-2.5 bg-gradient-to-r from-emerald-400 to-amber-400 text-black font-semibold text-sm active:scale-[0.98] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_10px_30px_-12px_rgba(52,211,153,0.6)] disabled:opacity-60 disabled:cursor-wait cursor-pointer"
        >
          <span>{pending ? "Memproses berita…" : "Jalankan Ingesti"}</span>
          <span className="h-8 w-8 rounded-full bg-black/15 grid place-items-center">
            <Icon name={pending ? "loader-2" : "play"} size={15} strokeWidth={1.9} className={pending ? "animate-spin" : ""} />
          </span>
        </button>
        {pending && (
          <span className="text-sm text-[var(--muted)]">
            Memindai feed, menyaring relevansi, mengekstraksi L2–L4 via AI — ±1 menit.
          </span>
        )}
      </div>

      {error && (
        <div className="card p-4 border-rose-500/30 text-sm text-rose-700 flex items-center gap-2">
          <Icon name="alert-triangle" size={16} /> {error}
        </div>
      )}

      {report && (
        <div className="card p-5">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-mono text-[var(--muted)]">
            <span>{report.scanned} dipindai</span>
            <span>{report.candidates} baru</span>
            <span>{report.processed} diproses</span>
            <span className="text-emerald-600 font-semibold">{report.created} event dibuat</span>
            <span>{report.skipped} dilewati</span>
            <span className={report.errors ? "text-rose-600" : ""}>{report.errors} error</span>
          </div>
          <ul className="mt-4 flex flex-col divide-y divide-[var(--hairline-soft)]">
            {report.details.map((d, i) => {
              const s = STATUS_STYLE[d.status];
              return (
                <li key={i} className="py-3 flex items-start gap-3">
                  <Icon name={s.icon} size={16} className={`${s.cls} mt-0.5 shrink-0`} />
                  <div className="min-w-0">
                    <div className="text-sm leading-snug">
                      {d.event_id ? (
                        <Link href={`/events/${d.event_id}`} className="hover:text-emerald-700 underline-offset-2 hover:underline">
                          {d.title}
                        </Link>
                      ) : (
                        d.title
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      <span className={`${s.cls} font-medium`}>{s.label}</span>
                      {d.note && <> · {d.note}</>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
