import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardTitle, KpiTile, Tag, PlaceholderNote } from "../../components/ui";
import { FAMILIES, familyMetrics, ISSUE_FEED } from "../../lib/sealings";

// Executive S&OP snapshot — the one screen that wins leadership buy-in:
// the 5 monthly KPIs + the demand-supply gap + the issues that need a decision.

const gapData = FAMILIES.map((f) => {
  const m = familyMetrics(f);
  return {
    family: f.family.replace(" ", "\n"),
    short: f.family,
    demand: f.unconstrained,
    supply: f.constrained,
    gap: m.gapUnits,
    risk: m.revenueAtRisk,
  };
});

const totalRisk = gapData.reduce((s, d) => s + d.risk, 0);
const totalDemandVal = FAMILIES.reduce((s, f) => s + familyMetrics(f).demandValue, 0);

const NAV = [
  { to: "/tool/demand", emoji: "📈", title: "Demand", desc: "Unconstrained forecast, revenue, bias & variation" },
  { to: "/tool/supply", emoji: "🏭", title: "Supply", desc: "Constrained plan, the gap, MRP & inventory" },
  { to: "/tool/capacity", emoji: "⚙️", title: "Capacity", desc: "Line utilisation, overload, production schedule" },
];

const SEV_TONE = { critical: "bad", high: "warn", medium: "info" } as const;

export default function OverviewPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Executive S&OP" subtitle="Monthly snapshot · Dec'22 cycle · the numbers leadership decides on" />

      {/* 5 key monthly KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label="Revenue projection" value={`${totalDemandVal.toFixed(1)} mEUR`} delta="12m base case" deltaKind="up" />
        <KpiTile label="Forecast accuracy" value="84%" delta="+2.1pp" deltaKind="up" />
        <KpiTile label="Inventory days" value="35.3 d" delta="Target 40 d" deltaKind="warn" />
        <KpiTile label="Capacity util." value="88%" delta="1 line overloaded" deltaKind="warn" />
        <KpiTile label="Revenue at risk" value={`€${Math.round(totalRisk)}k`} delta="from demand-supply gap" deltaKind="down" />
      </div>

      {/* Gap + issue feed */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle
            right={<Tag tone="info">unconstrained vs constrained</Tag>}
          >
            Demand vs supply gap — by product family (000s units)
          </CardTitle>
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapData} margin={{ top: 6, right: 8, left: -16, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="short" tick={{ fontSize: 9, fill: "#8a929e" }} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: "#8a929e" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7eaee" }} />
                <Bar dataKey="demand" name="Demand (unconstrained)" fill="#85B7EB" radius={[3, 3, 0, 0]} />
                <Bar dataKey="supply" name="Supply (constrained)" radius={[3, 3, 0, 0]}>
                  {gapData.map((d, i) => (
                    <Cell key={i} fill={d.gap > 0 ? "#185FA5" : "#1D9E75"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-ink-3)]">
            Where the dark bar is below the light bar, demand can't be met — that
            gap is the decision. Total revenue at risk: €{Math.round(totalRisk)}k.
          </p>
        </Card>

        <Card pad={false}>
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <span className="text-[13px] font-semibold">Issues to decide</span>
            <Tag tone="bad">{ISSUE_FEED.filter((i) => i.severity === "critical").length} critical</Tag>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {ISSUE_FEED.map((i) => (
              <div key={i.title} className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="mt-0.5">
                  {i.severity === "critical" ? "🔴" : i.severity === "high" ? "🟠" : "🟡"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold">{i.title}</span>
                    {i.valueAtRisk > 0 && (
                      <Tag tone={SEV_TONE[i.severity]}>€{i.valueAtRisk}k</Tag>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--color-ink-2)]">{i.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Jump to the three core modules */}
      <Card>
        <CardTitle>The three core modules</CardTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4 transition-colors hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)]"
            >
              <div className="text-[20px]">{n.emoji}</div>
              <div className="mt-1.5 text-[13px] font-semibold">{n.title}</div>
              <div className="text-[11px] text-[var(--color-ink-2)]">{n.desc}</div>
            </Link>
          ))}
        </div>
      </Card>

      <PlaceholderNote phase="Phase 2+">
        Snapshot runs on the seeded Sealings dataset. Once upload (Phase 1) is
        live, the same five KPIs and gap view render from each portfolio
        company's standardised monthly data.
      </PlaceholderNote>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 className="text-[19px] font-semibold">{title}</h1>
      {subtitle && (
        <p className="text-[12.5px] text-[var(--color-ink-2)]">{subtitle}</p>
      )}
    </div>
  );
}
