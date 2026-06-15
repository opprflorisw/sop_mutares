import { useState } from "react";
import {
  Bar,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardTitle, KpiTile, Tag, PlaceholderNote } from "../../components/ui";
import { PageHeader } from "./OverviewPage";
import { SKUS, CUSTOMERS } from "../../lib/sealings";

const MONTHS = ["Dec'22", "Jan'23", "Feb'23", "Mar'23", "Apr'23", "May'23", "Jun'23", "Jul'23", "Aug'23", "Sep'23", "Oct'23", "Nov'23"];

function buildSeries(growth: number) {
  return MONTHS.map((m, i) => {
    const seasonal = 1 + 0.055 * Math.sin((i + 2) * Math.PI / 6);
    const rev = +(4.04 * Math.pow(1 + growth / 100, i / 12) * seasonal).toFixed(2);
    const cm = +(rev * (0.18 + 0.005 * (i / 12))).toFixed(2);
    return { m, rev, cm, actual: i < 3 };
  });
}

export default function DemandPage() {
  const [growth, setGrowth] = useState(6);
  const series = buildSeries(growth);
  const totalRev = series.reduce((s, x) => s + x.rev, 0);
  const totalCm = series.reduce((s, x) => s + x.cm, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Demand planning" subtitle="CR_Demand_Plan_Sealings · 12-month horizon" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="12m revenue" value={`${totalRev.toFixed(1)} mEUR`} delta={`${growth >= 0 ? "+" : ""}${growth}% growth`} deltaKind={growth >= 0 ? "up" : "down"} />
        <KpiTile label="12m CM total" value={`${totalCm.toFixed(1)} mEUR`} delta={`Avg ${(totalCm / totalRev * 100).toFixed(1)}% margin`} deltaKind="up" />
        <KpiTile label="Forecast accuracy" value="84%" delta="+2.1pp" deltaKind="up" />
        <KpiTile label="Forecast bias" value="-4.8%" delta="Slight over-forecast" deltaKind="warn" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle>Revenue & contribution margin — mEUR</CardTitle>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 9, fill: "#8a929e" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#8a929e" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7eaee" }} />
                <Bar dataKey="rev" radius={[3, 3, 0, 0]}>
                  {series.map((d, i) => (
                    <Cell key={i} fill={d.actual ? "#85B7EB" : "#378ADD"} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="cm" stroke="#1D9E75" strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Scenario levers</CardTitle>
          <label className="mb-1 flex items-center justify-between text-[12px] text-[var(--color-ink-2)]">
            Annual growth
            <span className="font-semibold text-[var(--color-ink)]">
              {growth >= 0 ? "+" : ""}{growth}%
            </span>
          </label>
          <input
            type="range"
            min={-10}
            max={20}
            value={growth}
            onChange={(e) => setGrowth(Number(e.target.value))}
            className="w-full accent-[var(--color-brand-600)]"
          />
          <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-2)]">
            Drag to stress-test the plan. Price, margin and escalation levers
            arrive in Phase 2, wired to your uploaded forecast.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle>Forecast accuracy & BIAS — SKU level</CardTitle>
          <table className="w-full text-[12px]">
            <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
              <tr>
                <th className="py-1.5 font-medium">SKU</th>
                <th className="py-1.5 font-medium">Description</th>
                <th className="py-1.5 text-right font-medium">MAPE</th>
                <th className="py-1.5 text-right font-medium">BIAS</th>
                <th className="py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {SKUS.map((s) => (
                <tr key={s.sku} className="border-t border-[var(--color-line)]">
                  <td className="py-1.5 font-medium">{s.sku}</td>
                  <td className="py-1.5 text-[var(--color-ink-2)]">{s.desc}</td>
                  <td className={`py-1.5 text-right font-medium ${s.mape > 15 ? "text-[var(--color-bad)]" : s.mape > 10 ? "text-[var(--color-warn)]" : "text-[var(--color-good-2)]"}`}>
                    {s.mape}%
                  </td>
                  <td className={`py-1.5 text-right ${Math.abs(s.bias) > 15 ? "text-[var(--color-bad)]" : "text-[var(--color-ink)]"}`}>
                    {s.bias >= 0 ? "+" : ""}{s.bias}%
                  </td>
                  <td className="py-1.5">
                    <Tag tone={s.status === "good" ? "good" : s.status === "warn" ? "warn" : "bad"}>
                      {s.state}
                    </Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardTitle>Customer demand mix</CardTitle>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CUSTOMERS}
                  dataKey="share"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={1}
                >
                  {CUSTOMERS.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7eaee" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-[var(--color-ink-2)]">
            {CUSTOMERS.slice(0, 6).map((c) => (
              <span key={c.name} className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: c.color }} />
                {c.name} {(c.share * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </Card>
      </div>

      <PlaceholderNote phase="Phase 2">
        Full demand module: price/margin levers, plant filters, consensus
        overrides and natural-language forecast edits ("increase B2C in November
        by 10%").
      </PlaceholderNote>
    </div>
  );
}
