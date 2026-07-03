"use client";

import { useState } from "react";
import { EntityProfileModal } from "@/components/influence/EntityProfileModal";

// Wraps card content in a button that opens the shared entity profile modal.
export function EntityCardButton({
  slug,
  className,
  children,
}: {
  slug: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <EntityProfileModal slug={slug} onClose={() => setOpen(false)} />}
    </>
  );
}
