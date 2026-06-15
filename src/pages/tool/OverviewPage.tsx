import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardTitle, KpiTile, PlaceholderNote } from "../../components/ui";
import { HEADLINE_KPIS } from "../../lib/sealings";

const REV_SERIES = [
  "Dec'22", "Jan'23", "Feb'23", "Mar'23", "Apr'23", "May'23",
  "Jun'23", "Jul'23", "Aug'23", "Sep'23", "Oct'23", "Nov'23",
].map((m, i) => ({
  m,
  rev: +(4.04 * Math.pow(1.06, i / 12) * (1 + 0.055 * Math.sin((i + 2) * Math.PI / 6))).toFixed(2),
}));

const NAV = [
  { to: "/tool/workflow", emoji: "🗂", title: "Workflow", desc: "Monthly S&OP cycle, owners, meeting sequence" },
  { to: "/tool/demand", emoji: "📈", title: "Demand", desc: "Forecast, scenario levers, accuracy & bias" },
  { to: "/tool/supply", emoji: "🏭", title: "Supply & MPS", desc: "RM/WIP/FG split, RCCP, capacity" },
  { to: "/tool/summary", emoji: "✅", title: "S&OP Summary", desc: "Full KPI scorecard" },
  { to: "/tool/control-tower", emoji: "⚡", title: "Control Tower", desc: "All KPIs + alerts in one view" },
  { to: "/tool/inventory", emoji: "📦", title: "Inventory", desc: "Plant stock, obsolescence, variance" },
];

export default function OverviewPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Overview"
        subtitle="Demand · Supply · Production at a glance"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Forecast accuracy" value="84%" delta="+2.1pp vs last month" deltaKind="up" />
        <KpiTile label="18m revenue (base)" value="~72 mEUR" delta="Base scenario" deltaKind="up" />
        <KpiTile label="Inventory days" value={`${HEADLINE_KPIS.inventoryDays} d`} delta={`Target ${HEADLINE_KPIS.inventoryTarget} d`} deltaKind="warn" />
        <KpiTile label="Dec'22 ICP total" value={`₹${HEADLINE_KPIS.icpTotalCr} Cr`} hint={`${HEADLINE_KPIS.plantCount} plants · ${HEADLINE_KPIS.skuCount} SKUs`} />
      </div>

      <Card>
        <CardTitle>Revenue forecast — mEUR (12m, base scenario)</CardTitle>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REV_SERIES} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#185FA5" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#185FA5" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#8a929e" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#8a929e" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e7eaee" }} />
              <Area type="monotone" dataKey="rev" stroke="#185FA5" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle>Jump to a module</CardTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-3.5 transition-colors hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)]"
            >
              <div className="text-[18px]">{n.emoji}</div>
              <div className="mt-1.5 text-[13px] font-semibold">{n.title}</div>
              <div className="text-[11px] text-[var(--color-ink-2)]">{n.desc}</div>
            </Link>
          ))}
        </div>
      </Card>

      <PlaceholderNote phase="Phase 2+">
        These views currently run on the seeded Sealings dataset. Once data
        upload (Phase 1) is live, every module reads from your selected project's
        files.
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
