import { useState } from "react";
import { Card, CardTitle, Tag, PlaceholderNote } from "../../components/ui";
import { PageHeader } from "./OverviewPage";
import { WORKFLOW } from "../../lib/sealings";

const DETAILS: string[] = [
  "Data inputs: actual sales vs ICP, inventory (RM/WIP/FG), supplier confirmations, customer order patterns. Demand manager reconciles actuals vs forecast.",
  "\"How much will we sell and to whom?\" Review forecast accuracy & BIAS by SKU/customer. Approve ICP for next month. Identify vulnerable operations. Agree demand gap-close actions.",
  "\"How can we source, make and deliver?\" RCCP update across plants. Confirm RM availability (incl. imports/GIT). Validate WIP/FG plans vs requirements. Identify capacity constraints.",
  "\"What is the overall picture? What decisions close gaps?\" Reconcile demand vs supply. Approve IBP plan. Review P&L. Finalise decisions, document owners and deadlines.",
  "Issue final MPS including RM procurement, WIP scheduling, FG build by customer. Trigger purchase orders and IC transfers. Confirm delivery commitments.",
  "Review scorecard KPIs vs targets: OTIF, inventory days, freight %, accuracy. Escalate red items. Confirm owners. Set agenda for next cycle.",
];

const MEETINGS = [
  ["-4", "Demand updates", "Revised ICP consensus", "Demand Mgr"],
  ["-3", "Demand Review (ICP)", "Approved demand plan, VulOps", "Demand Mgr"],
  ["-2", "RCCP updates", "Capacity plan refresh", "Supply Plg Mgr"],
  ["-1", "Supply Review (RCCP)", "Approved supply & inventory plan", "Supply Plg Mgr"],
  ["0", "S&OP Meeting", "Reconciled IBP plan, decisions", "BU Head"],
  ["+1", "MPS Updated incl. RM", "Detailed production schedule", "Site Planners"],
  ["+2", "SC Management Review", "Performance vs KPI, escalations", "SC Director"],
];

export default function WorkflowPage() {
  const [active, setActive] = useState(1);
  return (
    <div className="space-y-4">
      <PageHeader title="Workflow" subtitle="S&OP monthly cycle — key activities & owners" />

      <Card>
        <CardTitle>The 6-step cycle (D-4 → D+2)</CardTitle>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {WORKFLOW.map((s, i) => (
            <button
              key={s.num}
              onClick={() => setActive(i)}
              className={`min-w-[150px] flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                active === i
                  ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]"
                  : "border-[var(--color-line)] bg-[var(--color-surface-2)] hover:border-[var(--color-brand-300)]"
              }`}
            >
              <div className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-brand-600)]">
                {s.num}
              </div>
              <div className="text-[12px] font-semibold">{s.title}</div>
              <div className="text-[10px] text-[var(--color-ink-2)]">{s.sub}</div>
              <div className="mt-1 text-[9px] font-medium text-[var(--color-brand-600)]">
                {s.owner}
              </div>
            </button>
          ))}
        </div>
        <div className="rounded-md border-l-2 border-[var(--color-brand-500)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--color-ink-2)]">
          {DETAILS[active]}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardTitle>Meeting sequence (days relative to S&OP)</CardTitle>
          <table className="w-full text-[12px]">
            <thead className="text-left text-[11px] text-[var(--color-ink-2)]">
              <tr>
                <th className="py-1.5 font-medium">Day</th>
                <th className="py-1.5 font-medium">Meeting</th>
                <th className="py-1.5 font-medium">Key output</th>
                <th className="py-1.5 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody>
              {MEETINGS.map((r) => (
                <tr key={r[0]} className="border-t border-[var(--color-line)]">
                  <td className="py-1.5 font-medium">{r[0]}</td>
                  <td className="py-1.5">{r[1]}</td>
                  <td className="py-1.5 text-[var(--color-ink-2)]">{r[2]}</td>
                  <td className="py-1.5 text-[var(--color-ink-2)]">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardTitle>Bow-tie — role clarity</CardTitle>
          <div className="space-y-2.5 text-[12.5px]">
            {[
              ["info", "Demand Mgr", "Interfaces with Sales, Marketing & all channels"],
              ["good", "Supply Plg Mgr", "Interfaces with site planners (sending/receiving)"],
              ["accent", "Site Planners", "Execute MPS, manage RM / WIP / FG at site level"],
              ["warn", "IBP Lead", "Monthly integration across demand / supply / finance"],
            ].map(([tone, role, desc]) => (
              <div
                key={role}
                className="flex items-center gap-2.5 border-b border-[var(--color-line)] pb-2 last:border-0"
              >
                <Tag tone={tone as "info" | "good" | "accent" | "warn"}>{role}</Tag>
                <span className="text-[var(--color-ink-2)]">{desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <PlaceholderNote phase="Phase 1">
        The cycle steps will become interactive: attach owners, due dates and
        gap-close actions per project, tracked across months.
      </PlaceholderNote>
    </div>
  );
}
