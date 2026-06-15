import { Card, CardTitle, KpiTile, Tag, PlaceholderNote } from "../../components/ui";
import { PageHeader } from "./OverviewPage";
import { CAPACITY_LINES } from "../../lib/sealings";

// Capacity module (RCCP) — machine/line utilisation, overload detection,
// and an indicative production schedule. One of the three core modules.

const lines = CAPACITY_LINES.map((l) => ({
  ...l,
  util: (l.requiredMin / l.availableMin) * 100,
  overload: l.requiredMin > l.availableMin,
}));

const overloaded = lines.filter((l) => l.overload);
const avgUtil = lines.reduce((s, l) => s + l.util, 0) / lines.length;

// A tiny indicative production schedule (family × week load).
const SCHEDULE = [
  { family: "Welt seals", weeks: [70, 72, 68, 74] },
  { family: "GlassRun channels", weeks: [88, 92, 95, 90] },
  { family: "Profile extrusions", weeks: [96, 104, 111, 108] },
  { family: "Dog-leg seals", weeks: [60, 58, 62, 64] },
];

function heat(v: number) {
  if (v >= 100) return "bg-[#FCEBEB] text-[#A32D2D]";
  if (v >= 90) return "bg-[#FAEEDA] text-[#854F0B]";
  return "bg-[#EAF3DE] text-[#3B6D11]";
}

export default function CapacityPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Capacity" subtitle="RCCP · machine capacity · production schedule" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Avg utilisation" value={`${avgUtil.toFixed(0)}%`} delta="Across 5 lines" deltaKind="up" />
        <KpiTile label="Overloaded lines" value={`${overloaded.length}`} delta={overloaded.length ? "Needs action" : "None"} deltaKind={overloaded.length ? "down" : "up"} />
        <KpiTile label="Peak load" value="111%" delta="Bawal Extrusion-2" deltaKind="down" />
        <KpiTile label="Spare capacity" value="Sanand +24%" hint="Re-route candidate" />
      </div>

      <Card>
        <CardTitle right={<Tag tone="bad">{overloaded.length} overloaded</Tag>}>
          Line utilisation — required vs available
        </CardTitle>
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={`${l.plant}-${l.line}`} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <div className="text-[12px] font-medium">{l.line}</div>
                <div className="text-[10px] text-[var(--color-ink-3)]">{l.plant}</div>
              </div>
              <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                {/* 100% marker */}
                <div className="absolute inset-y-0 left-[100%] w-px bg-[var(--color-ink-3)]" style={{ left: `${Math.min(100, (100 / Math.max(120, l.util)) * 100)}%` }} />
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (l.util / Math.max(120, l.util)) * 100)}%`,
                    background: l.overload ? "#E24B4A" : l.color,
                  }}
                />
              </div>
              <span className={`w-12 text-right text-[12px] font-semibold ${l.overload ? "text-[var(--color-bad)]" : "text-[var(--color-ink)]"}`}>
                {l.util.toFixed(0)}%
              </span>
              <Tag tone={l.overload ? "bad" : l.util >= 90 ? "warn" : "good"}>
                {l.overload ? "Overload" : l.util >= 90 ? "Tight" : "OK"}
              </Tag>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[var(--color-ink-3)]">
          Bawal Extrusion-2 runs at 111% in Nov–Dec. Options: a Saturday shift,
          or re-route Profile volume to Sanand (76% utilised).
        </p>
      </Card>

      <Card>
        <CardTitle>Production schedule — load % by family × week</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
              <tr>
                <th className="py-1.5 pr-3 font-medium">Family</th>
                {["Wk 22", "Wk 23", "Wk 24", "Wk 25"].map((w) => (
                  <th key={w} className="px-2 py-1.5 text-center font-medium">{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCHEDULE.map((row) => (
                <tr key={row.family} className="border-t border-[var(--color-line)]">
                  <td className="py-1.5 pr-3 font-medium">{row.family}</td>
                  {row.weeks.map((v, i) => (
                    <td key={i} className="px-1.5 py-1.5 text-center">
                      <span className={`inline-block w-full rounded px-2 py-1 text-[11px] font-medium ${heat(v)}`}>
                        {v}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[var(--color-ink-3)]">
          Red cells exceed available capacity — the weeks that need a capacity
          decision before the plan can be committed.
        </p>
      </Card>

      <PlaceholderNote phase="Phase 3">
        Capacity-solution workbench: cost each overload fix (Saturday / 3rd shift
        / re-route / outsource) with cost-per-minute and margin impact.
      </PlaceholderNote>
    </div>
  );
}
