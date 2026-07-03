"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

// Dialog overlay for the intercepted entity route. Closes via backdrop click,
// Esc, or the X button — all route back to the underlying /entities list.
export function EntityModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => router.back();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (!panelRef.current?.contains(e.target as Node)) close();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 backdrop-blur-sm p-4 sm:p-8"
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-3xl my-4 sm:my-8 rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.55)] animate-[float-in_0.28s_cubic-bezier(0.16,1,0.3,1)]"
      >
        <button
          onClick={close}
          aria-label="Tutup"
          className="absolute right-3 top-3 z-10 h-9 w-9 rounded-xl grid place-items-center text-[var(--muted)] bg-[var(--surface)] border border-[var(--hairline)] hover:text-foreground hover:border-emerald-400/40 cursor-pointer transition-colors"
        >
          <Icon name="x" size={17} />
        </button>
        {children}
      </div>
    </div>
  );
}
