import { useState } from "react";
import { Card, Tag } from "./ui";
import { IconChevronRight } from "./icons";

// ============================================================
// S&OP process & checklist (mirrors Varun's "Monthly Cycle — Activities
// & Owners" banner + the by-month workflow checklist tracker). The five
// cycle steps show owner + timing relative to the S&OP meeting (Day 0);
// each step expands to a tickable task list. Checked state is persisted
// per project and per month in localStorage.
// ============================================================

type Step = {
  key: string;
  title: string;
  owner: string;
  timing: string;
  tasks: string[];
};

const STEPS: Step[] = [
  {
    key: "data", title: "1 · Data Refresh", owner: "Planning team", timing: "Day −4 to −3",
    tasks: ["Load actuals to ICP & system", "Reconcile IBP actuals vs hub", "Collect supplier confirmations", "Validate GIT status across all sites"],
  },
  {
    key: "demand", title: "2 · Demand Review", owner: "Demand Manager", timing: "Day −1 · ICP",
    tasks: ["Review MAPE / BIAS by SKU", "Approve ICP for next month", "Identify vulnerable demand (SLOB / risk)", "Agree demand gap-close with risks", "Lock demand plan for supply review"],
  },
  {
    key: "meeting", title: "3 · S&OP Meeting", owner: "BU Head", timing: "Day 0",
    tasks: ["Review demand vs supply reconciliation", "Approve constrained plan", "Assign action owners & due dates", "Review P&L impact of each scenario", "Confirm capacity escalations"],
  },
  {
    key: "mps", title: "4 · MPS Update", owner: "Site Planners", timing: "Day +1",
    tasks: ["Issue final MPS by SKU", "Confirm MPS procurement plan & PO triggers", "Schedule WIP build per customer priority", "Release purchase orders"],
  },
  {
    key: "recon", title: "5 · Integrated Reconciliation", owner: "SC Director & Finance", timing: "Day +2 to +3",
    tasks: ["Confirm MPS coverage vs demand", "Sign off financials vs budget", "Publish the board pack"],
  },
];

const MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleString("en", { month: "short", year: "2-digit" });

type Checked = Record<string, string[]>; // month -> checked task keys

export default function ProcessTracker({ projectId }: { projectId: string }) {
  const KEY = `sop_process_${projectId}`;
  const [month, setMonth] = useState(MONTHS[MONTHS.length - 1]);
  const [open, setOpen] = useState<string | null>("demand");
  const [checked, setChecked] = useState<Checked>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  });

  const monthChecks = checked[month] ?? [];
  const taskKey = (stepKey: string, i: number) => `${stepKey}:${i}`;
  function toggle(stepKey: string, i: number) {
    const tk = taskKey(stepKey, i);
    const next = { ...checked, [month]: monthChecks.includes(tk) ? monthChecks.filter((x) => x !== tk) : [...monthChecks, tk] };
    setChecked(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  const stepDone = (s: Step) => s.tasks.filter((_, i) => monthChecks.includes(taskKey(s.key, i))).length;
  const totalTasks = STEPS.reduce((n, s) => n + s.tasks.length, 0);
  const totalDone = STEPS.reduce((n, s) => n + stepDone(s), 0);

  return (
    <Card>
      {/* banner */}
      <div className="overflow-hidden rounded-lg border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-brand-800)] to-[var(--color-brand-600)] p-3.5 text-white">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold">S&OP Monthly Cycle — Activities & Owners</h3>
          <span className="text-[11px] text-white/75">{totalDone}/{totalTasks} tasks complete</span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {STEPS.map((s) => (
            <div key={s.key} className="rounded-md bg-white/10 p-2">
              <div className="text-[11px] font-semibold leading-tight">{s.title}</div>
              <div className="mt-1 text-[10px] text-white/70">{s.owner}</div>
              <div className="text-[10px] text-white/55">{s.timing}</div>
            </div>
          ))}
        </div>
      </div>

      {/* month selector */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-[var(--color-ink-3)]">Cycle month:</span>
        {MONTHS.map((m) => (
          <button key={m} onClick={() => setMonth(m)} className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${m === month ? "border-[var(--color-brand-600)] bg-[var(--color-brand-50)] font-medium text-[var(--color-brand-700)]" : "border-[var(--color-line-strong)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"}`}>{monthLabel(m)}</button>
        ))}
      </div>

      {/* checklist tracker */}
      <div className="mt-3 divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)]">
        {STEPS.map((s) => {
          const done = stepDone(s);
          const isOpen = open === s.key;
          const allDone = done === s.tasks.length;
          return (
            <div key={s.key}>
              <button onClick={() => setOpen(isOpen ? null : s.key)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-surface-2)]">
                <IconChevronRight size={14} className={`shrink-0 text-[var(--color-ink-3)] transition-transform ${isOpen ? "rotate-90" : ""}`} />
                <span className="flex-1 text-[12.5px] font-semibold">{s.title}</span>
                <span className="text-[10.5px] text-[var(--color-ink-3)]">{s.owner}</span>
                <Tag tone={allDone ? "good" : done ? "warn" : "neutral"}>{done}/{s.tasks.length}</Tag>
              </button>
              {isOpen && (
                <div className="space-y-1 px-3 pb-2.5 pl-9">
                  {s.tasks.map((t, i) => {
                    const on = monthChecks.includes(taskKey(s.key, i));
                    return (
                      <label key={i} className="flex cursor-pointer items-center gap-2 text-[12px]">
                        <input type="checkbox" checked={on} onChange={() => toggle(s.key, i)} className="h-3.5 w-3.5 accent-[var(--color-brand-600)]" />
                        <span className={on ? "text-[var(--color-ink-3)] line-through" : "text-[var(--color-ink)]"}>{t}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
