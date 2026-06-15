import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Card, CardTitle, KpiTile, Tag } from "../../components/ui";
import { PageHeader, NoData } from "./OverviewPage";
import { useProjectData, fmtMoney, fmtUnits } from "../../lib/projectData";
import { mitigationsFor } from "../../lib/mitigations";
import { C, TOOLTIP_STYLE } from "../../lib/colors";
import { FilterScope, FilterMenu, ResetFiltersButton, useWidgetFilter } from "../../components/widgetFilters";

const SEV = { critical: "bad", high: "warn", medium: "info" } as const;

export default function SupplyPage() {
  const d = useProjectData();
  if (!d.hasData) return <NoData />;
  return (
    <FilterScope>
      <SupplyBody />
    </FilterScope>
  );
}

function SupplyBody() {
  const d = useProjectData();
  const [openGap, setOpenGap] = useState<string | null>(null);

  const famFilter = useWidgetFilter("sp-fam", d.families.map((f) => ({ key: f.family, label: f.family, color: f.color })));
  const plantFilter = useWidgetFilter("sp-plant", d.plants.map((p) => ({ key: p.code, label: p.name, color: p.color })));
  const mrpOptions = [...new Set(d.materialAlerts.map((a) => a.severity))].map((s) => ({ key: s, label: s[0].toUpperCase() + s.slice(1) }));
  const mrpFilter = useWidgetFilter("sp-mrp", mrpOptions);

  const families = d.families.filter((f) => !famFilter.isHidden(f.family));
  const plants = d.plants.filter((p) => !plantFilter.isHidden(p.code));
  const materialAlerts = d.materialAlerts.filter((a) => !mrpFilter.isHidden(a.severity));
  const slob = d.slob.filter((s) => !plantFilter.isHidden(s.plant));
  const slobValue = slob.reduce((s, x) => s + x.value, 0);
  const constrained = families.filter((f) => f.gapUnits > 0);

  const totalDemand = families.reduce((s, f) => s + f.demandValue, 0);
  const totalSupply = families.reduce((s, f) => s + f.supplyValue, 0);
  const invChart = plants.map((p) => ({ name: p.name, rm: p.rm, wip: p.wip, fg: p.fg }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Supply" subtitle="Constrained plan · the demand-supply gap · MRP · inventory" />
        <ResetFiltersButton />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Demand (unconstr.)" value={fmtMoney(totalDemand, d.currency)} hint="What the market wants" />
        <KpiTile label="Supply (constrained)" value={fmtMoney(totalSupply, d.currency)} delta={`-${fmtMoney(totalDemand - totalSupply, d.currency)} vs demand`} deltaKind={totalDemand - totalSupply > 0 ? "down" : "up"} />
        <KpiTile label="Revenue at risk" value={fmtMoney(d.kpis.revenueAtRisk, d.currency)} delta="unmet demand" deltaKind="down" />
        <KpiTile label="Inventory turns" value={`${d.kpis.inventoryTurns}×`} delta={`${d.kpis.inventoryDays}d on hand`} deltaKind={d.kpis.inventoryTurns >= 9 ? "up" : "warn"} />
      </div>

      <Card>
        <CardTitle right={<div className="flex items-center gap-1.5"><Tag tone="info">the gap drives the decision</Tag><FilterMenu filter={famFilter} label="Product families" /></div>}>Demand vs supply gap — by product family</CardTitle>
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
            {families.map((f) => {
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
                    <div className="overflow-x-auto">
                      <table className="w-full border-t border-[var(--color-line)] text-[12px]">
                        <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
                          <tr>
                            <th className="px-3.5 py-1.5 font-medium">Alternative</th>
                            <th className="py-1.5 text-right font-medium">Volume</th>
                            <th className="py-1.5 text-right font-medium">Residual</th>
                            <th className="py-1.5 text-right font-medium">Op. cost</th>
                            <th className="py-1.5 text-right font-medium">{d.currency}/unit</th>
                            <th className="py-1.5 text-right font-medium">Capital</th>
                            <th className="px-2 py-1.5 font-medium">Resource</th>
                            <th className="px-3.5 py-1.5 font-medium">Timing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {opts.map((o, i) => (
                            <tr key={o.option} className="border-t border-[var(--color-line)]">
                              <td className="px-3.5 py-1.5 font-medium">{i === 0 && <span className="mr-1 text-[var(--color-good-2)]" title="lowest cost per unit">★</span>}{o.option}</td>
                              <td className="py-1.5 text-right text-[var(--color-good-2)]">+{fmtUnits(o.recovered)}</td>
                              <td className="py-1.5 text-right">{o.residual > 0 ? fmtUnits(o.residual) : "closed"}</td>
                              <td className="py-1.5 text-right">{fmtMoney(o.cost, d.currency)}</td>
                              <td className="py-1.5 text-right text-[var(--color-ink-2)]">{fmtMoney(o.costPerUnit, d.currency)}</td>
                              <td className="py-1.5 text-right">{o.capital > 0 ? fmtMoney(o.capital, d.currency) : "—"}</td>
                              <td className="px-2 py-1.5 text-[11px] text-[var(--color-ink-2)]">{o.resource}</td>
                              <td className="px-3.5 py-1.5 text-[11px] text-[var(--color-ink-3)]">{o.timing}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-ink-3)]">★ = lowest cost per recovered unit. Costs are indicative (premium × price); refine with real rates per company.</p>
        </Card>
      )}

      {(d.inventoryProjection.length > 0 || d.slob.length > 0) && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {d.inventoryProjection.length > 0 && (
            <Card>
              <CardTitle right={<Tag tone="info">target {d.kpis.inventoryTarget}d</Tag>}>Inventory projection — planned glide to target</CardTitle>
              <div className="space-y-2">
                {d.inventoryProjection.map((p) => {
                  const over = p.days > d.kpis.inventoryTarget;
                  const w = Math.min(100, (p.days / Math.max(d.kpis.inventoryTarget * 1.6, ...d.inventoryProjection.map((x) => x.days))) * 100);
                  return (
                    <div key={p.m} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-[11px] text-[var(--color-ink-2)]">{p.m.slice(2)}{!p.planned && <span className="ml-1 text-[var(--color-ink-3)]">now</span>}</span>
                      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                        <div className="h-full rounded-full" style={{ width: `${w}%`, background: over ? C.warn : C.good, opacity: p.planned ? 0.85 : 1 }} />
                      </div>
                      <span className={`w-12 text-right text-[12px] font-semibold ${over ? "text-[var(--color-warn)]" : "text-[var(--color-good-2)]"}`}>{p.days.toFixed(0)}d</span>
                      <span className="w-14 text-right text-[11px] text-[var(--color-ink-3)]">{fmtMoney(p.value, d.currency)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-[var(--color-ink-3)]">Planned reduction closing a third of the gap to target each month. Frees ~{fmtMoney(Math.max(0, (d.inventoryProjection[0]?.value ?? 0) - (d.inventoryProjection[d.inventoryProjection.length - 1]?.value ?? 0)), d.currency)} of working capital.</p>
            </Card>
          )}

          {d.slob.length > 0 ? (
            <Card pad={false}>
              <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
                <span className="text-[13px] font-semibold">Slow-moving & obsolete (SLOB)</span>
                <div className="flex items-center gap-1.5">
                  <Tag tone="warn">{fmtMoney(slobValue, d.currency)} tied up</Tag>
                  {d.plants.length > 1 && <FilterMenu filter={plantFilter} label="Plants" />}
                </div>
              </div>
              <div className="max-h-[220px] divide-y divide-[var(--color-line)] overflow-y-auto">
                {slob.length === 0 && <div className="px-4 py-3 text-[12px] text-[var(--color-ink-3)]">No SLOB at the selected plants.</div>}
                {slob.slice(0, 8).map((s) => (
                  <div key={`${s.sku}-${s.plant}`} className="flex items-center gap-3 px-4 py-2 text-[12px]">
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{s.sku}</span>
                      <span className="ml-1.5 text-[11px] text-[var(--color-ink-3)]">{s.plant}</span>
                      <div className="truncate text-[11px] text-[var(--color-ink-2)]">{s.desc}</div>
                    </span>
                    <span className="text-right text-[11px] text-[var(--color-ink-2)]">{s.monthsCover >= 99 ? "no sales" : `${s.monthsCover}m cover`}</span>
                    <span className="w-14 text-right font-semibold">{fmtMoney(s.value, d.currency)}</span>
                    <Tag tone={s.status === "obsolete" ? "bad" : "warn"}>{s.status === "obsolete" ? "Obsolete" : "Slow"}</Tag>
                  </div>
                ))}
              </div>
              <p className="px-4 py-2 text-[11px] text-[var(--color-ink-3)]">FG sitting &gt;4 months of cover (or with no recent sales) — candidates to stop building, discount or write down.</p>
            </Card>
          ) : (
            <Card>
              <CardTitle>Slow-moving & obsolete (SLOB)</CardTitle>
              <div className="py-6 text-center text-[12px] text-[var(--color-ink-3)]">No slow-moving or obsolete FG — stock is turning healthily.</div>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.2fr]">
        <Card pad={false}>
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <span className="text-[13px] font-semibold">MRP — material & supplier risk</span>
            {mrpOptions.length > 1 && <FilterMenu filter={mrpFilter} label="Severity" />}
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {materialAlerts.length === 0 && <div className="px-4 py-3 text-[12px] text-[var(--color-ink-3)]">{d.materialAlerts.length === 0 ? "No supplier risks flagged." : "No alerts match the current filter."}</div>}
            {materialAlerts.map((a) => (
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
          <CardTitle right={d.plants.length > 1 ? <FilterMenu filter={plantFilter} label="Plants" /> : undefined}>Inventory — RM / WIP / FG by plant</CardTitle>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invChart} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
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
            {plants.map((p) => (
              <span key={p.code}>{p.name}: <strong>{p.invDays.toFixed(1)}d</strong>{p.invDays > 40 && <span className="text-[var(--color-bad)]"> ⚠</span>}</span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
