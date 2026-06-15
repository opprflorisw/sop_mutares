import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardTitle, KpiTile, Tag, PlaceholderNote } from "../../components/ui";
import { PageHeader } from "./OverviewPage";
import { FAMILIES, familyMetrics, MRP_ALERTS, PLANTS } from "../../lib/sealings";

const withInv = PLANTS.filter((p) => p.invTotal !== null);
const totalRisk = FAMILIES.reduce((s, f) => s + familyMetrics(f).revenueAtRisk, 0);
const totalDemand = FAMILIES.reduce((s, f) => s + familyMetrics(f).demandValue, 0);
const totalSupply = FAMILIES.reduce((s, f) => s + familyMetrics(f).supplyValue, 0);
const SEV = { critical: "bad", high: "warn", medium: "info" } as const;

export default function SupplyPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Supply" subtitle="Constrained plan · the demand-supply gap · MRP · inventory" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Demand (unconstr.)" value={`${totalDemand.toFixed(1)} mEUR`} hint="What the market wants" />
        <KpiTile label="Supply (constrained)" value={`${totalSupply.toFixed(1)} mEUR`} delta={`-${(totalDemand - totalSupply).toFixed(1)} mEUR vs demand`} deltaKind="down" />
        <KpiTile label="Revenue at risk" value={`€${Math.round(totalRisk)}k`} delta="Unmet demand" deltaKind="down" />
        <KpiTile label="Projected OTIF" value="96%" delta="Target 100%" deltaKind="warn" />
      </div>

      {/* The gap — the central S&OP output */}
      <Card>
        <CardTitle right={<Tag tone="info">the gap drives the decision</Tag>}>
          Demand vs supply gap — by product family
        </CardTitle>
        <table className="w-full text-[12px]">
          <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
            <tr>
              <th className="py-1.5 font-medium">Family</th>
              <th className="py-1.5 text-right font-medium">Demand (000s)</th>
              <th className="py-1.5 text-right font-medium">Supply (000s)</th>
              <th className="py-1.5 text-right font-medium">Gap</th>
              <th className="py-1.5 text-right font-medium">Gap %</th>
              <th className="py-1.5 text-right font-medium">€ at risk</th>
              <th className="py-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {FAMILIES.map((f) => {
              const m = familyMetrics(f);
              const constrained = m.gapUnits > 0;
              return (
                <tr key={f.family} className="border-t border-[var(--color-line)]">
                  <td className="py-1.5 font-medium">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: f.color }} />
                    {f.family}
                  </td>
                  <td className="py-1.5 text-right">{f.unconstrained.toLocaleString()}</td>
                  <td className="py-1.5 text-right">{f.constrained.toLocaleString()}</td>
                  <td className={`py-1.5 text-right font-medium ${constrained ? "text-[var(--color-bad)]" : "text-[var(--color-good-2)]"}`}>
                    {m.gapUnits > 0 ? `-${m.gapUnits.toLocaleString()}` : "0"}
                  </td>
                  <td className={`py-1.5 text-right ${constrained ? "text-[var(--color-bad)]" : "text-[var(--color-ink-3)]"}`}>
                    {m.gapPct > 0 ? `${m.gapPct.toFixed(0)}%` : "—"}
                  </td>
                  <td className="py-1.5 text-right">{m.revenueAtRisk > 0 ? `€${Math.round(m.revenueAtRisk)}k` : "—"}</td>
                  <td className="py-1.5">
                    <Tag tone={constrained ? "bad" : "good"}>
                      {constrained ? "Constrained" : "Met"}
                    </Tag>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.2fr]">
        {/* MRP */}
        <Card pad={false}>
          <div className="border-b border-[var(--color-line)] px-4 py-3 text-[13px] font-semibold">
            MRP — material shortages
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {MRP_ALERTS.map((a) => (
              <div key={a.material} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold">
                    {a.material} · {a.week}
                  </span>
                  <Tag tone={SEV[a.severity]}>€{a.valueAtRisk}k</Tag>
                </div>
                <div className="text-[11px] text-[var(--color-ink-2)]">{a.desc}</div>
                <div className="mt-0.5 text-[10px] text-[var(--color-ink-3)]">Affects: {a.affects}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Inventory */}
        <Card>
          <CardTitle>Inventory — RM / WIP / FG by plant (₹ Cr)</CardTitle>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={withInv} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#8a929e" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#8a929e" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7eaee" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="rm" name="RM" stackId="a" fill="#185FA5" />
                <Bar dataKey="wip" name="WIP" stackId="a" fill="#EF9F27" />
                <Bar dataKey="fg" name="FG" stackId="a" fill="#3B9B3B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--color-ink-2)]">
            {withInv.map((p) => (
              <span key={p.code}>
                {p.name}: <strong>{p.invDays!.toFixed(1)}d</strong>
                {p.invDays! > 40 && <span className="text-[var(--color-bad)]"> ⚠</span>}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <PlaceholderNote phase="Phase 3">
        Gap-closing options costed side by side (overtime, alternate sourcing,
        pre-build, re-timing), full MRP explosion and safety-stock targets.
      </PlaceholderNote>
    </div>
  );
}
