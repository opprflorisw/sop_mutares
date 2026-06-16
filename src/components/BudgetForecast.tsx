import { useMemo, useState } from "react";
import {
  Bar, Line, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Card, Button, Tag } from "./ui";
import { IconTrash } from "./icons";
import { C, TOOLTIP_STYLE } from "../lib/colors";
import { fmtMoney, type ProjectData } from "../lib/projectData";

// ============================================================
// Forecast vs Budget + manual override (mirrors Varun's demand-plan
// override panel). Monthly forecast plan vs AOP budget with attainment %,
// plus a natural-language override box: "increase Jul–Sep by 15%",
// "set Q4 to 120%", "reduce February by 10%". Overrides adjust the plan
// line and recompute attainment; saved per project in localStorage.
// ============================================================

type Override = { id: string; label: string; months: string[]; factor: number };

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const QUARTERS: Record<string, number[]> = { q1: [1, 2, 3], q2: [4, 5, 6], q3: [7, 8, 9], q4: [10, 11, 12] };
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleString("en", { month: "short" });

// Parse a free-text command into an override against the available months.
function parseOverride(text: string, available: string[]): Override | null {
  const t = text.toLowerCase();
  const pctMatch = t.match(/(\d+(?:\.\d+)?)\s*%/) || t.match(/by\s+(\d+(?:\.\d+)?)/);
  if (!pctMatch) return null;
  const pct = parseFloat(pctMatch[1]);
  let factor: number;
  if (/\b(to|set)\b/.test(t) && !/\bby\b/.test(t)) factor = pct / 100; // "set to 150%" → scale to 1.5×
  else if (/\b(reduce|decrease|cut|lower|down|drop)\b|-\s*\d/.test(t)) factor = 1 - pct / 100;
  else factor = 1 + pct / 100; // increase / raise / "+" / by

  // collect month numbers from names, ranges and quarters
  const monthNums = new Set<number>();
  for (const [q, nums] of Object.entries(QUARTERS)) if (t.includes(q)) nums.forEach((n) => monthNums.add(n));
  if (/\b(all|full year|every month|fy)\b/.test(t)) for (let i = 1; i <= 12; i++) monthNums.add(i);
  const found = [...t.matchAll(/[a-z]{3,9}/g)].map((m) => m[0]).map((wd) => MONTH_NAMES.findIndex((mn) => wd.startsWith(mn))).filter((i) => i >= 0).map((i) => i + 1);
  // a range like "jul-sep" / "jul to sep"
  if (found.length >= 2 && /-|to|through|–/.test(t)) {
    const [a, b] = [found[0], found[found.length - 1]];
    for (let n = Math.min(a, b); n <= Math.max(a, b); n++) monthNums.add(n);
  } else found.forEach((n) => monthNums.add(n));
  if (monthNums.size === 0) for (let i = 1; i <= 12; i++) monthNums.add(i); // no month → whole horizon

  const months = available.filter((m) => monthNums.has(+m.slice(5)));
  if (!months.length) return null;
  return { id: `ov_${months.join("")}_${Math.round(factor * 100)}_${text.length}`, label: text.trim(), months, factor };
}

export default function BudgetForecast({ d, projectId }: { d: ProjectData; projectId: string }) {
  const KEY = `sop_budget_override_${projectId}`;
  const [overrides, setOverrides] = useState<Override[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const c = d.currency;
  const months = useMemo(() => d.budgetSeries.map((b) => b.m), [d.budgetSeries]);

  function persist(next: Override[]) { setOverrides(next); localStorage.setItem(KEY, JSON.stringify(next)); }
  function apply() {
    const ov = parseOverride(text, months);
    if (!ov) { setErr("Couldn't read that — try e.g. \"increase Jul–Sep by 15%\" or \"set Q4 to 120%\"."); return; }
    setErr(""); setText(""); persist([...overrides, ov]);
  }
  function removeOv(id: string) { persist(overrides.filter((o) => o.id !== id)); }

  const factorFor = (m: string) => overrides.filter((o) => o.months.includes(m)).reduce((f, o) => f * o.factor, 1);
  const rows = d.budgetSeries.map((b) => ({ m: monthLabel(b.m), budget: b.budget, base: b.plan, plan: Math.round(b.plan * factorFor(b.m)) }));

  const totBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totPlan = rows.reduce((s, r) => s + r.plan, 0);
  const attain = totBudget ? Math.round((totPlan / totBudget) * 100) : 0;
  const dirty = overrides.length > 0;

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold">Forecast vs Budget — with manual override</h3>
        <div className="flex items-center gap-2">
          <Tag tone={attain >= 100 ? "good" : attain >= 95 ? "warn" : "bad"}>Attainment {attain}%</Tag>
          <span className="text-[11px] text-[var(--color-ink-3)]">plan {fmtMoney(totPlan, c)} · budget {fmtMoney(totBudget, c)}</span>
        </div>
      </div>

      <div className="h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 6, right: 8, left: 4, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, c)} width={48} />
            <Tooltip formatter={(v: number) => fmtMoney(v, c)} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="budget" name="Budget" fill={C.forecast} radius={[3, 3, 0, 0]} />
            {dirty && <Line type="monotone" dataKey="base" name="Plan (pre-override)" stroke={C.axis} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />}
            <Line type="monotone" dataKey="plan" name={dirty ? "Plan (override)" : "Plan"} stroke={C.demand} strokeWidth={2.5} dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* NL override box */}
      <div className="mt-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3">
        <div className="mb-1.5 text-[11.5px] font-semibold text-[var(--color-ink-2)]">Manual forecast override <span className="font-normal text-[var(--color-ink-3)]">— plain English</span></div>
        <div className="flex flex-wrap gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
            placeholder='e.g. "increase Jul–Sep by 15%"  ·  "set Q4 to 120%"  ·  "reduce February by 10%"'
            className="min-w-[240px] flex-1 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-[12.5px] outline-none focus:border-[var(--color-brand-500)]"
          />
          <Button variant="primary" onClick={apply}>Apply</Button>
          {dirty && <Button variant="ghost" onClick={() => persist([])}>Clear all</Button>}
        </div>
        {err && <div className="mt-1.5 text-[11px] text-[var(--color-bad)]">{err}</div>}
        {overrides.length > 0 && (
          <div className="mt-2.5 space-y-1">
            {overrides.map((o) => (
              <div key={o.id} className="flex items-center gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[11.5px]">
                <Tag tone={o.factor >= 1 ? "good" : "warn"}>{o.factor >= 1 ? "+" : ""}{Math.round((o.factor - 1) * 100)}%</Tag>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                <span className="text-[10.5px] text-[var(--color-ink-3)]">{o.months.map(monthLabel).join(", ")}</span>
                <button onClick={() => removeOv(o.id)} className="text-[var(--color-ink-3)] hover:text-[var(--color-bad)]"><IconTrash size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
