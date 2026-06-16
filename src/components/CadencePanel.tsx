import { useState } from "react";
import { Card, Tag } from "./ui";

// ============================================================
// G2 — Cadence & governance. The monthly S&OP cycle as a per-step
// checklist (owner · status · due), plus the meeting sequence. Editable,
// persisted to localStorage per project. Turns the analytics into a
// repeatable management routine.
// ============================================================

type Status = "open" | "in_progress" | "done";
type Step = { step: string; activity: string; owner: string; status: Status; due: string };

const DEFAULT_STEPS: Step[] = [
  { step: "1 · Portfolio review", activity: "NPI / EOL, lifecycle changes", owner: "Product", status: "open", due: "Wk 1" },
  { step: "2 · Demand review", activity: "Consensus demand plan, accuracy", owner: "Demand planning", status: "open", due: "Wk 2" },
  { step: "3 · Supply review", activity: "Constrained plan, capacity, gap", owner: "Supply planning", status: "open", due: "Wk 2" },
  { step: "4 · Reconciliation", activity: "Plan vs budget, scenarios", owner: "Finance / S&OP", status: "open", due: "Wk 3" },
  { step: "5 · Executive S&OP", activity: "Decisions on the balanced plan", owner: "Leadership", status: "open", due: "Wk 4" },
];

const STATUS_TONE: Record<Status, "neutral" | "warn" | "good"> = { open: "neutral", in_progress: "warn", done: "good" };
const STATUS_LABEL: Record<Status, string> = { open: "Open", in_progress: "In progress", done: "Done" };
const NEXT: Record<Status, Status> = { open: "in_progress", in_progress: "done", done: "open" };

export default function CadencePanel({ projectId }: { projectId: string }) {
  const KEY = `sop_cadence_${projectId}`;
  const [steps, setSteps] = useState<Step[]>(() => {
    try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return Array.isArray(v) && v.length ? v : DEFAULT_STEPS; } catch { return DEFAULT_STEPS; }
  });

  function update(i: number, patch: Partial<Step>) {
    const next = steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    setSteps(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  const done = steps.filter((s) => s.status === "done").length;

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[13px] font-semibold">S&OP cadence & governance</h3>
        <Tag tone={done === steps.length ? "good" : "neutral"}>{done}/{steps.length} steps done</Tag>
      </div>
      <p className="mb-3 text-[11.5px] text-[var(--color-ink-3)]">The monthly cycle — click a status to advance it. A weekly Demand Control runs between cycles for short-term signal.</p>
      <div className="divide-y divide-[var(--color-line)]">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold">{s.step}</div>
              <div className="text-[11px] text-[var(--color-ink-3)]">{s.activity}</div>
            </div>
            <input
              value={s.owner}
              onChange={(e) => update(i, { owner: e.target.value })}
              className="w-32 rounded border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2 py-1 text-[11.5px] outline-none focus:border-[var(--color-brand-500)]"
            />
            <span className="w-12 text-center text-[11px] text-[var(--color-ink-3)]">{s.due}</span>
            <button onClick={() => update(i, { status: NEXT[s.status] })} title="Advance status">
              <Tag tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Tag>
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
