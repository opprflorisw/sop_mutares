import {
  Bar, BarChart, Line, ComposedChart, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from "recharts";
import type { FC } from "react";
import { Card, KpiTile, Tag } from "../ui";
import { C, PALETTE, TOOLTIP_STYLE } from "../../lib/colors";
import { fmtMoney, fmtUnits, type ProjectData } from "../../lib/projectData";
import { aggregateSpec, type CustomSpec } from "../../lib/customWidget";
import type { Project } from "../../lib/projects";
import type { DashboardDef, PlacedWidget, WidgetCategory } from "../../lib/dashboards";
import VulOpsCard from "../VulOpsCard";
import DecisionsPanel from "../DecisionsPanel";
import ScenarioEngine from "../ScenarioEngine";
import CadencePanel from "../CadencePanel";
import ProcessTracker from "../ProcessTracker";
import BudgetForecast from "../BudgetForecast";

// ============================================================
// Widget registry — every dashboard tile is a registered widget that
// draws from useProjectData(). `available` gates a widget on the data
// it needs; `flagged` marks it as an active exception (used by the
// data-driven "exceptions-first" dashboard).
// ============================================================

export type WidgetProps = { d: ProjectData; project: Project; config?: Record<string, unknown> };

export type WidgetDef = {
  id: string;
  title: string;
  category: WidgetCategory;
  frame: "card" | "bare"; // card = framed by the host; bare = self-surfaced (stat)
  defaultSize: { w: number; h: number };
  component: FC<WidgetProps>;
  available?: (d: ProjectData) => boolean;
  flagged?: (d: ProjectData) => boolean;
};

// ---- KPI stat (configurable) ----
type Metric = { label: string; value: string; delta?: string; kind?: "up" | "down" | "warn"; hint?: string };
function metricFor(key: string, d: ProjectData): Metric {
  const k = d.kpis, c = d.currency;
  switch (key) {
    case "cm": return { label: "Contribution margin", value: fmtMoney(k.contributionMargin, c), delta: `${k.cmPct}% blended`, kind: "up" };
    case "accuracy": return { label: "Forecast accuracy", value: `${k.forecastAccuracy}%`, delta: "target 85%", kind: k.forecastAccuracy >= 85 ? "up" : k.forecastAccuracy >= 78 ? "warn" : "down" };
    case "bias": return { label: "Forecast bias", value: `${k.forecastBias >= 0 ? "+" : ""}${k.forecastBias}%`, delta: k.forecastBias > 0 ? "under-forecast" : "over-forecast", kind: "warn" };
    case "invDays": return { label: "Inventory days", value: `${k.inventoryDays} d`, delta: `target ${k.inventoryTarget} d`, kind: k.inventoryDays > k.inventoryTarget ? "warn" : "up" };
    case "invTurns": return { label: "Inventory turns", value: `${k.inventoryTurns}×`, delta: `${k.inventoryDays}d on hand`, kind: k.inventoryTurns >= 9 ? "up" : "warn" };
    case "capacity": return { label: "Capacity util.", value: `${k.capacityUtil}%`, delta: k.overloadedLines ? `${k.overloadedLines} line(s) over` : "of the MAC", kind: k.overloadedLines || k.capacityUtil > 90 ? "warn" : "up" };
    case "plannedCapacity": return { label: "Util. vs planned", value: `${k.plannedCapacityUtil}%`, delta: "of planned level", kind: k.plannedCapacityUtil >= 100 ? "down" : k.plannedCapacityUtil >= 95 ? "warn" : "up" };
    case "revenueAtRisk": return { label: "Revenue at risk", value: fmtMoney(k.revenueAtRisk, c), delta: "demand-supply gap", kind: "down" };
    case "budgetAttain": return { label: "Budget attainment", value: `${k.budgetAttainment}%`, delta: "plan vs AOP", kind: k.budgetAttainment >= 100 ? "up" : k.budgetAttainment >= 95 ? "warn" : "down" };
    case "slob": return { label: "SLOB value", value: fmtMoney(k.slobValue, c), delta: "slow / obsolete FG", kind: k.slobValue > 0 ? "warn" : "up" };
    case "overloaded": return { label: "Overloaded lines", value: `${k.overloadedLines}`, delta: k.overloadedLines ? "needs a decision" : "all within plan", kind: k.overloadedLines ? "down" : "up" };
    case "revenue":
    default: return { label: "Revenue projection", value: fmtMoney(k.revenueProjection, c), delta: "12m forecast", kind: "up" };
  }
}
const Stat: FC<WidgetProps> = ({ d, config }) => {
  const m = metricFor((config?.metric as string) ?? "revenue", d);
  return <KpiTile label={m.label} value={m.value} delta={m.delta} deltaKind={m.kind ?? "none"} hint={m.hint} />;
};

// ---- charts & tables ----
const RevenueTrend: FC<WidgetProps> = ({ d }) => {
  const s = d.demandSeries.map((p) => ({ ...p, m: p.m.slice(2) }));
  return (
    <div className="h-full min-h-[170px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={s} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="m" tick={{ fontSize: 8, fill: C.axis }} tickLine={false} axisLine={false} interval={1} />
          <YAxis tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, d.currency)} width={48} />
          <Tooltip formatter={(v: number) => fmtMoney(v, d.currency)} contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="rev" name="Revenue" radius={[3, 3, 0, 0]}>
            {s.map((p, i) => <Cell key={i} fill={p.actual ? C.demand : C.forecast} />)}
          </Bar>
          <Line type="monotone" dataKey="cm" name="CM" stroke={C.good} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const GapChart: FC<WidgetProps> = ({ d }) => {
  const data = d.families.map((f) => ({ short: f.family, demand: f.unconstrained, supply: f.constrained, gap: f.gapUnits }));
  return (
    <div className="h-full min-h-[170px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, left: 4, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="short" tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={{ fontSize: 10, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={fmtUnits} width={42} />
          <Tooltip formatter={(v: number) => fmtUnits(v)} contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="demand" name="Demand" fill={C.demand} radius={[3, 3, 0, 0]} />
          <Bar dataKey="supply" name="Supply" radius={[3, 3, 0, 0]}>
            {data.map((g, i) => <Cell key={i} fill={g.gap > 0 ? C.supply : C.good} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const GapTable: FC<WidgetProps> = ({ d }) => {
  const maxD = Math.max(1, ...d.families.map((f) => f.unconstrained));
  return (
    <table className="w-full text-[12px]">
      <thead className="text-left text-[11px] text-[var(--color-ink-3)]">
        <tr>
          <th className="pb-2 font-medium">Family</th>
          <th className="pb-2 text-right font-medium">Demand</th>
          <th className="pb-2 text-right font-medium">Supply</th>
          <th className="pb-2 text-right font-medium">Gap</th>
          <th className="hidden pb-2 pl-5 font-medium sm:table-cell">Demand vs supply</th>
          <th className="pb-2 pl-5 text-right font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {d.families.map((f) => {
          const con = f.gapUnits > 0;
          const dW = (f.unconstrained / maxD) * 100;
          const sW = (f.constrained / maxD) * 100;
          return (
            <tr key={f.family} className="border-t border-[var(--color-line)]">
              <td className="py-2 font-medium"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: f.color }} />{f.family}</td>
              <td className="py-2 text-right tabular-nums text-[var(--color-ink)]">{fmtUnits(f.unconstrained)}</td>
              <td className="py-2 text-right tabular-nums text-[var(--color-ink)]">{fmtUnits(f.constrained)}</td>
              <td className={`py-2 text-right font-semibold tabular-nums ${con ? "text-[var(--color-bad)]" : "text-[var(--color-ink-3)]"}`}>{con ? `−${fmtUnits(f.gapUnits)}` : "—"}</td>
              <td className="hidden py-2 pl-5 sm:table-cell" style={{ minWidth: 150 }}>
                <div className="relative h-4 w-full overflow-hidden rounded bg-[var(--color-surface-3)]">
                  <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${dW}%`, background: "#cfe0f3" }} />
                  <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${sW}%`, background: con ? C.supply : C.good }} />
                </div>
              </td>
              <td className="py-2 pl-5 text-right">
                {con ? (
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <span className="text-[11px] font-medium text-[var(--color-bad)]">{fmtMoney(f.revenueAtRisk, d.currency)}</span>
                    <Tag tone="bad">Constrained</Tag>
                  </span>
                ) : <Tag tone="good">Met</Tag>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const PlanBridge: FC<WidgetProps> = ({ d }) => {
  const baseline = d.kpis.revenueProjection;
  const committed = d.families.reduce((s, f) => s + f.supplyValue, 0);
  const steps: [string, number, string, "good" | "warn" | "neutral"][] = [
    ["Statistical baseline", baseline, "model forecast", "neutral"],
    ["Committed supply", committed, "after capacity constraint", baseline - committed > 1 ? "warn" : "good"],
    ["Revenue at risk", d.kpis.revenueAtRisk, "the gap to resolve", d.kpis.revenueAtRisk > 0 ? "warn" : "good"],
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {steps.map(([l, v, sub, tone], i) => (
        <div key={l} className="relative rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3.5">
          {i > 0 && <span className="absolute -left-2.5 top-1/2 hidden -translate-y-1/2 text-[var(--color-ink-3)] sm:block">→</span>}
          <div className="text-[11px] text-[var(--color-ink-2)]">{l}</div>
          <div className="mt-1 text-[19px] font-semibold">{fmtMoney(v, d.currency)}</div>
          <div className="mt-1"><Tag tone={tone === "neutral" ? "neutral" : tone === "good" ? "good" : "warn"}>{sub}</Tag></div>
        </div>
      ))}
    </div>
  );
};

// small lag-trend spark: L3 · L2 · L1 · Now bias%, coloured by magnitude
const lagTone = (v: number) => (Math.abs(v) > 15 ? C.bad : Math.abs(v) > 8 ? C.warn : C.good);
const LagSpark: FC<{ trend: number[] }> = ({ trend }) => {
  const labels = ["L3", "L2", "L1", "Now"];
  const max = Math.max(8, ...trend.map((v) => Math.abs(v)));
  return (
    <div className="flex items-end gap-1.5">
      {trend.map((v, i) => (
        <div key={i} className="flex w-7 flex-col items-center">
          <span className="text-[8.5px] text-[var(--color-ink-3)]">{labels[i]}</span>
          <div className="relative flex h-6 w-full items-center justify-center">
            <span className="rounded-sm" style={{ background: lagTone(v), height: `${Math.max(3, (Math.abs(v) / max) * 22)}px`, width: 14, opacity: i === 3 ? 1 : 0.55 }} />
          </div>
          <span className="text-[8.5px] tabular-nums" style={{ color: lagTone(v) }}>{v >= 0 ? "+" : ""}{v}%</span>
        </div>
      ))}
    </div>
  );
};
const AccuracyTable: FC<WidgetProps> = ({ d }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-[12px]">
      <thead className="text-left text-[11px] text-[var(--color-ink-2)]"><tr><th className="py-1.5 font-medium">SKU</th><th className="py-1.5 font-medium">Description</th><th className="py-1.5 text-right font-medium">MAPE</th><th className="py-1.5 text-right font-medium">BIAS</th><th className="py-1.5 text-center font-medium">Lag trend</th><th className="py-1.5 font-medium">Status</th><th className="hidden py-1.5 font-medium lg:table-cell">Action</th></tr></thead>
      <tbody>
        {d.skuAccuracy.slice(0, 10).map((s) => (
          <tr key={s.sku} className="border-t border-[var(--color-line)] align-middle">
            <td className="py-2 font-medium">{s.sku}</td>
            <td className="py-2 text-[var(--color-ink-2)]">{s.desc}</td>
            <td className={`py-2 text-right font-medium ${s.mape > 15 ? "text-[var(--color-bad)]" : s.mape > 10 ? "text-[var(--color-warn)]" : "text-[var(--color-good-2)]"}`}>{s.mape}%</td>
            <td className={`py-2 text-right ${Math.abs(s.bias) > 15 ? "text-[var(--color-bad)]" : "text-[var(--color-ink)]"}`}>{s.bias >= 0 ? "+" : ""}{s.bias}%</td>
            <td className="py-2"><div className="flex justify-center"><LagSpark trend={s.lagTrend} /></div></td>
            <td className="py-2"><Tag tone={s.status === "good" ? "good" : s.status === "warn" ? "warn" : "bad"}>{s.state}</Tag></td>
            <td className="hidden py-2 text-[11px] text-[var(--color-ink-2)] lg:table-cell">{s.action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ---- Forecast accuracy vs revenue (img 3 bubble scatter) ----
const AccuracyScatter: FC<WidgetProps> = ({ d }) => {
  const valBy = new Map(d.abc.map((a) => [a.key, a.value]));
  const pts = d.skuAccuracy
    .filter((s) => s.mape > 0)
    .map((s) => { const acc = Math.max(0, Math.round(100 - s.mape)); const rev = valBy.get(s.sku) ?? 0; return { sku: s.sku, acc, rev, z: Math.max(rev, 1), fill: acc >= 75 ? C.good : acc >= 55 ? C.warn : C.bad }; })
    .filter((p) => p.rev > 0);
  if (!pts.length) return <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">Need both forecast value and accuracy to plot.</div>;
  return (
    <div className="flex h-full min-h-[210px] flex-col">
      <div className="mb-1 flex shrink-0 gap-3 text-[10.5px] text-[var(--color-ink-2)]">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: C.good }} />≥75% good</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: C.warn }} />55–75% fair</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: C.bad }} />&lt;55% poor</span>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, left: 4, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis type="number" dataKey="rev" name="Forecast revenue" tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, d.currency)} label={{ value: "12M forecast revenue", position: "insideBottom", offset: -8, fontSize: 10, fill: C.axis }} />
            <YAxis type="number" dataKey="acc" name="Accuracy" domain={[0, 100]} tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={36} />
            <ZAxis type="number" dataKey="z" range={[60, 420]} />
            <ReferenceLine y={75} stroke={C.good} strokeDasharray="4 3" />
            <ReferenceLine y={55} stroke={C.warn} strokeDasharray="4 3" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => (n === "Accuracy" ? `${v}%` : n === "Forecast revenue" ? fmtMoney(v, d.currency) : v)} />
            <Scatter data={pts}>
              {pts.map((p, i) => <Cell key={i} fill={p.fill} fillOpacity={0.78} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CustomerMix: FC<WidgetProps> = ({ d }) => (
  <div className="flex h-full min-h-[180px] flex-col">
    <div className="min-h-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={d.customerMix} dataKey="share" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={1}>
            {d.customerMix.map((c) => <Cell key={c.name} fill={c.color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-2 flex shrink-0 flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-[var(--color-ink-2)]">
      {d.customerMix.slice(0, 6).map((c) => <span key={c.name} className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: c.color }} />{c.name} {(c.share * 100).toFixed(0)}%</span>)}
    </div>
  </div>
);

const ForecastLag: FC<WidgetProps> = ({ d }) => (
  <div className="h-full min-h-[170px]">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={d.forecastLag.map((p) => ({ ...p, m: p.m.slice(2) }))} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="m" tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, d.currency)} width={48} />
        <Tooltip formatter={(v: number) => fmtMoney(v, d.currency)} contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="actual" name="Actual" fill={C.demand} radius={[3, 3, 0, 0]} />
        <Line type="monotone" dataKey="lag1" name="Plan (lag-1)" stroke={C.supply} strokeWidth={2} dot={{ r: 2 }} />
        <Line type="monotone" dataKey="lag2" name="Plan (lag-2)" stroke={C.warn} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);

const CapacityLines: FC<WidgetProps> = ({ d }) => (
  <div className="space-y-2.5">
    {d.capacityLines.map((l) => {
      const tone = l.plannedUtil >= 100 ? "bad" : l.plannedUtil >= 95 ? "warn" : "good";
      const frame = Math.max(120, l.plannedUtil + 5);
      return (
        <div key={`${l.plant}-${l.line}`} className="flex items-center gap-3">
          <div className="w-36 shrink-0"><div className="text-[12px] font-medium">{l.line}</div><div className="text-[10px] text-[var(--color-ink-3)]">{l.plant}</div></div>
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (l.plannedUtil / frame) * 100)}%`, background: tone === "bad" ? C.bad : tone === "warn" ? C.warn : l.color }} /></div>
          <span className={`w-11 text-right text-[12px] font-semibold ${tone === "bad" ? "text-[var(--color-bad)]" : tone === "warn" ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]"}`}>{l.plannedUtil.toFixed(0)}%</span>
          <Tag tone={tone}>{tone === "bad" ? "Over" : tone === "warn" ? "Tight" : "OK"}</Tag>
        </div>
      );
    })}
  </div>
);

function heat(v: number) {
  if (v >= 100) return "bg-[#FCEBEB] text-[#A32D2D]";
  if (v >= 95) return "bg-[#FAEEDA] text-[#854F0B]";
  if (v === 0) return "bg-[var(--color-surface-3)] text-[var(--color-ink-3)]";
  return "bg-[#EAF3DE] text-[#3B6D11]";
}
const CapacityHeatmap: FC<WidgetProps> = ({ d }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-[12px]">
      <thead className="text-left text-[11px] text-[var(--color-ink-2)]"><tr><th className="py-1.5 pr-3 font-medium">Line</th>{d.capacitySchedule.periods.map((p) => <th key={p} className="px-2 py-1.5 text-center font-medium">{p}</th>)}</tr></thead>
      <tbody>
        {d.capacitySchedule.rows.map((row) => (
          <tr key={`${row.plant}-${row.line}`} className="border-t border-[var(--color-line)]">
            <td className="py-1.5 pr-3 font-medium">{row.line}<span className="ml-1 text-[10px] text-[var(--color-ink-3)]">{row.plant}</span></td>
            {row.util.map((v, i) => <td key={i} className="px-1.5 py-1.5 text-center"><span className={`inline-block w-full rounded px-2 py-1 text-[11px] font-medium ${heat(v)}`}>{v}%</span></td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const InventoryPlants: FC<WidgetProps> = ({ d }) => {
  const data = d.plants.map((p) => ({ name: p.name, rm: p.rm, wip: p.wip, fg: p.fg }));
  return (
    <div className="flex h-full min-h-[180px] flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, d.currency)} width={46} />
            <Tooltip formatter={(v: number) => fmtMoney(v, d.currency)} contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="rm" name="RM" stackId="a" fill={C.rm} />
            <Bar dataKey="wip" name="WIP" stackId="a" fill={C.wip} />
            <Bar dataKey="fg" name="FG" stackId="a" fill={C.fg} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--color-ink-2)]">
        {d.plants.map((p) => <span key={p.code}>{p.name}: <strong>{p.invDays.toFixed(1)}d</strong>{p.invDays > 40 && <span className="text-[var(--color-bad)]"> ⚠</span>}</span>)}
      </div>
    </div>
  );
};

const InventoryProjection: FC<WidgetProps> = ({ d }) => {
  const max = Math.max(d.kpis.inventoryTarget * 1.6, ...d.inventoryProjection.map((x) => x.days));
  return (
    <div className="space-y-2">
      {d.inventoryProjection.map((p) => {
        const over = p.days > d.kpis.inventoryTarget;
        return (
          <div key={p.m} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-[11px] text-[var(--color-ink-2)]">{p.m.slice(2)}{!p.planned && <span className="ml-1 text-[var(--color-ink-3)]">now</span>}</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (p.days / max) * 100)}%`, background: over ? C.warn : C.good, opacity: p.planned ? 0.85 : 1 }} /></div>
            <span className={`w-12 text-right text-[12px] font-semibold ${over ? "text-[var(--color-warn)]" : "text-[var(--color-good-2)]"}`}>{p.days.toFixed(0)}d</span>
            <span className="w-14 text-right text-[11px] text-[var(--color-ink-3)]">{fmtMoney(p.value, d.currency)}</span>
          </div>
        );
      })}
    </div>
  );
};

const Slob: FC<WidgetProps> = ({ d }) =>
  d.slob.length === 0 ? (
    <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No slow-moving or obsolete FG — stock is turning healthily.</div>
  ) : (
    <div className="divide-y divide-[var(--color-line)]">
      {d.slob.slice(0, 8).map((s) => (
        <div key={`${s.sku}-${s.plant}`} className="flex items-center gap-3 py-2 text-[12px]">
          <span className="min-w-0 flex-1"><span className="font-medium">{s.sku}</span><span className="ml-1.5 text-[11px] text-[var(--color-ink-3)]">{s.plant}</span><div className="truncate text-[11px] text-[var(--color-ink-2)]">{s.desc}</div></span>
          <span className="text-right text-[11px] text-[var(--color-ink-2)]">{s.monthsCover >= 99 ? "no sales" : `${s.monthsCover}m`}</span>
          <span className="w-14 text-right font-semibold">{fmtMoney(s.value, d.currency)}</span>
          <Tag tone={s.status === "obsolete" ? "bad" : "warn"}>{s.status === "obsolete" ? "Obsolete" : "Slow"}</Tag>
        </div>
      ))}
    </div>
  );

const SEV = { critical: "bad", high: "warn", medium: "info" } as const;
const MrpRisk: FC<WidgetProps> = ({ d }) =>
  d.materialAlerts.length === 0 ? (
    <div className="py-4 text-center text-[12px] text-[var(--color-ink-3)]">No supplier risks flagged.</div>
  ) : (
    <div className="divide-y divide-[var(--color-line)]">
      {d.materialAlerts.map((a) => (
        <div key={a.material} className="py-2">
          <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-semibold">{a.material}</span><Tag tone={SEV[a.severity]}>{a.reliability}% OTIF · {a.leadTime}d</Tag></div>
          <div className="text-[11px] text-[var(--color-ink-2)]">Affects: {a.affects}</div>
        </div>
      ))}
    </div>
  );

const Issues: FC<WidgetProps> = ({ d }) =>
  d.issues.length === 0 ? (
    <div className="py-4 text-center text-[12px] text-[var(--color-ink-3)]">No open issues — plan is balanced.</div>
  ) : (
    <div className="divide-y divide-[var(--color-line)]">
      {d.issues.map((i) => (
        <div key={i.title} className="flex items-start gap-2.5 py-2">
          <span className="mt-0.5">{i.severity === "critical" ? "🔴" : i.severity === "high" ? "🟠" : "🟡"}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-semibold">{i.title}</span>{i.valueAtRisk > 0 && <Tag tone={SEV[i.severity]}>{fmtMoney(i.valueAtRisk * 1000, d.currency)}</Tag>}</div>
            <div className="text-[11px] text-[var(--color-ink-2)]">{i.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );

// Data-driven exceptions — a single list computed from the data.
type Exc = { sev: "critical" | "high" | "medium"; title: string; detail: string };
export function exceptionsFor(d: ProjectData): Exc[] {
  const out: Exc[] = [];
  for (const f of d.families.filter((x) => x.gapPct > 5).slice(0, 4))
    out.push({ sev: f.gapPct > 20 ? "critical" : "high", title: `${f.family} short ${f.gapPct.toFixed(0)}%`, detail: `${fmtMoney(f.revenueAtRisk, d.currency)} at risk — ${fmtUnits(f.gapUnits)} units unmet.` });
  for (const l of d.capacityLines.filter((x) => x.overload).slice(0, 3))
    out.push({ sev: "critical", title: `${l.plant} ${l.line} over capacity`, detail: `${l.util.toFixed(0)}% of available (MAC) — physically can't be met without more capacity.` });
  for (const s of d.skuAccuracy.filter((x) => x.mape > 15).slice(0, 3))
    out.push({ sev: "medium", title: `Forecast error on ${s.sku}`, detail: `MAPE ${s.mape}%, bias ${s.bias >= 0 ? "+" : ""}${s.bias}% vs prior year — ${s.action}` });
  for (const a of d.materialAlerts.filter((x) => x.severity !== "medium").slice(0, 3))
    out.push({ sev: a.severity === "critical" ? "critical" : "high", title: `Supplier risk: ${a.material}`, detail: `${a.reliability}% OTIF · ${a.leadTime}d lead — affects ${a.affects}.` });
  if (d.kpis.inventoryDays > d.kpis.inventoryTarget * 1.3)
    out.push({ sev: "high", title: `Inventory ${d.kpis.inventoryDays}d vs ${d.kpis.inventoryTarget}d target`, detail: `Working capital tied up — ${d.kpis.inventoryTurns}× turns.` });
  if (d.kpis.slobValue > 0)
    out.push({ sev: "medium", title: `${fmtMoney(d.kpis.slobValue, d.currency)} slow / obsolete stock`, detail: `${d.slob.length} SKU(s) sitting >4 months cover or with no recent sales.` });
  const order = { critical: 0, high: 1, medium: 2 };
  return out.sort((a, b) => order[a.sev] - order[b.sev]);
}
const Exceptions: FC<WidgetProps> = ({ d }) => {
  const items = exceptionsFor(d);
  return items.length === 0 ? (
    <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No exceptions — the plan is balanced across demand, supply and capacity.</div>
  ) : (
    <div className="divide-y divide-[var(--color-line)]">
      {items.map((i, idx) => (
        <div key={idx} className="flex items-start gap-2.5 py-2">
          <span className="mt-0.5">{i.sev === "critical" ? "🔴" : i.sev === "high" ? "🟠" : "🟡"}</span>
          <div className="min-w-0 flex-1"><div className="text-[12.5px] font-semibold">{i.title}</div><div className="text-[11px] text-[var(--color-ink-2)]">{i.detail}</div></div>
        </div>
      ))}
    </div>
  );
};

// Governance widgets reuse the existing interactive cards.
const VulOps: FC<WidgetProps> = ({ project, d }) => <VulOpsCard projectId={project.id} currency={d.currency} />;
const Decisions: FC<WidgetProps> = ({ project }) => <DecisionsPanel projectId={project.id} />;

// ---- Custom widget (renders an AI-authored spec generically) ----
export const CustomWidgetView: FC<WidgetProps> = ({ project, d, config }) => {
  const spec = config?.spec as CustomSpec | undefined;
  if (!spec) return <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No widget spec.</div>;
  const data = aggregateSpec(project, spec);
  const isMoney = /revenue|value|cost|price/.test(spec.measure);
  const fmtV = (v: number) => (isMoney ? fmtMoney(v, d.currency) : fmtUnits(v));
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">{spec.title}</h3>
        <Tag tone="accent">custom</Tag>
      </div>
      <div className="min-h-0 flex-1">
        {data.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No data for this widget yet.</div>
        ) : spec.chart === "kpi" ? (
          <div className="flex h-full flex-col justify-center">
            <div className="text-[26px] font-semibold tabular-nums">{fmtV(data.reduce((s, x) => s + x.value, 0))}</div>
            <div className="text-[11px] text-[var(--color-ink-3)]">{spec.title}</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={170}>
            {spec.chart === "pie" ? (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={1}>
                  {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtV(v)} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            ) : spec.chart === "line" ? (
              <ComposedChart data={data} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={fmtV} width={48} />
                <Tooltip formatter={(v: number) => fmtV(v)} contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="value" name={spec.title} stroke={C.demand} strokeWidth={2} dot={false} />
              </ComposedChart>
            ) : (
              <BarChart data={data} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={fmtV} width={48} />
                <Tooltip formatter={(v: number) => fmtV(v)} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" name={spec.title} fill={C.demand} radius={[3, 3, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

// ---- G4 · ABC / Pareto ----
const klassColor = (k: string) => (k === "A" ? C.good : k === "B" ? C.warn : C.bad);
const AbcPareto: FC<WidgetProps> = ({ d }) => {
  const data = d.abc.slice(0, 16).map((a) => ({ name: a.label.length > 16 ? a.label.slice(0, 15) + "…" : a.label, value: a.value, cum: +(a.cumShare * 100).toFixed(1), klass: a.klass }));
  if (!data.length) return <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No demand value to classify yet.</div>;
  return (
    <div className="flex h-full min-h-[200px] flex-col">
      <div className="mb-1 flex shrink-0 gap-3 text-[10.5px] text-[var(--color-ink-2)]">
        {(["A", "B", "C"] as const).map((k) => <span key={k} className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: klassColor(k) }} />{k} · {d.abc.filter((x) => x.klass === k).length}</span>)}
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: C.axis }} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={46} />
            <YAxis yAxisId="v" tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, d.currency)} width={48} />
            <YAxis yAxisId="c" orientation="right" domain={[0, 100]} tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} width={32} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v: number, n: string) => (n === "cum" ? `${v}%` : fmtMoney(v, d.currency))} contentStyle={TOOLTIP_STYLE} />
            <Bar yAxisId="v" dataKey="value" name="value" radius={[3, 3, 0, 0]}>
              {data.map((p, i) => <Cell key={i} fill={klassColor(p.klass)} />)}
            </Bar>
            <Line yAxisId="c" type="monotone" dataKey="cum" name="cum" stroke={C.accent} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ABC_TARGET = { A: 90, B: 80, C: 70 } as const;
const AbcAccuracy: FC<WidgetProps> = ({ d }) => {
  const accBy = new Map(d.skuAccuracy.map((s) => [s.sku, s]));
  const rows = (["A", "B", "C"] as const).map((k) => {
    const accs = d.abc.filter((a) => a.klass === k).map((a) => accBy.get(a.key)).filter((s): s is NonNullable<typeof s> => !!s && s.mape > 0);
    const avgAcc = accs.length ? Math.round(100 - accs.reduce((s, a) => s + a.mape, 0) / accs.length) : null;
    return { k, count: d.abc.filter((a) => a.klass === k).length, avgAcc, target: ABC_TARGET[k] };
  });
  return (
    <table className="w-full text-[12px]">
      <thead className="text-left text-[11px] text-[var(--color-ink-2)]"><tr><th className="py-1.5 font-medium">Class</th><th className="py-1.5 text-right font-medium">Items</th><th className="py-1.5 text-right font-medium">Accuracy</th><th className="py-1.5 text-right font-medium">Target</th><th className="py-1.5 font-medium">Status</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const ok = r.avgAcc == null ? null : r.avgAcc >= r.target;
          return (
            <tr key={r.k} className="border-t border-[var(--color-line)]">
              <td className="py-1.5 font-semibold"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: klassColor(r.k) }} />{r.k}</td>
              <td className="py-1.5 text-right tabular-nums">{r.count}</td>
              <td className="py-1.5 text-right tabular-nums">{r.avgAcc == null ? "—" : `${r.avgAcc}%`}</td>
              <td className="py-1.5 text-right tabular-nums text-[var(--color-ink-3)]">{r.target}%</td>
              <td className="py-1.5">{ok == null ? <Tag tone="neutral">n/a</Tag> : ok ? <Tag tone="good">on target</Tag> : <Tag tone="warn">below</Tag>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ---- G5 · Capacity by site ----
const CapacitySites: FC<WidgetProps> = ({ d }) =>
  d.sites.length === 0 ? (
    <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No site-level capacity — upload capacity.csv with plant codes.</div>
  ) : (
    <div className="space-y-2.5">
      {d.sites.map((s) => {
        const tone = s.plannedUtil >= 100 ? "bad" : s.plannedUtil >= 95 ? "warn" : "good";
        const frame = Math.max(120, s.plannedUtil + 5);
        return (
          <div key={s.plant} className="flex items-center gap-3">
            <div className="w-32 shrink-0"><div className="text-[12px] font-medium">{s.name}</div><div className="text-[10px] text-[var(--color-ink-3)]">{s.lineCount} line(s)</div></div>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (s.plannedUtil / frame) * 100)}%`, background: tone === "bad" ? C.bad : tone === "warn" ? C.warn : s.color }} /></div>
            <span className={`w-11 text-right text-[12px] font-semibold ${tone === "bad" ? "text-[var(--color-bad)]" : tone === "warn" ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]"}`}>{s.plannedUtil.toFixed(0)}%</span>
            <span className="w-20 text-right text-[10.5px] text-[var(--color-ink-3)]">{s.spareMin > 0 ? `${Math.round(s.spareMin / 60)}h spare` : "no spare"}</span>
          </div>
        );
      })}
    </div>
  );

// ---- G7 · Cross-site reallocation ----
const Reallocation: FC<WidgetProps> = ({ d }) =>
  d.reallocations.length === 0 ? (
    <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No reallocation available — either no gap, or no qualified site with spare capacity.</div>
  ) : (
    <table className="w-full text-[12px]">
      <thead className="text-left text-[11px] text-[var(--color-ink-2)]"><tr><th className="py-1.5 font-medium">Family</th><th className="py-1.5 font-medium">Move</th><th className="py-1.5 text-right font-medium">Units</th><th className="py-1.5 text-right font-medium">Recovered</th><th className="py-1.5 text-right font-medium">Net</th><th className="py-1.5 font-medium">Lead</th></tr></thead>
      <tbody>
        {d.reallocations.map((r, i) => (
          <tr key={i} className="border-t border-[var(--color-line)]">
            <td className="py-1.5 font-medium">{r.family}</td>
            <td className="py-1.5 text-[var(--color-ink-2)]">{r.fromSite} → <strong>{r.toSite}</strong></td>
            <td className="py-1.5 text-right tabular-nums">{fmtUnits(r.units)}</td>
            <td className="py-1.5 text-right tabular-nums text-[var(--color-good-2)]">{fmtMoney(r.revenueRecovered, d.currency)}</td>
            <td className="py-1.5 text-right font-semibold tabular-nums">{fmtMoney(r.net, d.currency)}</td>
            <td className="py-1.5 text-[var(--color-ink-3)]">{r.leadTime}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

// ---- G3 · Plan vs budget ----
const PlanBudget: FC<WidgetProps> = ({ d }) =>
  d.budgetVariance.length === 0 ? (
    <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">Upload budget.csv to reconcile the plan against the AOP.</div>
  ) : (
    <div className="h-full min-h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={d.budgetVariance.map((b) => ({ name: b.family, Plan: b.plan, Budget: b.budget }))} margin={{ top: 6, right: 8, left: 4, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, d.currency)} width={48} />
          <Tooltip formatter={(v: number) => fmtMoney(v, d.currency)} contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="Plan" fill={C.demand} radius={[3, 3, 0, 0]} />
          <Bar dataKey="Budget" fill={C.forecast} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

// ---- G1 · Portfolio (NPI / EOL) ----
const PortfolioView: FC<WidgetProps> = ({ d }) =>
  d.portfolio.length === 0 ? (
    <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">Upload portfolio.csv (NPI / EOL) to see the lifecycle calendar.</div>
  ) : (
    <div className="divide-y divide-[var(--color-line)]">
      {d.portfolio.map((p, i) => (
        <div key={i} className="flex items-center gap-3 py-2 text-[12px]">
          <Tag tone={p.type === "NPI" ? "good" : "bad"}>{p.type}</Tag>
          <span className="min-w-0 flex-1"><span className="font-medium">{p.item}</span><span className="ml-1.5 text-[11px] text-[var(--color-ink-3)]">{p.desc}</span></span>
          <span className="text-[11px] text-[var(--color-ink-2)]">{p.startMonth} · {p.rampMonths}mo</span>
          <span className="w-16 text-right tabular-nums">{fmtUnits(p.peakUnits)}</span>
          {p.cannibalizes && <span className="text-[10.5px] text-[var(--color-warn)]">↘ {p.cannibalizes}</span>}
        </div>
      ))}
    </div>
  );

// ---- G2 · Weekly Demand Control ----
const DemandControl: FC<WidgetProps> = ({ d }) => (
  <div className="h-full min-h-[170px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={d.demandControl} margin={{ top: 6, right: 8, left: 4, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: C.axis }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: C.axis }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, d.currency)} width={48} />
        <Tooltip formatter={(v: number) => fmtMoney(v, d.currency)} contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="actual" name="Actual run-rate" fill={C.demand} radius={[3, 3, 0, 0]} />
        <Bar dataKey="plan" name="Weekly plan" fill={C.forecast} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ---- Capacity balance — Unconstrained vs Constrained heatmaps + tiles (img 5) ----
const MiniHeat: FC<{ title: string; periods: string[]; rows: ProjectData["capacitySchedule"]["rows"]; field: "util" | "con" }> = ({ title, periods, rows, field }) => (
  <div className="min-w-0 flex-1 overflow-x-auto">
    <div className="mb-1 text-[11px] font-semibold text-[var(--color-ink-2)]">{title}</div>
    <table className="w-full text-[10.5px]">
      <thead className="text-left text-[9.5px] text-[var(--color-ink-3)]"><tr><th className="py-1 pr-2 font-medium">Resource</th>{periods.map((p) => <th key={p} className="px-0.5 py-1 text-center font-medium">{p.slice(2)}</th>)}</tr></thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.plant}-${row.line}`}>
            <td className="py-0.5 pr-2 font-medium">{row.line}<span className="ml-1 text-[9px] text-[var(--color-ink-3)]">{row.plant}</span></td>
            {row[field].map((v, i) => <td key={i} className="px-0.5 py-0.5 text-center"><span className={`inline-block w-full rounded px-1 py-0.5 text-[9.5px] font-medium ${heat(v)}`}>{v}</span></td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
const CapacityBalance: FC<WidgetProps> = ({ d }) => {
  const { periods, rows } = d.capacitySchedule;
  if (!rows.length) return <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No capacity schedule — upload capacity.csv.</div>;
  const allUtil = rows.flatMap((r) => r.util);
  const overloadCells = allUtil.filter((v) => v > 100).length;
  const peak = Math.max(...allUtil);
  const overLines = rows.filter((r) => r.util.some((v) => v > 100)).length;
  const avgCon = Math.round(rows.flatMap((r) => r.con).reduce((a, b) => a + b, 0) / Math.max(1, allUtil.length));
  const tiles: [string, string, "bad" | "warn" | "good"][] = [
    [`${overLines}`, "resources over capacity", overLines ? "bad" : "good"],
    [`${peak}%`, "peak load (unconstrained)", peak > 100 ? "bad" : "warn"],
    [`${overloadCells}`, "month-cells overloaded", overloadCells ? "warn" : "good"],
    [`${avgCon}%`, "schedulable load (constrained)", "good"],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(([v, l, tone], i) => (
          <div key={i} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-2.5">
            <div className={`text-[18px] font-semibold tabular-nums ${tone === "bad" ? "text-[var(--color-bad)]" : tone === "warn" ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]"}`}>{v}</div>
            <div className="text-[10px] text-[var(--color-ink-3)]">{l}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <MiniHeat title="Unconstrained — true load (can exceed 100%)" periods={periods} rows={rows} field="util" />
        <MiniHeat title="Constrained — what actually schedules (capped)" periods={periods} rows={rows} field="con" />
      </div>
    </div>
  );
};

// ---- Executive supply-chain scorecard — 6 RAG panels (img 9) ----
const RAG_DOT = { green: C.good, amber: C.warn, red: C.bad } as const;
const fmtScore = (m: { value: number; unit: string }) => {
  const u = m.unit;
  if (u === "%") return `${m.value}%`;
  if (u === "d") return `${m.value}d`;
  if (u === "#") return `${m.value}`;
  return `${m.value}${u ? " " + u : ""}`;
};
const Scorecard: FC<WidgetProps> = ({ d }) => {
  if (!d.scorecard.length) return <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">Upload scorecard.csv to build the executive scorecard.</div>;
  const headline = d.scorecard.filter((m) => m.headline);
  const cats = [...new Set(d.scorecard.map((m) => m.category))];
  return (
    <div className="space-y-3">
      {headline.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {headline.map((m, i) => (
            <div key={i} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink-3)]">{m.metric}</div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-[18px] font-semibold tabular-nums">{fmtScore(m)}</span>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: RAG_DOT[m.rag] }} />
              </div>
              <div className="text-[10px] text-[var(--color-ink-3)]">target {fmtScore({ value: m.target, unit: m.unit })}</div>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {cats.map((cat) => (
          <div key={cat} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
            <div className="mb-1.5 text-[11.5px] font-semibold text-[var(--color-ink)]">{cat}</div>
            <div className="divide-y divide-[var(--color-line)]">
              {d.scorecard.filter((m) => m.category === cat).map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-1">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--color-ink-2)]">{m.metric}</span>
                  <span className="text-[11.5px] font-medium tabular-nums" style={{ color: RAG_DOT[m.rag] }}>{fmtScore(m)}</span>
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: RAG_DOT[m.rag] }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---- Capacity scenario comparison — named shift options (img 8) ----
const CapacityScenarios: FC<WidgetProps> = ({ d }) => {
  if (!d.capacityScenarios.length) return <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No capacity gap to close — the constrained plan is balanced.</div>;
  const hrs = (min: number) => `${Math.round(min / 60).toLocaleString()}h`;
  return (
    <table className="w-full text-[12px]">
      <thead className="text-left text-[11px] text-[var(--color-ink-2)]"><tr><th className="py-1.5 font-medium">Option</th><th className="py-1.5 text-right font-medium">Added</th><th className="py-1.5 text-right font-medium">Cost</th><th className="py-1.5 text-right font-medium">Gap after</th><th className="py-1.5 text-right font-medium">Revenue recovered</th></tr></thead>
      <tbody>
        {d.capacityScenarios.map((s, i) => {
          const closed = s.gapMinAfter === 0;
          return (
            <tr key={i} className="border-t border-[var(--color-line)]">
              <td className="py-2"><div className="font-medium">{s.name}</div><div className="text-[10.5px] text-[var(--color-ink-3)]">{s.note}</div></td>
              <td className="py-2 text-right tabular-nums">{s.addedMin ? hrs(s.addedMin) : "—"}</td>
              <td className="py-2 text-right tabular-nums">{s.costEur ? fmtMoney(s.costEur, d.currency) : "—"}</td>
              <td className={`py-2 text-right font-medium tabular-nums ${closed ? "text-[var(--color-good-2)]" : "text-[var(--color-warn)]"}`}>{closed ? "closed" : hrs(s.gapMinAfter)}</td>
              <td className="py-2 text-right tabular-nums text-[var(--color-good-2)]">{s.revenueRecovered ? fmtMoney(s.revenueRecovered, d.currency) : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// Interactive depth panels (own files).
const ScenarioWidget: FC<WidgetProps> = ({ d, project }) => <ScenarioEngine d={d} project={project} />;
const CadenceWidget: FC<WidgetProps> = ({ project }) => <CadencePanel projectId={project.id} />;
const ProcessWidget: FC<WidgetProps> = ({ project }) => <ProcessTracker projectId={project.id} />;
const BudgetForecastWidget: FC<WidgetProps> = ({ d, project }) => <BudgetForecast d={d} projectId={project.id} />;

// ============================================================
// Registry
// ============================================================
// defaultSize.h is in grid rows (~108px each).
export const WIDGETS: WidgetDef[] = [
  { id: "stat", title: "KPI stat", category: "kpi", frame: "bare", defaultSize: { w: 2, h: 1 }, component: Stat },
  { id: "revenue-trend", title: "Demand & revenue outlook", category: "demand", frame: "card", defaultSize: { w: 8, h: 3 }, component: RevenueTrend },
  { id: "gap-chart", title: "Demand vs supply gap", category: "supply", frame: "card", defaultSize: { w: 8, h: 3 }, component: GapChart, flagged: (d) => d.kpis.revenueAtRisk > 0 },
  { id: "gap-table", title: "Gap by product family", category: "supply", frame: "card", defaultSize: { w: 12, h: 2 }, component: GapTable, flagged: (d) => d.kpis.revenueAtRisk > 0 },
  { id: "plan-bridge", title: "Plan bridge — baseline → committed", category: "demand", frame: "card", defaultSize: { w: 12, h: 2 }, component: PlanBridge },
  { id: "accuracy-table", title: "Forecast accuracy & BIAS (SKU)", category: "demand", frame: "card", defaultSize: { w: 6, h: 4 }, component: AccuracyTable, available: (d) => d.skuAccuracy.length > 0, flagged: (d) => d.skuAccuracy.some((s) => s.mape > 15) },
  { id: "customer-mix", title: "Customer demand mix", category: "demand", frame: "card", defaultSize: { w: 4, h: 3 }, component: CustomerMix, available: (d) => d.customerMix.length > 0 },
  { id: "forecast-lag", title: "Forecast BIAS by lag", category: "demand", frame: "card", defaultSize: { w: 6, h: 3 }, component: ForecastLag, available: (d) => d.forecastLag.length > 0 },
  { id: "capacity-lines", title: "Line utilisation (RCCP)", category: "capacity", frame: "card", defaultSize: { w: 12, h: 3 }, component: CapacityLines, available: (d) => d.capacityLines.length > 0, flagged: (d) => d.kpis.overloadedLines > 0 },
  { id: "capacity-heatmap", title: "Production schedule heatmap", category: "capacity", frame: "card", defaultSize: { w: 12, h: 3 }, component: CapacityHeatmap, available: (d) => d.capacitySchedule.rows.length > 0 },
  { id: "inventory-plants", title: "Inventory by plant (RM/WIP/FG)", category: "inventory", frame: "card", defaultSize: { w: 6, h: 3 }, component: InventoryPlants, available: (d) => d.plants.length > 0 },
  { id: "inventory-projection", title: "Inventory projection", category: "inventory", frame: "card", defaultSize: { w: 6, h: 2 }, component: InventoryProjection, available: (d) => d.inventoryProjection.length > 0 },
  { id: "slob", title: "Slow-moving & obsolete (SLOB)", category: "inventory", frame: "card", defaultSize: { w: 6, h: 2 }, component: Slob, flagged: (d) => d.kpis.slobValue > 0 },
  { id: "mrp-risk", title: "MRP — material & supplier risk", category: "supply", frame: "card", defaultSize: { w: 6, h: 2 }, component: MrpRisk, available: (d) => d.materialAlerts.length > 0, flagged: (d) => d.materialAlerts.some((a) => a.severity === "critical") },
  { id: "issues", title: "Key attention points", category: "governance", frame: "card", defaultSize: { w: 4, h: 2 }, component: Issues },
  { id: "exceptions", title: "Exceptions — what needs a decision", category: "governance", frame: "card", defaultSize: { w: 12, h: 3 }, component: Exceptions },
  { id: "vulops", title: "Vulnerabilities & Opportunities", category: "governance", frame: "bare", defaultSize: { w: 6, h: 3 }, component: VulOps },
  { id: "decisions", title: "Decisions & actions", category: "governance", frame: "bare", defaultSize: { w: 6, h: 3 }, component: Decisions },
  // AI-authored custom widget — renders the spec carried in config.spec.
  { id: "custom", title: "Custom widget", category: "kpi", frame: "bare", defaultSize: { w: 6, h: 3 }, component: CustomWidgetView },
  // --- depth widgets (G1–G7) ---
  { id: "abc-pareto", title: "ABC / Pareto analysis", category: "demand", frame: "card", defaultSize: { w: 8, h: 3 }, component: AbcPareto, available: (d) => d.abc.length > 0 },
  { id: "abc-accuracy", title: "Accuracy targets by ABC class", category: "demand", frame: "card", defaultSize: { w: 4, h: 3 }, component: AbcAccuracy, available: (d) => d.abc.length > 0 },
  { id: "capacity-sites", title: "Capacity by site (network)", category: "capacity", frame: "card", defaultSize: { w: 6, h: 3 }, component: CapacitySites, available: (d) => d.sites.length > 0, flagged: (d) => d.sites.some((s) => s.overload) },
  { id: "reallocation", title: "Cross-site reallocation", category: "supply", frame: "card", defaultSize: { w: 8, h: 3 }, component: Reallocation, available: (d) => d.sites.length > 0, flagged: (d) => d.reallocations.length > 0 },
  { id: "plan-budget", title: "Plan vs budget (reconciliation)", category: "governance", frame: "card", defaultSize: { w: 8, h: 3 }, component: PlanBudget, available: (d) => d.budgetVariance.length > 0 },
  { id: "portfolio", title: "Portfolio — NPI / EOL", category: "demand", frame: "card", defaultSize: { w: 6, h: 3 }, component: PortfolioView, available: (d) => d.portfolio.length > 0 },
  { id: "demand-control", title: "Weekly demand control", category: "demand", frame: "card", defaultSize: { w: 6, h: 3 }, component: DemandControl, available: (d) => d.demandControl.length > 0 },
  { id: "scenario", title: "Scenario engine (what-if)", category: "governance", frame: "bare", defaultSize: { w: 12, h: 4 }, component: ScenarioWidget },
  { id: "cadence", title: "S&OP cadence & governance", category: "governance", frame: "bare", defaultSize: { w: 6, h: 4 }, component: CadenceWidget },
  // --- demo-pack widgets (mirror Varun's references) ---
  { id: "accuracy-scatter", title: "Accuracy vs revenue (FVA bubble)", category: "demand", frame: "card", defaultSize: { w: 8, h: 3 }, component: AccuracyScatter, available: (d) => d.skuAccuracy.some((s) => s.mape > 0) && d.abc.length > 0 },
  { id: "budget-forecast", title: "Forecast vs budget + manual override", category: "demand", frame: "bare", defaultSize: { w: 12, h: 4 }, component: BudgetForecastWidget, available: (d) => d.budgetVariance.length > 0 },
  { id: "capacity-balance", title: "Capacity — unconstrained vs constrained", category: "capacity", frame: "card", defaultSize: { w: 12, h: 4 }, component: CapacityBalance, available: (d) => d.capacitySchedule.rows.length > 0, flagged: (d) => d.capacitySchedule.rows.some((r) => r.util.some((v) => v > 100)) },
  { id: "capacity-scenarios", title: "Capacity scenario comparison", category: "capacity", frame: "card", defaultSize: { w: 8, h: 3 }, component: CapacityScenarios, available: (d) => d.capacityScenarios.length > 0 },
  { id: "scorecard", title: "Executive supply-chain scorecard", category: "governance", frame: "card", defaultSize: { w: 12, h: 5 }, component: Scorecard, available: (d) => d.scorecard.length > 0 },
  { id: "process-tracker", title: "S&OP process & checklist", category: "governance", frame: "bare", defaultSize: { w: 12, h: 4 }, component: ProcessWidget },
];

const BY_ID = new Map(WIDGETS.map((w) => [w.id, w]));
export function getWidget(id: string): WidgetDef | undefined { return BY_ID.get(id); }

// ---- predefined dashboards ---- (h derived from each widget's default)
const place = (widgetId: string, w?: number, config?: Record<string, unknown>): PlacedWidget => {
  const def = getWidget(widgetId);
  return { widgetId, w: w ?? def?.defaultSize.w ?? 6, h: def?.defaultSize.h ?? 3, config };
};
const stat = (metric: string): PlacedWidget => place("stat", 2, { metric });

export const PREDEFINED_DASHBOARDS: DashboardDef[] = [
  // ---- Overview page ----
  {
    id: "exec", name: "Executive snapshot", icon: "dashboard", page: "overview", system: true,
    description: "The monthly S&OP one-glance: KPIs, the gap, exceptions and the governance log.",
    widgets: [
      stat("revenue"), stat("cm"), stat("accuracy"), stat("invDays"), stat("capacity"), stat("revenueAtRisk"),
      place("gap-chart", 8), place("issues", 4),
      place("vulops", 6), place("decisions", 6),
      place("revenue-trend", 8), place("customer-mix", 4),
    ],
  },
  {
    id: "exceptions", name: "Exceptions first", icon: "bolt", page: "overview", system: true, dynamic: true,
    description: "Auto-built from the data — only what's flagged: gaps, overloads, forecast error, supplier risk, SLOB.",
    widgets: [],
  },
  {
    id: "board", name: "Board pack", icon: "file", page: "overview", system: true,
    description: "A tight leadership pack: headline KPIs, the gap, capacity, risks and decisions.",
    widgets: [
      stat("revenue"), stat("cm"), stat("accuracy"), stat("invDays"), stat("capacity"), stat("revenueAtRisk"),
      place("gap-chart", 6), place("capacity-lines", 6),
      place("exceptions", 12),
      place("vulops", 6), place("decisions", 6),
    ],
  },

  // ---- Demand page ----
  {
    id: "demand", name: "Demand deep-dive", icon: "chart", page: "demand", system: true,
    description: "Consensus plan, revenue & margin, forecast value-added and accuracy.",
    widgets: [
      stat("revenue"), stat("cm"), stat("accuracy"), stat("bias"),
      place("revenue-trend", 8), place("customer-mix", 4),
      place("plan-bridge", 12),
      place("forecast-lag", 6), place("accuracy-table", 6),
    ],
  },
  {
    id: "demand-accuracy", name: "Forecast & accuracy", icon: "chart", page: "demand", system: true,
    description: "Forecast quality: accuracy, BIAS by lag and SKU-level error to act on.",
    widgets: [
      stat("accuracy"), stat("bias"), stat("revenue"), stat("cm"),
      place("forecast-lag", 12),
      place("accuracy-table", 12),
    ],
  },

  // ---- Supply page ----
  {
    id: "supply", name: "Supply & gap", icon: "factory", page: "supply", system: true,
    description: "The constrained plan, the gap, MRP/supplier risk and inventory.",
    widgets: [
      stat("revenueAtRisk"), stat("invTurns"), stat("slob"), stat("overloaded"),
      place("gap-table", 12),
      place("slob", 6), place("mrp-risk", 6),
      place("inventory-plants", 6), place("inventory-projection", 6),
    ],
  },
  {
    id: "inventory", name: "Inventory health", icon: "box", page: "supply", system: true,
    description: "Days, turns, the glide to target and slow/obsolete stock.",
    widgets: [
      stat("invDays"), stat("invTurns"), stat("slob"), stat("cm"),
      place("inventory-plants", 6), place("inventory-projection", 6),
      place("slob", 12),
    ],
  },

  // ---- Capacity page ----
  {
    id: "capacity", name: "Capacity / RCCP", icon: "box", page: "capacity", system: true,
    description: "Line utilisation vs planned demonstrated capacity and the production schedule.",
    widgets: [
      stat("capacity"), stat("plannedCapacity"), stat("overloaded"), stat("revenueAtRisk"),
      place("capacity-lines", 12),
      place("capacity-heatmap", 12),
    ],
  },
  {
    id: "capacity-load", name: "Load & bottleneck", icon: "box", page: "capacity", system: true,
    description: "Where the load lands by period and which line is the binding constraint.",
    widgets: [
      stat("capacity"), stat("plannedCapacity"), stat("overloaded"), stat("revenueAtRisk"),
      place("capacity-heatmap", 12),
      place("capacity-lines", 12),
    ],
  },
];

/** Resolve a dashboard for the current data — fills the dynamic
 * "exceptions first" dashboard from what's actually flagged. */
export function resolveDashboard(def: DashboardDef, d: ProjectData): PlacedWidget[] {
  if (!def.dynamic) return def.widgets;
  const w: PlacedWidget[] = [
    stat("revenueAtRisk"), stat("overloaded"), stat("slob"), stat("invDays"),
    place("exceptions", 12),
  ];
  for (const def2 of WIDGETS) {
    if (def2.flagged?.(d)) w.push(place(def2.id, def2.defaultSize.w));
  }
  return w;
}
