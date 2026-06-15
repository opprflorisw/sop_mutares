import { useState } from "react";
import {
  Bar, Line, ComposedChart, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card, CardTitle, KpiTile, Tag } from "../../components/ui";
import { PageHeader, NoData } from "./OverviewPage";
import { useProjectData, fmtMoney } from "../../lib/projectData";

export default function DemandPage() {
  const d = useProjectData();
  const [growth, setGrowth] = useState(0);
  if (!d.hasData) return <NoData />;

  const series = d.demandSeries.map((p) => {
    const factor = p.actual ? 1 : 1 + growth / 100;
    return { m: p.m.slice(2), rev: p.rev * factor, cm: p.cm * factor, actual: p.actual };
  });
  const fc = series.filter((p) => !p.actual);
  const totalRev = fc.reduce((s, p) => s + p.rev, 0);
  const totalCm = fc.reduce((s, p) => s + p.cm, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Demand" subtitle="Unconstrained consensus forecast · revenue projection · bias & variation" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="12m revenue (fcst)" value={fmtMoney(totalRev, d.currency)} delta={`${growth >= 0 ? "+" : ""}${growth}% lever`} deltaKind={growth >= 0 ? "up" : "down"} />
        <KpiTile label="12m CM (est.)" value={fmtMoney(totalCm, d.currency)} delta="~18% margin" deltaKind="up" />
        <KpiTile label="Forecast accuracy" value={`${d.kpis.forecastAccuracy}%`} delta="vs prior year" deltaKind="up" />
        <KpiTile label="Forecast bias" value={`${d.kpis.forecastBias >= 0 ? "+" : ""}${d.kpis.forecastBias}%`} delta={d.kpis.forecastBias > 0 ? "under-forecast" : "over-forecast"} deltaKind="warn" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle right={<Tag tone="info">actual + forecast</Tag>}>Revenue & contribution margin</CardTitle>
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 6, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 8, fill: "#8a929e" }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={{ fontSize: 9, fill: "#8a929e" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, d.currency)} width={48} />
                <Tooltip formatter={(v: number) => fmtMoney(v, d.currency)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7eaee" }} />
                <Bar dataKey="rev" name="Revenue" radius={[3, 3, 0, 0]}>
                  {series.map((p, i) => <Cell key={i} fill={p.actual ? "#85B7EB" : "#378ADD"} />)}
                </Bar>
                <Line type="monotone" dataKey="cm" name="CM" stroke="#1D9E75" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-ink-3)]">Light bars = actuals, darker = forecast. Dips reveal gaps in the loaded history.</p>
        </Card>

        <Card>
          <CardTitle>Scenario lever</CardTitle>
          <label className="mb-1 flex items-center justify-between text-[12px] text-[var(--color-ink-2)]">
            Forecast adjustment
            <span className="font-semibold text-[var(--color-ink)]">{growth >= 0 ? "+" : ""}{growth}%</span>
          </label>
          <input type="range" min={-20} max={20} value={growth} onChange={(e) => setGrowth(Number(e.target.value))} className="w-full accent-[var(--color-brand-600)]" />
          <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-2)]">
            Applies an uplift/haircut to the unconstrained forecast and re-prices it from the SKU master. Natural-language edits ("increase B2C in November by 10%") are the next iteration.
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle>Forecast accuracy & BIAS — SKU level (vs prior year)</CardTitle>
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
              {d.skuAccuracy.map((s) => (
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
        </Card>

        <Card>
          <CardTitle>Customer demand mix</CardTitle>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.customerMix} dataKey="share" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={1}>
                  {d.customerMix.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7eaee" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-[var(--color-ink-2)]">
            {d.customerMix.slice(0, 6).map((c) => (
              <span key={c.name} className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: c.color }} />
                {c.name} {(c.share * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
