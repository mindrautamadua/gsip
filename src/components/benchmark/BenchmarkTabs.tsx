"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";

const TABS = [
  { href: "/benchmark", label: "Lanskap Kompetitif", icon: "swords" },
  { href: "/positioning", label: "Skala × Integrasi", icon: "scatter-chart" },
  { href: "/global-benchmark", label: "Benchmark Global", icon: "gauge" },
];

// Shared segmented control that unifies the three benchmark surfaces into one
// workspace (each keeps its own route/code; the tabs make it feel like one page).
export function BenchmarkTabs() {
  const path = usePathname();
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
      {TABS.map((t) => {
        const on = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              on ? "bg-emerald-500/15 text-accent" : "text-[var(--muted)] hover:text-foreground"
            }`}
          >
            <Icon name={t.icon} size={14} /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
