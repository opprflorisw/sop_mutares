import {
  createContext, useCallback, useContext, useEffect, useMemo,
  useRef, useState, type ReactNode,
} from "react";
import { IconGear, IconFilter, IconChevronDown } from "./icons";

// ============================================================
// Widget filters — every chart/table card gets a gear that opens a
// little popover to hide elements (families, plants, customers…).
// A page-level <ResetFiltersButton/> clears them all. Filters are
// view-only (client side); they never mutate the underlying data.
// ============================================================

type Scope = {
  report: (id: string, active: boolean, reset: () => void) => void;
  unreport: (id: string) => void;
  clearAll: () => void;
  activeCount: number;
};

const Ctx = createContext<Scope | null>(null);

/** Wrap a page so its widget filters share one "Reset filters" control. */
export function FilterScope({ children }: { children: ReactNode }) {
  const actives = useRef(new Map<string, boolean>());
  const resets = useRef(new Map<string, () => void>());
  const [activeCount, setActiveCount] = useState(0);

  const recount = useCallback(() => {
    let n = 0;
    actives.current.forEach((a) => a && n++);
    setActiveCount(n);
  }, []);

  const value = useMemo<Scope>(() => ({
    report(id, active, reset) {
      actives.current.set(id, active);
      resets.current.set(id, reset);
      recount();
    },
    unreport(id) {
      actives.current.delete(id);
      resets.current.delete(id);
      recount();
    },
    clearAll() {
      resets.current.forEach((r) => r());
    },
    activeCount,
  }), [activeCount, recount]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export type WidgetFilter<T extends string> = {
  active: boolean;
  count: number;
  isHidden: (k: T) => boolean;
  visible: <U extends { key: T } | T>(items: U[]) => U[];
  toggle: (k: T) => void;
  reset: () => void;
  options: { key: T; label: string; color?: string }[];
};

/**
 * Per-widget filter state. Pass the full list of selectable options;
 * returns helpers to render the menu and filter your data.
 */
export function useWidgetFilter<T extends string>(
  id: string,
  options: { key: T; label: string; color?: string }[]
): WidgetFilter<T> {
  const scope = useContext(Ctx);
  const [hidden, setHidden] = useState<Set<T>>(new Set());

  const active = hidden.size > 0;
  const reset = useCallback(() => setHidden(new Set()), []);

  useEffect(() => {
    scope?.report(id, active, reset);
    return () => scope?.unreport(id);
  }, [scope, id, active, reset]);

  const toggle = useCallback(
    (k: T) =>
      setHidden((prev) => {
        const next = new Set(prev);
        next.has(k) ? next.delete(k) : next.add(k);
        return next;
      }),
    []
  );

  const isHidden = useCallback((k: T) => hidden.has(k), [hidden]);

  const visible = useCallback(
    <U extends { key: T } | T>(items: U[]): U[] =>
      items.filter((it) =>
        !hidden.has(typeof it === "object" ? (it as { key: T }).key : (it as T))
      ),
    [hidden]
  );

  return { active, count: hidden.size, isHidden, visible, toggle, reset, options };
}

/** Gear button + dropdown of toggleable options; shows a dot when filtered. */
export function FilterMenu<T extends string>({
  filter,
  label = "Filter",
}: {
  filter: WidgetFilter<T>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const allHidden = filter.options.length > 0 && filter.count >= filter.options.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={filter.active ? `${filter.count} hidden — click to adjust` : "Filter this widget"}
        className={`relative flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] transition-colors ${
          filter.active
            ? "border-[var(--color-brand-300)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
            : "border-[var(--color-line-strong)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
        }`}
        aria-label="Filter widget"
      >
        <IconGear size={13} />
        {filter.active && (
          <span className="rounded-full bg-[var(--color-brand-600)] px-1 text-[9px] font-semibold leading-none text-white" style={{ paddingBlock: 2 }}>
            {filter.count}
          </span>
        )}
        <IconChevronDown size={11} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2">
            <span className="text-[11px] font-semibold text-[var(--color-ink-2)]">{label}</span>
            <button
              onClick={filter.reset}
              disabled={!filter.active}
              className="text-[10.5px] font-medium text-[var(--color-brand-600)] disabled:opacity-40 hover:underline"
            >
              Show all
            </button>
          </div>
          <div className="max-h-64 overflow-auto py-1">
            {filter.options.map((o) => {
              const shown = !filter.isHidden(o.key);
              return (
                <button
                  key={o.key}
                  onClick={() => filter.toggle(o.key)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--color-surface-2)]"
                >
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                      shown ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white" : "border-[var(--color-line-strong)]"
                    }`}
                  >
                    {shown && <span className="text-[9px] leading-none">✓</span>}
                  </span>
                  {o.color && <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: o.color }} />}
                  <span className={`truncate ${shown ? "text-[var(--color-ink)]" : "text-[var(--color-ink-3)]"}`}>{o.label}</span>
                </button>
              );
            })}
          </div>
          {allHidden && (
            <div className="border-t border-[var(--color-line)] px-3 py-1.5 text-[10.5px] text-[var(--color-warn)]">
              Everything is hidden — nothing to show.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Page-level "Reset filters" — only visible when some widget is filtered. */
export function ResetFiltersButton() {
  const scope = useContext(Ctx);
  if (!scope || scope.activeCount === 0) return null;
  return (
    <button
      onClick={scope.clearAll}
      className="flex items-center gap-1.5 rounded-md border border-[var(--color-brand-300)] bg-[var(--color-brand-50)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-brand-700)] transition-colors hover:bg-[var(--color-brand-100)]"
    >
      <IconFilter size={13} /> Reset filters
      <span className="rounded-full bg-[var(--color-brand-600)] px-1.5 text-[10px] leading-tight text-white">{scope.activeCount}</span>
    </button>
  );
}
