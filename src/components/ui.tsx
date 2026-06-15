import type { ReactNode } from "react";

// ============================================================
// UI primitives — the card / KPI / tag / button vocabulary used
// across the tool. Matches the clean CRM-style reference UI.
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
      className={`rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] ${
        pad ? "p-4" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
        {children}
      </h3>
      {right}
    </div>
  );
}

type Delta = "up" | "down" | "warn" | "none";

export function KpiTile({
  label,
  value,
  delta,
  deltaKind = "none",
  hint,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaKind?: Delta;
  hint?: string;
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
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3">
      <div className="text-[11px] text-[var(--color-ink-2)]">{label}</div>
      <div className="mt-1 text-[20px] font-semibold leading-tight text-[var(--color-ink)]">
        {value}
      </div>
      {(delta || hint) && (
        <div className={`mt-0.5 text-[11px] ${delta ? color : "text-[var(--color-ink-3)]"}`}>
          {delta ?? hint}
        </div>
      )}
    </div>
  );
}

type TagTone = "good" | "warn" | "bad" | "info" | "accent" | "neutral";

const TAG_STYLES: Record<TagTone, string> = {
  good: "bg-[#EAF3DE] text-[#3B6D11]",
  warn: "bg-[#FAEEDA] text-[#854F0B]",
  bad: "bg-[#FCEBEB] text-[#A32D2D]",
  info: "bg-[#E6F1FB] text-[#185FA5]",
  accent: "bg-[#EEEDFE] text-[#3C3489]",
  neutral: "bg-[var(--color-surface-3)] text-[var(--color-ink-2)]",
};

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: TagTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${TAG_STYLES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const styles: Record<string, string> = {
    default:
      "border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]",
    primary:
      "border border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)]",
    ghost:
      "border border-transparent text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]",
    danger:
      "border border-[#E8BCBC] bg-[#FCEBEB] text-[#A32D2D] hover:bg-[#f8dede]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
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

/** A simple "coming next" banner used by placeholder module pages. */
export function PlaceholderNote({
  phase,
  children,
}: {
  phase: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--color-brand-300)] bg-[var(--color-brand-50)] px-4 py-3 text-[12px] text-[var(--color-brand-700)]">
      <span className="mr-2 rounded bg-[var(--color-brand-600)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {phase}
      </span>
      {children}
    </div>
  );
}
