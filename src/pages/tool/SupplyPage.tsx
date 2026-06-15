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
import { PLANTS } from "../../lib/sealings";

const withInv = PLANTS.filter((p) => p.invTotal !== null);

export default function SupplyPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Supply & MPS" subtitle="RM / WIP / FG split · RCCP capacity" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Total ICP Dec'22" value="₹35.6 Cr" hint="≈ 4.04 mEUR" />
        <KpiTile label="Total prod plan" value="₹34.8 Cr" delta="-2.1% vs ICP" deltaKind="down" />
        <KpiTile label="FG closing stock" value="₹11.9 Cr" deltaKind="warn" delta="Dec'22" />
        <KpiTile label="Total SKUs" value="801" hint="5 plants" />
      </div>

      <Card>
        <CardTitle>MPS inventory split — RM / WIP / FG by plant (₹ Cr)</CardTitle>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={withInv} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8a929e" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8a929e" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7eaee" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="rm" name="Raw Material" stackId="a" fill="#185FA5" radius={[0, 0, 0, 0]} />
              <Bar dataKey="wip" name="Work in Progress" stackId="a" fill="#EF9F27" />
              <Bar dataKey="fg" name="Finished Goods" stackId="a" fill="#3B9B3B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="mt-2 w-full text-[12px]">
          <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
            <tr>
              <th className="py-1.5 font-medium">Plant</th>
              <th className="py-1.5 text-right font-medium">Total</th>
              <th className="py-1.5 text-right font-medium">RM</th>
              <th className="py-1.5 text-right font-medium">WIP</th>
              <th className="py-1.5 text-right font-medium">FG</th>
              <th className="py-1.5 text-right font-medium">Days</th>
              <th className="py-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {withInv.map((p) => {
              const days = p.invDays!;
              const tone = days > 40 ? "bad" : days > 35 ? "warn" : "good";
              const label = days > 40 ? "Over target" : days > 35 ? "Watch" : "On target";
              return (
                <tr key={p.code} className="border-t border-[var(--color-line)]">
                  <td className="py-1.5 font-medium">{p.name}</td>
                  <td className="py-1.5 text-right">{p.invTotal!.toFixed(1)}</td>
                  <td className="py-1.5 text-right text-[#185FA5]">{p.rm!.toFixed(1)}</td>
                  <td className="py-1.5 text-right text-[#EF9F27]">{p.wip!.toFixed(1)}</td>
                  <td className="py-1.5 text-right text-[#3B9B3B]">{p.fg!.toFixed(1)}</td>
                  <td className="py-1.5 text-right font-medium">{days.toFixed(1)}</td>
                  <td className="py-1.5"><Tag tone={tone}>{label}</Tag></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-[var(--color-ink-3)]">Target = 40 days. RM includes goods-in-transit.</p>
      </Card>

      <Card>
        <CardTitle>RCCP — capacity utilisation by plant</CardTitle>
        <div className="space-y-2.5">
          {PLANTS.filter((p) => p.utilisation > 0).map((p) => {
            const tone = p.utilisation >= 90 ? "good" : p.utilisation >= 85 ? "warn" : "good";
            return (
              <div key={p.code} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[12px]">{p.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div className="h-full rounded-full" style={{ width: `${p.utilisation}%`, background: p.color }} />
                </div>
                <span className="w-10 text-right text-[12px] font-semibold" style={{ color: p.color }}>
                  {p.utilisation}%
                </span>
                <Tag tone={tone}>{p.utilisation >= 85 && p.utilisation < 90 ? "Watch" : "Good"}</Tag>
              </div>
            );
          })}
        </div>
      </Card>

      <PlaceholderNote phase="Phase 3">
        Constrained vs unconstrained planning, capacity-overload solver
        (Saturday / 3rd-shift scenarios with cost-per-minute) and BOM pegging.
      </PlaceholderNote>
    </div>
  );
}
