import { Card, CardTitle, KpiTile, StatusDot, PlaceholderNote } from "../../components/ui";
import { PageHeader } from "./OverviewPage";

type Row = { name: string; val: string; tgt: string; tone: "good" | "warn" | "bad" };

const CATEGORIES: { title: string; rows: Row[] }[] = [
  {
    title: "🎯 Customer delivery",
    rows: [
      { name: "OTIF — all customers", val: "100%", tgt: "Tgt 100%", tone: "good" },
      { name: "Forecast accuracy", val: "84%", tgt: "Tgt 85%", tone: "warn" },
      { name: "ICP adherence", val: "94–116%", tgt: "95–105%", tone: "warn" },
      { name: "Material rejection cost", val: "₹36.8 L", tgt: "Tgt 0", tone: "bad" },
    ],
  },
  {
    title: "📦 Inventory",
    rows: [
      { name: "Inventory days (BWL)", val: "19.8 d", tgt: "Tgt 40 d", tone: "good" },
      { name: "Inventory days (SBD)", val: "35.3 d", tgt: "Tgt 40 d", tone: "warn" },
      { name: "Inventory days (CNS)", val: "54.2 d", tgt: "Tgt 40 d", tone: "bad" },
      { name: "Obsolescence", val: "₹10.7 Cr", tgt: "Minimise", tone: "warn" },
    ],
  },
  {
    title: "🚛 Freight & logistics",
    rows: [
      { name: "Outbound freight % sales", val: "0.26%", tgt: "Tgt 0.39%", tone: "good" },
      { name: "Premium outbound freight", val: "₹1.75 L", tgt: "Tgt 0", tone: "warn" },
      { name: "Inbound import freight", val: "₹264.0 L", tgt: "2.15%", tone: "good" },
      { name: "Demurrage & detention", val: "₹0", tgt: "Tgt 0", tone: "good" },
    ],
  },
  {
    title: "📈 Demand",
    rows: [
      { name: "Forecast bias", val: "-4.8%", tgt: "Tgt 0", tone: "warn" },
      { name: "Sales vs budget", val: "Behind", tgt: "3 plants", tone: "warn" },
      { name: "ICP vs actual", val: "94–116%", tgt: "95–105%", tone: "warn" },
    ],
  },
  {
    title: "👥 People & savings",
    rows: [
      { name: "FTE adherence", val: "On plan", tgt: "Tgt", tone: "good" },
      { name: "Savings (BWL)", val: "₹58.8 L", tgt: "vs ₹62.5 L", tone: "warn" },
      { name: "Savings (CNS)", val: "₹92.1 L", tgt: "YTM", tone: "good" },
    ],
  },
  {
    title: "🔄 S&OP cycle health",
    rows: [
      { name: "Demand review on time", val: "✓", tgt: "Day -3", tone: "good" },
      { name: "Supply review on time", val: "✓", tgt: "Day -1", tone: "good" },
      { name: "Gap-close actions logged", val: "7 open", tgt: "Tgt 0", tone: "warn" },
      { name: "SC mgmt review done", val: "✓", tgt: "Day +2", tone: "good" },
    ],
  },
];

export default function SummaryPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="S&OP Summary" subtitle="Full KPI scorecard — SFC India Sealings (YTM Oct'24)" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label="OTIF" value="100%" delta="On target" deltaKind="up" />
        <KpiTile label="Forecast accuracy" value="84%" delta="+2.1pp" deltaKind="up" />
        <KpiTile label="Inventory days" value="35.3 d" delta="Tgt 40 d" deltaKind="warn" />
        <KpiTile label="Outbound freight" value="0.26%" delta="Tgt 0.39%" deltaKind="warn" />
        <KpiTile label="Savings YTM" value="₹155.6 L" delta="vs ₹125 L" deltaKind="up" />
      </div>

      <Card>
        <CardTitle
          right={
            <div className="flex gap-3 text-[10px] text-[var(--color-ink-2)]">
              <span className="flex items-center gap-1"><StatusDot tone="good" /> ≥ target</span>
              <span className="flex items-center gap-1"><StatusDot tone="warn" /> ±5%</span>
              <span className="flex items-center gap-1"><StatusDot tone="bad" /> &lt; target</span>
            </div>
          }
        >
          Supply chain scorecard
        </CardTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.title} className="rounded-lg bg-[var(--color-surface-2)] p-3">
              <div className="mb-2 border-b border-[var(--color-line)] pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">
                {cat.title}
              </div>
              {cat.rows.map((r) => (
                <div key={r.name} className="flex items-center justify-between border-b border-[var(--color-line)] py-1 last:border-0">
                  <span className="text-[11px] text-[var(--color-ink)]">{r.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold">{r.val}</span>
                    <span className="text-[9px] text-[var(--color-ink-3)]">{r.tgt}</span>
                    <StatusDot tone={r.tone} />
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <PlaceholderNote phase="Phase 4 / 6">
        This scorecard becomes the standardised, one-click export every factory
        sends to Mutares directors — same shape across the portfolio.
      </PlaceholderNote>
    </div>
  );
}
