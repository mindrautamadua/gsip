import Link from "next/link";
import { Icon } from "./Icon";

export function PageHeader({
  layer,
  title,
  subtitle,
  icon,
}: {
  layer?: string;
  title: string;
  subtitle?: string;
  icon?: string;
}) {
  return (
    <header className="px-6 md:px-10 pt-10 md:pt-14 pb-8">
      <div className="flex items-center gap-2.5 mb-5">
        {icon && (
          <span className="eyebrow">
            <Icon name={icon} size={12} strokeWidth={1.5} className="text-accent" />
          </span>
        )}
        {layer && <span className="eyebrow">{layer}</span>}
      </div>
      <h1 className="display text-4xl md:text-6xl font-semibold tracking-tight max-w-4xl leading-[1.02]">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[15px] md:text-base text-[var(--muted)] mt-5 max-w-3xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </header>
  );
}

export type Tone = "emerald" | "amber" | "sky" | "rose";

const TONE_BADGE: Record<Tone, string> = {
  emerald: "from-emerald-400 to-green-600 text-black",
  amber: "from-amber-300 to-orange-500 text-black",
  sky: "from-sky-400 to-blue-600 text-white",
  rose: "from-rose-400 to-red-600 text-white",
};

export function StatCard({
  label,
  value,
  icon,
  href,
  hint,
  tone = "emerald",
}: {
  label: string;
  value: number | string;
  icon: string;
  href?: string;
  hint?: string;
  tone?: Tone;
}) {
  const inner = (
    <div className="bezel h-full group">
      <div className="core h-full p-5 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5">
        <div className="flex items-start gap-3">
          <span
            className={`h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br grid place-items-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 ${TONE_BADGE[tone]}`}
          >
            <Icon name={icon} size={19} strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] text-foreground/90 font-medium leading-tight">{label}</div>
            {hint && <div className="text-[11px] text-[var(--muted)] mt-0.5">{hint}</div>}
          </div>
          <div className="display text-4xl font-semibold ml-auto tabular-nums tracking-tight">{value}</div>
        </div>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="active:scale-[0.99] transition-transform duration-300 block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// Island pill with nested "button-in-button" trailing icon + magnetic physics.
// Green→amber gradient, matching the reference "View Progress" CTA.
export function Button({
  href,
  children,
  icon = "arrow-up-right",
}: {
  href: string;
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 rounded-full pl-6 pr-2 py-2.5 bg-gradient-to-r from-emerald-400 to-amber-400 text-black font-semibold text-sm active:scale-[0.98] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_10px_30px_-12px_rgba(52,211,153,0.6)]"
    >
      <span>{children}</span>
      <span className="h-8 w-8 rounded-full bg-black/15 grid place-items-center transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105">
        <Icon name={icon} size={15} strokeWidth={1.9} />
      </span>
    </Link>
  );
}

const SCORE_COLORS: Record<number, string> = {
  1: "sev-1",
  2: "sev-2",
  3: "sev-3",
  4: "sev-4",
  5: "sev-5",
};

export function ScoreBadge({ label, score }: { label: string; score: number | null }) {
  if (score == null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
        SCORE_COLORS[score] ?? "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
      }`}
    >
      {label} <span className="font-mono font-semibold">{score}</span>
    </span>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-xs text-[var(--muted)] font-mono">
      {children}
    </span>
  );
}
