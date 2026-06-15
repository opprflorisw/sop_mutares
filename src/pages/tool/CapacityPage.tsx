import { useState } from "react";
import { Card, CardTitle, KpiTile, Tag } from "../../components/ui";
import { PageHeader, NoData } from "./OverviewPage";
import { useProjectData, PLANNED_CAPACITY_PCT } from "../../lib/projectData";

function heat(v: number) {
  if (v >= 100) return "bg-[#FCEBEB] text-[#A32D2D]";
  if (v >= 95) return "bg-[#FAEEDA] text-[#854F0B]";
  if (v === 0) return "bg-[var(--color-surface-3)] text-[var(--color-ink-3)]";
  return "bg-[#EAF3DE] text-[#3B6D11]";
}
// RCCP utilisation RAG, per the Mutares method: <95 green, 95–100 amber, >100 red.
function rag(v: number): "good" | "warn" | "bad" {
  return v >= 100 ? "bad" : v >= 95 ? "warn" : "good";
}

export default function CapacityPage() {
  const d = useProjectData();
  const [pct, setPct] = useState(Math.round(PLANNED_CAPACITY_PCT * 100));
  if (!d.hasData) return <NoData />;

  // Re-derive planned utilisation against the user-chosen planning %.
  const lines = d.capacityLines.map((l) => {
    const plannedMin = l.availableMin * (pct / 100);
    return { ...l, plannedMin, plannedUtil: plannedMin ? (l.requiredMin / plannedMin) * 100 : 0 };
  });
  const overPlanned = lines.filter((l) => l.plannedUtil >= 100);
  const overAvail = lines.filter((l) => l.overload);
  const avgPlanned = lines.length ? lines.reduce((s, l) => s + l.plannedUtil, 0) / lines.length : 0;
  const peak = lines.reduce((m, l) => (l.plannedUtil > m.plannedUtil ? l : m), lines[0]);
  const spare = lines.reduce((m, l) => (l.plannedUtil < m.plannedUtil ? l : m), lines[0]);

  return (
    <div className="space-y-4">
      <PageHeader title="Capacity" subtitle="RCCP · available vs planned demonstrated capacity · the bottleneck" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Util. vs planned" value={`${avgPlanned.toFixed(0)}%`} delta={`@ ${pct}% planning level`} deltaKind={rag(avgPlanned) === "bad" ? "down" : rag(avgPlanned) === "warn" ? "warn" : "up"} />
        <KpiTile label="Util. vs available" value={`${d.kpis.capacityUtil}%`} delta="of the MAC" hint="of the MAC" />
        <KpiTile label="Over planned level" value={`${overPlanned.length}`} delta={overPlanned.length ? "needs a decision" : "all within plan"} deltaKind={overPlanned.length ? "down" : "up"} />
        <KpiTile label="Bottleneck" value={peak ? `${peak.plannedUtil.toFixed(0)}%` : "—"} delta={peak ? `${peak.plant} ${peak.line}` : ""} deltaKind="down" />
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[13px] font-semibold">Line utilisation — required load vs capacity (latest period)</h3>
          <label className="flex items-center gap-2 text-[11px] text-[var(--color-ink-2)]">
            Planning level
            <input type="range" min={50} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-28 accent-[var(--color-brand-600)]" />
            <span className="w-9 font-semibold text-[var(--color-ink)]">{pct}%</span>
          </label>
        </div>
        <p className="-mt-1 mb-3 text-[11px] text-[var(--color-ink-3)]">
          Bars show load vs <strong>planned</strong> available demonstrated capacity ({pct}% of the MAC). The grey tick marks the <strong>available</strong> (MAC) line — the absolute ceiling.
          RAG: &lt;95% green · 95–100% amber · &gt;100% red.
        </p>
        <div className="space-y-3">
          {lines.map((l) => {
            const tone = rag(l.plannedUtil);
            // scale: 100% planned = the planning level; MAC tick sits at pct/100 of the planned bar's full width frame
            const frameMax = Math.max(120, l.plannedUtil + 5);
            const macTick = (100 / (pct / 100)) / frameMax * 100; // available util position relative to planned scale
            return (
              <div key={`${l.plant}-${l.line}`} className="flex items-center gap-3">
                <div className="w-40 shrink-0">
                  <div className="text-[12px] font-medium">{l.line}</div>
                  <div className="text-[10px] text-[var(--color-ink-3)]">{l.plant}</div>
                </div>
                <div className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (l.plannedUtil / frameMax) * 100)}%`, background: tone === "bad" ? "#E24B4A" : tone === "warn" ? "#EF9F27" : l.color }} />
                  {macTick <= 100 && <div className="absolute top-[-2px] bottom-[-2px] w-px bg-[var(--color-ink-3)]" style={{ left: `${macTick}%` }} title="Available (MAC) limit" />}
                </div>
                <span className={`w-12 text-right text-[12px] font-semibold ${tone === "bad" ? "text-[var(--color-bad)]" : tone === "warn" ? "text-[var(--color-warn)]" : "text-[var(--color-ink)]"}`}>{l.plannedUtil.toFixed(0)}%</span>
                <Tag tone={tone}>{tone === "bad" ? "Over" : tone === "warn" ? "Tight" : "OK"}</Tag>
              </div>
            );
          })}
        </div>
        {overPlanned.length > 0 && spare && (
          <p className="mt-3 text-[11px] text-[var(--color-ink-3)]">
            {overPlanned[0].plant} {overPlanned[0].line} runs at {overPlanned[0].plannedUtil.toFixed(0)}% of the planned level
            {overAvail.length > 0 && overAvail.some((x) => x.line === overPlanned[0].line) ? " — and exceeds the MAC, so it physically can't be met without more capacity" : ""}.
            Options: lift the planning level, add a shift, or re-route to {spare.plant} {spare.line} ({spare.plannedUtil.toFixed(0)}% utilised).
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
          <p className="mt-2 text-[11px] text-[var(--color-ink-3)]">Load vs available (MAC). Red cells exceed available capacity — the periods that need a capacity decision before the plan can be committed.</p>
        </Card>
      )}
    </div>
  );
}
