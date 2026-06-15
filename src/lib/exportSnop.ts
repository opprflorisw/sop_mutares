import { triggerDownload } from "./csv";
import { fmtMoney, type ProjectData } from "./projectData";
import type { Project } from "./projects";

// ============================================================
// Standardised S&OP one-pager export — the consistent output every
// portfolio company can share with Mutares directors. CSV so it opens
// in Excel; same shape for every project → portfolio comparability.
// ============================================================

export function exportSnopOnePager(project: Project, d: ProjectData) {
  const c = project.currency;
  const lines: string[] = [];
  const push = (...cells: (string | number)[]) =>
    lines.push(cells.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","));

  push("S&OP ONE-PAGER", project.name);
  push("Industry", project.industry);
  push("Currency", c);
  push("");

  push("KEY METRICS");
  push("Revenue projection (12m)", fmtMoney(d.kpis.revenueProjection, c));
  push("Forecast accuracy", `${d.kpis.forecastAccuracy}%`);
  push("Forecast bias", `${d.kpis.forecastBias}%`);
  push("Inventory days", d.kpis.inventoryDays);
  push("Capacity utilisation", `${d.kpis.capacityUtil}%`);
  push("Overloaded lines", d.kpis.overloadedLines);
  push("Revenue at risk", fmtMoney(d.kpis.revenueAtRisk, c));
  push("");

  push("DEMAND vs SUPPLY GAP — BY FAMILY");
  push("Family", "Demand (units)", "Supply (units)", "Gap (units)", "Gap %", "Revenue at risk");
  for (const f of d.families)
    push(f.family, Math.round(f.unconstrained), Math.round(f.constrained), Math.round(f.gapUnits), `${f.gapPct.toFixed(0)}%`, fmtMoney(f.revenueAtRisk, c));
  push("");

  push("INVENTORY — BY PLANT");
  push("Plant", "Total", "RM", "WIP", "FG", "Days");
  for (const p of d.plants)
    push(p.name, fmtMoney(p.invTotal, c), fmtMoney(p.rm, c), fmtMoney(p.wip, c), fmtMoney(p.fg, c), p.invDays.toFixed(1));
  push("");

  push("CAPACITY — BY LINE");
  push("Plant", "Line", "Utilisation", "Status");
  for (const l of d.capacityLines)
    push(l.plant, l.line, `${l.util.toFixed(0)}%`, l.overload ? "OVERLOAD" : "ok");
  push("");

  push("OPEN ISSUES");
  push("Severity", "Issue", "Detail");
  for (const i of d.issues) push(i.severity, i.title, i.detail);

  triggerDownload(`${project.name.replace(/[^\w]+/g, "_")}_SOP_one-pager.csv`, lines.join("\n") + "\n");
}
