import {
  Bar, BarChart, Line, ComposedChart, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { FC } from "react";
import { KpiTile, Tag } from "../ui";
import { C, TOOLTIP_STYLE } from "../../lib/colors";
import { fmtMoney, fmtUnits, type ProjectData } from "../../lib/projectData";
import type { Project } from "../../lib/projects";
import type { DashboardDef, PlacedWidget, WidgetCategory } from "../../lib/dashboards";
import VulOpsCard from "../VulOpsCard";
import DecisionsPanel from "../DecisionsPanel";

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
    <div className="h-[210px]">
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
    <div className="h-[210px]">
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

const GapTable: FC<WidgetProps> = ({ d }) => (
  <table className="w-full text-[12px]">
    <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
      <tr><th className="py-1.5 font-medium">Family</th><th className="py-1.5 text-right font-medium">Demand</th><th className="py-1.5 text-right font-medium">Supply</th><th className="py-1.5 text-right font-medium">Gap</th><th className="py-1.5 text-right font-medium">At risk</th><th className="py-1.5 font-medium">Status</th></tr>
    </thead>
    <tbody>
      {d.families.map((f) => {
        const con = f.gapUnits > 0;
        return (
          <tr key={f.family} className="border-t border-[var(--color-line)]">
            <td className="py-1.5 font-medium"><span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: f.color }} />{f.family}</td>
            <td className="py-1.5 text-right">{fmtUnits(f.unconstrained)}</td>
            <td className="py-1.5 text-right">{fmtUnits(f.constrained)}</td>
            <td className={`py-1.5 text-right font-medium ${con ? "text-[var(--color-bad)]" : "text-[var(--color-good-2)]"}`}>{con ? `-${fmtUnits(f.gapUnits)}` : "0"}</td>
            <td className="py-1.5 text-right">{f.revenueAtRisk > 0 ? fmtMoney(f.revenueAtRisk, d.currency) : "—"}</td>
            <td className="py-1.5"><Tag tone={con ? "bad" : "good"}>{con ? "Constrained" : "Met"}</Tag></td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

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

const AccuracyTable: FC<WidgetProps> = ({ d }) => (
  <table className="w-full text-[12px]">
    <thead className="text-left text-[11px] text-[var(--color-ink-2)]"><tr><th className="py-1.5 font-medium">SKU</th><th className="py-1.5 font-medium">Description</th><th className="py-1.5 text-right font-medium">MAPE</th><th className="py-1.5 text-right font-medium">BIAS</th><th className="py-1.5 font-medium">Status</th></tr></thead>
    <tbody>
      {d.skuAccuracy.slice(0, 10).map((s) => (
        <tr key={s.sku} className="border-t border-[var(--color-line)]">
          <td className="py-1.5 font-medium">{s.sku}</td>
          <td className="py-1.5 text-[var(--color-ink-2)]">{s.desc}</td>
          <td className={`py-1.5 text-right font-medium ${s.mape > 15 ? "text-[var(--color-bad)]" : s.mape > 10 ? "text-[var(--color-warn)]" : "text-[var(--color-good-2)]"}`}>{s.mape}%</td>
          <td className={`py-1.5 text-right ${Math.abs(s.bias) > 15 ? "text-[var(--color-bad)]" : "text-[var(--color-ink)]"}`}>{s.bias >= 0 ? "+" : ""}{s.bias}%</td>
          <td className="py-1.5"><Tag tone={s.status === "good" ? "good" : s.status === "warn" ? "warn" : "bad"}>{s.state}</Tag></td>
        </tr>
      ))}
    </tbody>
  </table>
);

const CustomerMix: FC<WidgetProps> = ({ d }) => (
  <>
    <div className="h-[170px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={d.customerMix} dataKey="share" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={1}>
            {d.customerMix.map((c) => <Cell key={c.name} fill={c.color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-[var(--color-ink-2)]">
      {d.customerMix.slice(0, 6).map((c) => <span key={c.name} className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: c.color }} />{c.name} {(c.share * 100).toFixed(0)}%</span>)}
    </div>
  </>
);

const ForecastLag: FC<WidgetProps> = ({ d }) => (
  <div className="h-[190px]">
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
    <>
      <div className="h-[170px]">
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
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--color-ink-2)]">
        {d.plants.map((p) => <span key={p.code}>{p.name}: <strong>{p.invDays.toFixed(1)}d</strong>{p.invDays > 40 && <span className="text-[var(--color-bad)]"> ⚠</span>}</span>)}
      </div>
    </>
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
        <div key={a.material} className="py-2.5">
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
        <div key={i.title} className="flex items-start gap-2.5 py-2.5">
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
        <div key={idx} className="flex items-start gap-2.5 py-2.5">
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

// ============================================================
// Registry
// ============================================================
// defaultSize.h is in grid rows (~108px each).
export const WIDGETS: WidgetDef[] = [
  { id: "stat", title: "KPI stat", category: "kpi", frame: "bare", defaultSize: { w: 2, h: 1 }, component: Stat },
  { id: "revenue-trend", title: "Demand & revenue outlook", category: "demand", frame: "card", defaultSize: { w: 8, h: 3 }, component: RevenueTrend },
  { id: "gap-chart", title: "Demand vs supply gap", category: "supply", frame: "card", defaultSize: { w: 8, h: 3 }, component: GapChart, flagged: (d) => d.kpis.revenueAtRisk > 0 },
  { id: "gap-table", title: "Gap by product family", category: "supply", frame: "card", defaultSize: { w: 12, h: 3 }, component: GapTable, flagged: (d) => d.kpis.revenueAtRisk > 0 },
  { id: "plan-bridge", title: "Plan bridge — baseline → committed", category: "demand", frame: "card", defaultSize: { w: 12, h: 2 }, component: PlanBridge },
  { id: "accuracy-table", title: "Forecast accuracy & BIAS (SKU)", category: "demand", frame: "card", defaultSize: { w: 6, h: 4 }, component: AccuracyTable, available: (d) => d.skuAccuracy.length > 0, flagged: (d) => d.skuAccuracy.some((s) => s.mape > 15) },
  { id: "customer-mix", title: "Customer demand mix", category: "demand", frame: "card", defaultSize: { w: 4, h: 3 }, component: CustomerMix, available: (d) => d.customerMix.length > 0 },
  { id: "forecast-lag", title: "Forecast BIAS by lag", category: "demand", frame: "card", defaultSize: { w: 6, h: 3 }, component: ForecastLag, available: (d) => d.forecastLag.length > 0 },
  { id: "capacity-lines", title: "Line utilisation (RCCP)", category: "capacity", frame: "card", defaultSize: { w: 12, h: 3 }, component: CapacityLines, available: (d) => d.capacityLines.length > 0, flagged: (d) => d.kpis.overloadedLines > 0 },
  { id: "capacity-heatmap", title: "Production schedule heatmap", category: "capacity", frame: "card", defaultSize: { w: 12, h: 3 }, component: CapacityHeatmap, available: (d) => d.capacitySchedule.rows.length > 0 },
  { id: "inventory-plants", title: "Inventory by plant (RM/WIP/FG)", category: "inventory", frame: "card", defaultSize: { w: 6, h: 3 }, component: InventoryPlants, available: (d) => d.plants.length > 0 },
  { id: "inventory-projection", title: "Inventory projection", category: "inventory", frame: "card", defaultSize: { w: 6, h: 2 }, component: InventoryProjection, available: (d) => d.inventoryProjection.length > 0 },
  { id: "slob", title: "Slow-moving & obsolete (SLOB)", category: "inventory", frame: "card", defaultSize: { w: 6, h: 3 }, component: Slob, flagged: (d) => d.kpis.slobValue > 0 },
  { id: "mrp-risk", title: "MRP — material & supplier risk", category: "supply", frame: "card", defaultSize: { w: 6, h: 3 }, component: MrpRisk, available: (d) => d.materialAlerts.length > 0, flagged: (d) => d.materialAlerts.some((a) => a.severity === "critical") },
  { id: "issues", title: "Key attention points", category: "governance", frame: "card", defaultSize: { w: 4, h: 3 }, component: Issues },
  { id: "exceptions", title: "Exceptions — what needs a decision", category: "governance", frame: "card", defaultSize: { w: 12, h: 3 }, component: Exceptions },
  { id: "vulops", title: "Vulnerabilities & Opportunities", category: "governance", frame: "bare", defaultSize: { w: 6, h: 3 }, component: VulOps },
  { id: "decisions", title: "Decisions & actions", category: "governance", frame: "bare", defaultSize: { w: 6, h: 3 }, component: Decisions },
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
  {
    id: "exec", name: "Executive snapshot", icon: "dashboard", system: true,
    description: "The monthly S&OP one-glance: KPIs, the gap, exceptions and the governance log.",
    widgets: [
      stat("revenue"), stat("cm"), stat("accuracy"), stat("invDays"), stat("capacity"), stat("revenueAtRisk"),
      place("gap-chart", 8), place("issues", 4),
      place("vulops", 6), place("decisions", 6),
      place("revenue-trend", 8), place("customer-mix", 4),
    ],
  },
  {
    id: "exceptions", name: "Exceptions first", icon: "bolt", system: true, dynamic: true,
    description: "Auto-built from the data — only what's flagged: gaps, overloads, forecast error, supplier risk, SLOB.",
    widgets: [],
  },
  {
    id: "demand", name: "Demand deep-dive", icon: "chart", system: true,
    description: "Consensus plan, revenue & margin, forecast value-added and accuracy.",
    widgets: [
      stat("revenue"), stat("cm"), stat("accuracy"), stat("bias"),
      place("revenue-trend", 8), place("customer-mix", 4),
      place("plan-bridge", 12),
      place("forecast-lag", 6), place("accuracy-table", 6),
    ],
  },
  {
    id: "supply", name: "Supply & gap", icon: "factory", system: true,
    description: "The constrained plan, the gap, MRP/supplier risk and inventory.",
    widgets: [
      stat("revenueAtRisk"), stat("invTurns"), stat("slob"), stat("overloaded"),
      place("gap-table", 12),
      place("slob", 6), place("mrp-risk", 6),
      place("inventory-plants", 6), place("inventory-projection", 6),
    ],
  },
  {
    id: "capacity", name: "Capacity / RCCP", icon: "box", system: true,
    description: "Line utilisation vs planned demonstrated capacity and the production schedule.",
    widgets: [
      stat("capacity"), stat("plannedCapacity"), stat("overloaded"), stat("revenueAtRisk"),
      place("capacity-lines", 12),
      place("capacity-heatmap", 12),
    ],
  },
  {
    id: "inventory", name: "Inventory health", icon: "box", system: true,
    description: "Days, turns, the glide to target and slow/obsolete stock.",
    widgets: [
      stat("invDays"), stat("invTurns"), stat("slob"), stat("cm"),
      place("inventory-plants", 6), place("inventory-projection", 6),
      place("slob", 12),
    ],
  },
  {
    id: "board", name: "Board pack", icon: "file", system: true,
    description: "A tight leadership pack: headline KPIs, the gap, capacity, risks and decisions.",
    widgets: [
      stat("revenue"), stat("cm"), stat("accuracy"), stat("invDays"), stat("capacity"), stat("revenueAtRisk"),
      place("gap-chart", 6), place("capacity-lines", 6),
      place("exceptions", 12),
      place("vulops", 6), place("decisions", 6),
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
