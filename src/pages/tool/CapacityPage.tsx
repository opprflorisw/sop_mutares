import { Card, CardTitle, KpiTile, Tag } from "../../components/ui";
import { PageHeader, NoData } from "./OverviewPage";
import { useProjectData } from "../../lib/projectData";

function heat(v: number) {
  if (v >= 100) return "bg-[#FCEBEB] text-[#A32D2D]";
  if (v >= 90) return "bg-[#FAEEDA] text-[#854F0B]";
  if (v === 0) return "bg-[var(--color-surface-3)] text-[var(--color-ink-3)]";
  return "bg-[#EAF3DE] text-[#3B6D11]";
}

export default function CapacityPage() {
  const d = useProjectData();
  if (!d.hasData) return <NoData />;

  const lines = d.capacityLines;
  const overloaded = lines.filter((l) => l.overload);
  const avgUtil = lines.length ? lines.reduce((s, l) => s + l.util, 0) / lines.length : 0;
  const peak = lines.reduce((m, l) => (l.util > m.util ? l : m), lines[0]);
  const spare = lines.reduce((m, l) => (l.util < m.util ? l : m), lines[0]);

  return (
    <div className="space-y-4">
      <PageHeader title="Capacity" subtitle="RCCP · machine capacity · production schedule" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Avg utilisation" value={`${avgUtil.toFixed(0)}%`} delta={`${lines.length} lines`} deltaKind="up" />
        <KpiTile label="Overloaded lines" value={`${overloaded.length}`} delta={overloaded.length ? "needs action" : "none"} deltaKind={overloaded.length ? "down" : "up"} />
        <KpiTile label="Peak load" value={peak ? `${peak.util.toFixed(0)}%` : "—"} delta={peak ? `${peak.plant} ${peak.line}` : ""} deltaKind="down" />
        <KpiTile label="Most spare" value={spare ? `${spare.util.toFixed(0)}%` : "—"} delta={spare ? `${spare.plant} ${spare.line}` : ""} hint="re-route candidate" />
      </div>

      <Card>
        <CardTitle right={<Tag tone={overloaded.length ? "bad" : "good"}>{overloaded.length} overloaded</Tag>}>
          Line utilisation — required vs available (latest period)
        </CardTitle>
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={`${l.plant}-${l.line}`} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <div className="text-[12px] font-medium">{l.line}</div>
                <div className="text-[10px] text-[var(--color-ink-3)]">{l.plant}</div>
              </div>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (l.util / Math.max(120, l.util)) * 100)}%`, background: l.overload ? "#E24B4A" : l.color }} />
              </div>
              <span className={`w-12 text-right text-[12px] font-semibold ${l.overload ? "text-[var(--color-bad)]" : "text-[var(--color-ink)]"}`}>{l.util.toFixed(0)}%</span>
              <Tag tone={l.overload ? "bad" : l.util >= 90 ? "warn" : "good"}>{l.overload ? "Overload" : l.util >= 90 ? "Tight" : "OK"}</Tag>
            </div>
          ))}
        </div>
        {overloaded.length > 0 && spare && (
          <p className="mt-3 text-[11px] text-[var(--color-ink-3)]">
            {overloaded[0].plant} {overloaded[0].line} runs at {overloaded[0].util.toFixed(0)}%.
            Options: a Saturday shift, or re-route volume to {spare.plant} {spare.line} ({spare.util.toFixed(0)}% utilised).
          </p>
        )}
      </Card>

      {d.capacitySchedule.rows.length > 0 && (
        <Card>
          <CardTitle>Production schedule — load % by line × period</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Line</th>
                  {d.capacitySchedule.periods.map((p) => (
                    <th key={p} className="px-2 py-1.5 text-center font-medium">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.capacitySchedule.rows.map((row) => (
                  <tr key={`${row.plant}-${row.line}`} className="border-t border-[var(--color-line)]">
                    <td className="py-1.5 pr-3 font-medium">{row.line}<span className="ml-1 text-[10px] text-[var(--color-ink-3)]">{row.plant}</span></td>
                    {row.util.map((v, i) => (
                      <td key={i} className="px-1.5 py-1.5 text-center">
                        <span className={`inline-block w-full rounded px-2 py-1 text-[11px] font-medium ${heat(v)}`}>{v}%</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-ink-3)]">Red cells exceed available capacity — the periods that need a capacity decision before the plan can be committed.</p>
        </Card>
      )}
    </div>
  );
}
