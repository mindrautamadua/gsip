"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { logoUrls } from "@/lib/logo";

// Company logo from domain with fallback: Clearbit → favicon → entity icon glyph.
export function EntityLogo({
  domain,
  icon,
  name,
  size = 28,
  rounded = "rounded-lg",
}: {
  domain?: string | null;
  icon: string | null;
  name: string;
  size?: number;
  rounded?: string;
}) {
  const chain = logoUrls(domain);
  const [idx, setIdx] = useState(0);
  const src = chain[idx];

  if (!src) {
    return (
      <span
        className={`shrink-0 ${rounded} grid place-items-center bg-[var(--surface-2)] text-accent`}
        style={{ width: size, height: size }}
      >
        <Icon name={icon} size={Math.round(size * 0.5)} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setIdx((i) => i + 1)}
      className={`shrink-0 ${rounded} object-contain bg-white border border-[var(--border)] p-0.5`}
      style={{ width: size, height: size }}
    />
  );
}
