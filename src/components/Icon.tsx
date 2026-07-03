"use client";

import * as Lucide from "lucide-react";
import type { ComponentType } from "react";

type IconProps = { size?: number; className?: string; strokeWidth?: number };
const registry = Lucide as unknown as Record<string, ComponentType<IconProps>>;

// "trending-up" -> "TrendingUp", "building-2" -> "Building2"
function pascal(name: string) {
  return name
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

// Renders a lucide icon from a kebab-case name (e.g. "trending-up").
// Ultra-light stroke by default for the premium hairline aesthetic.
export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.4,
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = (name && registry[pascal(name)]) || Lucide.Circle;
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} />;
}
