import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Card, CardTitle, KpiTile, Tag, Button, PlaceholderNote } from "../../components/ui";
import { IconDownload } from "../../components/icons";
import { useProjectData, fmtMoney, fmtUnits } from "../../lib/projectData";
import { useProjects } from "../../lib/projects";
import { exportSnopOnePager } from "../../lib/exportSnop";

const NAV = [
  { to: "/tool/demand", emoji: "📈", title: "Demand", desc: "Unconstrained forecast, revenue, bias & variation" },
  { to: "/tool/supply", emoji: "🏭", title: "Supply", desc: "Constrained plan, the gap, MRP & inventory" },
  { to: "/tool/capacity", emoji: "⚙️", title: "Capacity", desc: "Line utilisation, overload, production schedule" },
];
const SEV_TONE = { critical: "bad", high: "warn", medium: "info" } as const;

export default function OverviewPage() {
  const d = useProjectData();
  const { activeProject } = useProjects();

  if (!d.hasData) return <NoData />;

  const gapData = d.families.map((f) => ({
    short: f.family, demand: f.unconstrained, supply: f.constrained, gap: f.gapUnits,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Executive S&OP" subtitle="Monthly snapshot — the numbers leadership decides on" />
        <Button onClick={() => activeProject && exportSnopOnePager(activeProject, d)}>
          <IconDownload size={14} /> Export one-pager
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label="Revenue projection" value={fmtMoney(d.kpis.revenueProjection, d.currency)} delta="12m forecast" deltaKind="up" />
        <KpiTile label="Forecast accuracy" value={`${d.kpis.forecastAccuracy}%`} delta={`bias ${d.kpis.forecastBias >= 0 ? "+" : ""}${d.kpis.forecastBias}%`} deltaKind={Math.abs(d.kpis.forecastBias) > 10 ? "warn" : "up"} />
        <KpiTile label="Inventory days" value={`${d.kpis.inventoryDays} d`} delta="weighted avg" deltaKind={d.kpis.inventoryDays > 40 ? "warn" : "up"} />
        <KpiTile label="Capacity util." value={`${d.kpis.capacityUtil}%`} delta={`${d.kpis.overloadedLines} line(s) over`} deltaKind={d.kpis.overloadedLines ? "warn" : "up"} />
        <KpiTile label="Revenue at risk" value={fmtMoney(d.kpis.revenueAtRisk, d.currency)} delta="demand-supply gap" deltaKind="down" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle right={<Tag tone="info">unconstrained vs constrained</Tag>}>
            Demand vs supply gap — by product family (units)
          </CardTitle>
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapData} margin={{ top: 6, right: 8, left: 4, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="short" tick={{ fontSize: 9, fill: "#8a929e" }} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#8a929e" }} tickLine={false} axisLine={false} tickFormatter={fmtUnits} width={42} />
                <Tooltip formatter={(v: number) => fmtUnits(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7eaee" }} />
                <Bar dataKey="demand" name="Demand (unconstrained)" fill="#85B7EB" radius={[3, 3, 0, 0]} />
                <Bar dataKey="supply" name="Supply (constrained)" radius={[3, 3, 0, 0]}>
                  {gapData.map((g, i) => <Cell key={i} fill={g.gap > 0 ? "#185FA5" : "#1D9E75"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-ink-3)]">
            Where the dark bar is below the light bar, demand can't be met — that gap is the decision.
            Total revenue at risk: {fmtMoney(d.kpis.revenueAtRisk, d.currency)}.
          </p>
        </Card>

        <Card pad={false}>
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <span className="text-[13px] font-semibold">Issues to decide</span>
            <Tag tone="bad">{d.issues.filter((i) => i.severity === "critical").length} critical</Tag>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {d.issues.length === 0 && <div className="px-4 py-3 text-[12px] text-[var(--color-ink-3)]">No open issues — plan is balanced.</div>}
            {d.issues.map((i) => (
              <div key={i.title} className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="mt-0.5">{i.severity === "critical" ? "🔴" : i.severity === "high" ? "🟠" : "🟡"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold">{i.title}</span>
                    {i.valueAtRisk > 0 && <Tag tone={SEV_TONE[i.severity]}>{fmtMoney(i.valueAtRisk * 1000, d.currency)}</Tag>}
                  </div>
                  <div className="text-[11px] text-[var(--color-ink-2)]">{i.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>The three core modules</CardTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 transition-colors hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)]">
              <div className="text-[20px]">{n.emoji}</div>
              <div className="mt-1.5 text-[13px] font-semibold">{n.title}</div>
              <div className="text-[11px] text-[var(--color-ink-2)]">{n.desc}</div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-[19px] font-semibold">{title}</h1>
      {subtitle && <p className="text-[12.5px] text-[var(--color-ink-2)]">{subtitle}</p>}
    </div>
  );
}

export function NoData() {
  return (
    <div className="space-y-4">
      <PageHeader title="No data yet" subtitle="This project has no SKU master / forecast loaded" />
      <PlaceholderNote phase="Data">
        Add data files in <Link to="/workspace" className="underline">the Workspace → Manage data</Link>.
        The modules compute live from the project's uploaded CSVs.
      </PlaceholderNote>
    </div>
  );
}
