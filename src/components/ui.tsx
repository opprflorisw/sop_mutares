import type { ReactNode } from "react";

// ============================================================
// UI primitives — restyled to the Untitled UI design language on the
// Phase-1 design tokens (gray ramp, semantic ramps, radius/shadow/type
// scales in src/index.css). Public APIs are unchanged so every existing
// call site upgrades visually with no churn; a few optional props were
// added (Button size, Tag dot, KpiTile icon/sub).
// See docs/untitled-ui-adoption.md.
// ============================================================

export function Card({
  children,
  className = "",
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs ${
        pad ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  right,
  sub,
}: {
  children: ReactNode;
  right?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold leading-tight text-[var(--color-ink)]">
          {children}
        </h3>
        {sub && <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-2)]">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/** Page / section eyebrow + title (Untitled UI "Section header"). */
export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[20px] font-semibold tracking-tight text-[var(--color-ink)]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-[var(--color-ink-2)]">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

type Delta = "up" | "down" | "warn" | "none";

function DeltaArrow({ dir }: { dir: "up" | "down" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === "up" ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
    </svg>
  );
}

export function KpiTile({
  label,
  value,
  delta,
  deltaKind = "none",
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaKind?: Delta;
  hint?: string;
  icon?: ReactNode;
}) {
  const color =
    deltaKind === "up"
      ? "text-[var(--color-good-2)]"
      : deltaKind === "down"
        ? "text-[var(--color-bad)]"
        : deltaKind === "warn"
          ? "text-[var(--color-warn)]"
          : "text-[var(--color-ink-3)]";
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[12.5px] font-medium text-[var(--color-ink-2)]">{label}</div>
        {icon && <span className="shrink-0 text-[var(--color-ink-3)]">{icon}</span>}
      </div>
      <div className="mt-1.5 text-[24px] font-semibold leading-none tracking-tight text-[var(--color-ink)] tabular-nums">
        {value}
      </div>
      {(delta || hint) && (
        <div className={`mt-2 flex items-center gap-1 text-[12px] ${delta ? color : "text-[var(--color-ink-3)]"}`}>
          {delta && (deltaKind === "up" || deltaKind === "down") && <DeltaArrow dir={deltaKind === "up" ? "up" : "down"} />}
          <span className="truncate">{delta ?? hint}</span>
        </div>
      )}
    </div>
  );
}

type TagTone = "good" | "warn" | "bad" | "info" | "accent" | "neutral";

// Untitled UI "badge" tones — soft tint background + ramp-700 text.
const TAG_STYLES: Record<TagTone, { cls: string; dot: string }> = {
  good: { cls: "bg-[var(--color-success-50)] text-[var(--color-success-700)] ring-1 ring-inset ring-[var(--color-success-200)]", dot: "var(--color-success-500)" },
  warn: { cls: "bg-[var(--color-warning-50)] text-[var(--color-warning-700)] ring-1 ring-inset ring-[var(--color-warning-200)]", dot: "var(--color-warning-500)" },
  bad: { cls: "bg-[var(--color-error-50)] text-[var(--color-error-700)] ring-1 ring-inset ring-[var(--color-error-200)]", dot: "var(--color-error-500)" },
  info: { cls: "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] ring-1 ring-inset ring-[var(--color-brand-200)]", dot: "var(--color-brand-500)" },
  accent: { cls: "bg-[#EEEDFE] text-[#3C3489] ring-1 ring-inset ring-[#D9D6FB]", dot: "#7F77DD" },
  neutral: { cls: "bg-[var(--color-gray-100)] text-[var(--color-gray-700)] ring-1 ring-inset ring-[var(--color-gray-200)]", dot: "var(--color-gray-400)" },
};

export function Tag({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: TagTone;
  dot?: boolean;
}) {
  const t = TAG_STYLES[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${t.cls}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.dot }} />}
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const variants: Record<string, string> = {
    default:
      "border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-xs hover:bg-[var(--color-surface-2)]",
    primary:
      "border border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white shadow-xs hover:bg-[var(--color-brand-700)]",
    ghost:
      "border border-transparent text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]",
    danger:
      "border border-[var(--color-error-200)] bg-[var(--color-error-50)] text-[var(--color-error-700)] shadow-xs hover:bg-[var(--color-error-100)]",
  };
  const sizes: Record<string, string> = {
    sm: "gap-1.5 px-2.5 py-1 text-[12px]",
    md: "gap-1.5 px-3 py-1.5 text-[12.5px]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-300)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function StatusDot({ tone }: { tone: "good" | "warn" | "bad" }) {
  const c =
    tone === "good"
      ? "var(--color-good-2)"
      : tone === "warn"
        ? "var(--color-warn)"
        : "var(--color-bad)";
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: c }}
    />
  );
}

/** Untitled UI "Empty state" — icon + headline + hint + optional action. */
export function EmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      {icon && (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-surface-3)] text-[var(--color-ink-3)]">
          {icon}
        </span>
      )}
      <div className="text-[13px] font-medium text-[var(--color-ink)]">{title}</div>
      {hint && <div className="max-w-sm text-[12px] text-[var(--color-ink-2)]">{hint}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Shimmer skeleton block for Convex cold-load states. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[var(--color-surface-3)] ${className}`} />;
}

/** A "coming next" banner used by placeholder module pages. */
export function PlaceholderNote({
  phase,
  children,
}: {
  phase: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-brand-300)] bg-[var(--color-brand-50)] px-4 py-3 text-[12.5px] text-[var(--color-brand-700)]">
      <span className="mr-2 rounded-md bg-[var(--color-brand-600)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {phase}
      </span>
      {children}
    </div>
  );
}
