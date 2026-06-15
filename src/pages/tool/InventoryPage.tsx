import { Card, CardTitle, KpiTile, Tag, PlaceholderNote } from "../../components/ui";
import { PageHeader } from "./OverviewPage";

const ROWS = [
  { plant: "Bawal (BWL)", total: 172.6, rm: 53.4, wip: 57.5, fg: 61.6, days: 19.8, obsol: 8.1, tone: "good", label: "On target" },
  { plant: "Sahibabad (SBD)", total: 202.5, rm: 182.5, wip: 18.9, fg: 1.1, days: 35.3, obsol: 0.6, tone: "warn", label: "Watch" },
  { plant: "Chennai (CNS)", total: 52.5, rm: 10.2, wip: 39.6, fg: 2.7, days: 54.2, obsol: 2.0, tone: "bad", label: "Over target" },
] as const;

const OBSERVATIONS = [
  ["Chennai WIP high at 33.7 days", "Driven by Renault QA issue causing supply delays from Bawal. Needs priority resolution."],
  ["Sahibabad RM elevated at 31.8 days", "Strategic Manesar buffer + SCHD drop for VW/MG. Monitor GIT pre-arrivals."],
  ["Bawal on-target at 19.8 days", "Below 40-day threshold. FG driven by M&M Manesar, MSIL, TATA demand spikes."],
  ["Obsolescence ₹10.7 Cr", "BWL accounts for ₹8.1 Cr (13-month non-moving). Provision review required next cycle."],
];

export default function InventoryPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Inventory management" subtitle="Plant-level stock · obsolescence · variance — YTM Oct'24" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Total inventory (BWL)" value="₹244.5 Cr" delta="40.2 days" deltaKind="warn" />
        <KpiTile label="Total inventory (CNS)" value="₹52.5 Cr" delta="54.2 days" deltaKind="warn" />
        <KpiTile label="Obsolescence (BWL)" value="₹13.7 Cr" delta="YTM" deltaKind="down" />
        <KpiTile label="Savings actual" value="₹155.6 L" delta="vs ₹152.5 L target" deltaKind="up" />
      </div>

      <Card>
        <CardTitle>Inventory by plant & category — YTM Oct'24</CardTitle>
        <table className="w-full text-[12px]">
          <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
            <tr>
              <th className="py-1.5 font-medium">Plant</th>
              <th className="py-1.5 text-right font-medium">Total (₹Cr)</th>
              <th className="py-1.5 text-right font-medium">RM</th>
              <th className="py-1.5 text-right font-medium">WIP</th>
              <th className="py-1.5 text-right font-medium">FG</th>
              <th className="py-1.5 text-right font-medium">Days</th>
              <th className="py-1.5 text-right font-medium">Obsol</th>
              <th className="py-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.plant} className="border-t border-[var(--color-line)]">
                <td className="py-1.5 font-medium">{r.plant}</td>
                <td className="py-1.5 text-right">{r.total.toFixed(1)}</td>
                <td className="py-1.5 text-right text-[#185FA5]">{r.rm.toFixed(1)}</td>
                <td className="py-1.5 text-right text-[#EF9F27]">{r.wip.toFixed(1)}</td>
                <td className="py-1.5 text-right text-[#3B9B3B]">{r.fg.toFixed(1)}</td>
                <td className={`py-1.5 text-right font-medium ${r.tone === "bad" ? "text-[var(--color-bad)]" : r.tone === "warn" ? "text-[var(--color-warn)]" : "text-[var(--color-good-2)]"}`}>
                  {r.days.toFixed(1)}
                </td>
                <td className="py-1.5 text-right text-[var(--color-bad)]">{r.obsol.toFixed(1)}</td>
                <td className="py-1.5"><Tag tone={r.tone}>{r.label}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardTitle>Key observations</CardTitle>
        <div className="space-y-2.5 text-[12.5px]">
          {OBSERVATIONS.map(([title, body]) => (
            <div key={title} className="border-b border-[var(--color-line)] pb-2 last:border-0">
              <span className="font-semibold">{title}</span>{" "}
              <span className="text-[var(--color-ink-2)]">— {body}</span>
            </div>
          ))}
        </div>
      </Card>

      <PlaceholderNote phase="Phase 4">
        Safety-stock & days-of-supply targets, multi-echelon optimisation, and
        obsolescence/non-moving drill-downs per project.
      </PlaceholderNote>
    </div>
  );
}
