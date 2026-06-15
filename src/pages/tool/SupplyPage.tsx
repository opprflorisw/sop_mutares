import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Card, CardTitle, KpiTile, Tag } from "../../components/ui";
import { PageHeader, NoData } from "./OverviewPage";
import { useProjectData, fmtMoney, fmtUnits } from "../../lib/projectData";
import { mitigationsFor } from "../../lib/mitigations";

const SEV = { critical: "bad", high: "warn", medium: "info" } as const;

export default function SupplyPage() {
  const d = useProjectData();
  const [openGap, setOpenGap] = useState<string | null>(null);
  if (!d.hasData) return <NoData />;
  const constrained = d.families.filter((f) => f.gapUnits > 0);

  const totalDemand = d.families.reduce((s, f) => s + f.demandValue, 0);
  const totalSupply = d.families.reduce((s, f) => s + f.supplyValue, 0);
  const invChart = d.plants.map((p) => ({ name: p.name, rm: p.rm, wip: p.wip, fg: p.fg }));

  return (
    <div className="space-y-4">
      <PageHeader title="Supply" subtitle="Constrained plan · the demand-supply gap · MRP · inventory" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Demand (unconstr.)" value={fmtMoney(totalDemand, d.currency)} hint="What the market wants" />
        <KpiTile label="Supply (constrained)" value={fmtMoney(totalSupply, d.currency)} delta={`-${fmtMoney(totalDemand - totalSupply, d.currency)} vs demand`} deltaKind={totalDemand - totalSupply > 0 ? "down" : "up"} />
        <KpiTile label="Revenue at risk" value={fmtMoney(d.kpis.revenueAtRisk, d.currency)} delta="unmet demand" deltaKind="down" />
        <KpiTile label="Inventory turns" value={`${d.kpis.inventoryTurns}×`} delta={`${d.kpis.inventoryDays}d on hand`} deltaKind={d.kpis.inventoryTurns >= 9 ? "up" : "warn"} />
      </div>

      <Card>
        <CardTitle right={<Tag tone="info">the gap drives the decision</Tag>}>Demand vs supply gap — by product family</CardTitle>
        <table className="w-full text-[12px]">
          <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
            <tr>
              <th className="py-1.5 font-medium">Family</th>
              <th className="py-1.5 text-right font-medium">Demand</th>
              <th className="py-1.5 text-right font-medium">Supply</th>
              <th className="py-1.5 text-right font-medium">Gap</th>
              <th className="py-1.5 text-right font-medium">Gap %</th>
              <th className="py-1.5 text-right font-medium">At risk</th>
              <th className="py-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {d.families.map((f) => {
              const constrained = f.gapUnits > 0;
              return (
                <tr key={f.family} className="border-t border-[var(--color-line)]">
                  <td className="py-1.5 font-medium">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: f.color }} />
                    {f.family}
                  </td>
                  <td className="py-1.5 text-right">{fmtUnits(f.unconstrained)}</td>
                  <td className="py-1.5 text-right">{fmtUnits(f.constrained)}</td>
                  <td className={`py-1.5 text-right font-medium ${constrained ? "text-[var(--color-bad)]" : "text-[var(--color-good-2)]"}`}>{f.gapUnits > 0 ? `-${fmtUnits(f.gapUnits)}` : "0"}</td>
                  <td className={`py-1.5 text-right ${constrained ? "text-[var(--color-bad)]" : "text-[var(--color-ink-3)]"}`}>{f.gapPct > 0 ? `${f.gapPct.toFixed(0)}%` : "—"}</td>
                  <td className="py-1.5 text-right">{f.revenueAtRisk > 0 ? fmtMoney(f.revenueAtRisk, d.currency) : "—"}</td>
                  <td className="py-1.5"><Tag tone={constrained ? "bad" : "good"}>{constrained ? "Constrained" : "Met"}</Tag></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {constrained.length > 0 && (
        <Card>
          <CardTitle right={<Tag tone="warn">{constrained.length} to resolve</Tag>}>Gap resolution — costed options</CardTitle>
          <div className="space-y-2">
            {constrained.map((f) => {
              const isOpen = openGap === f.family;
              const opts = mitigationsFor(f.gapUnits, f.price);
              return (
                <div key={f.family} className="rounded-lg border border-[var(--color-line)]">
                  <button onClick={() => setOpenGap(isOpen ? null : f.family)} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left">
                    <span className={`inline-block transition-transform ${isOpen ? "rotate-90" : ""} text-[var(--color-ink-3)]`}>▸</span>
                    <span className="h-2 w-2 rounded-sm" style={{ background: f.color }} />
                    <span className="text-[12.5px] font-semibold">{f.family}</span>
                    <span className="text-[11px] text-[var(--color-ink-2)]">short {fmtUnits(f.gapUnits)} units · {fmtMoney(f.revenueAtRisk, d.currency)} at risk</span>
                    <span className="ml-auto text-[11px] font-medium text-[var(--color-brand-600)]">{isOpen ? "Hide" : "Options"}</span>
                  </button>
                  {isOpen && (
                    <table className="w-full border-t border-[var(--color-line)] text-[12px]">
                      <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
                        <tr>
                          <th className="px-3.5 py-1.5 font-medium">Option</th>
                          <th className="py-1.5 text-right font-medium">Recovers</th>
                          <th className="py-1.5 text-right font-medium">Residual gap</th>
                          <th className="py-1.5 text-right font-medium">Cost</th>
                          <th className="py-1.5 text-right font-medium">€/unit</th>
                          <th className="px-3.5 py-1.5 font-medium">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opts.map((o, i) => (
                          <tr key={o.option} className="border-t border-[var(--color-line)]">
                            <td className="px-3.5 py-1.5 font-medium">{i === 0 && <span className="mr-1 text-[var(--color-good-2)]">★</span>}{o.option}</td>
                            <td className="py-1.5 text-right text-[var(--color-good-2)]">{fmtUnits(o.recovered)}</td>
                            <td className="py-1.5 text-right">{o.residual > 0 ? fmtUnits(o.residual) : "closed"}</td>
                            <td className="py-1.5 text-right">{fmtMoney(o.cost, d.currency)}</td>
                            <td className="py-1.5 text-right text-[var(--color-ink-2)]">{fmtMoney(o.costPerUnit, d.currency)}</td>
                            <td className="px-3.5 py-1.5 text-[11px] text-[var(--color-ink-3)]">{o.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-ink-3)]">★ = lowest cost per recovered unit. Costs are indicative (premium × price); refine with real rates per company.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.2fr]">
        <Card pad={false}>
          <div className="border-b border-[var(--color-line)] px-4 py-3 text-[13px] font-semibold">MRP — material & supplier risk</div>
          <div className="divide-y divide-[var(--color-line)]">
            {d.materialAlerts.length === 0 && <div className="px-4 py-3 text-[12px] text-[var(--color-ink-3)]">No supplier risks flagged.</div>}
            {d.materialAlerts.map((a) => (
              <div key={a.material} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold">{a.material}</span>
                  <Tag tone={SEV[a.severity]}>{a.reliability}% OTIF · {a.leadTime}d</Tag>
                </div>
                <div className="text-[11px] text-[var(--color-ink-2)]">Affects: {a.affects}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Inventory — RM / WIP / FG by plant</CardTitle>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invChart} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#8a929e" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#8a929e" }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtMoney(v, d.currency)} width={46} />
                <Tooltip formatter={(v: number) => fmtMoney(v, d.currency)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7eaee" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="rm" name="RM" stackId="a" fill="#185FA5" />
                <Bar dataKey="wip" name="WIP" stackId="a" fill="#EF9F27" />
                <Bar dataKey="fg" name="FG" stackId="a" fill="#3B9B3B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--color-ink-2)]">
            {d.plants.map((p) => (
              <span key={p.code}>{p.name}: <strong>{p.invDays.toFixed(1)}d</strong>{p.invDays > 40 && <span className="text-[var(--color-bad)]"> ⚠</span>}</span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
