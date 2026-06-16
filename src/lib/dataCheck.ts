import { templatesForProject, type Requirement } from "./templates";
import { parseCsv } from "./csv";
import { activeVersion, findFile, type Project } from "./projects";

// ============================================================
// Deterministic data-quality engine. Runs across all of a
// project's active files and reports: completeness (by requirement
// level), time-coverage pockets, and cross-file referential
// integrity. The output is also summarised into a compact prompt
// the Gemini-backed AI check turns into plain-language guidance.
// ============================================================

export type Finding = {
  severity: "error" | "warning" | "info" | "ok";
  title: string;
  detail: string;
};

export type DataCheckResult = {
  completeness: Record<Requirement, { present: number; total: number; missing: string[] }>;
  findings: Finding[];
  score: number; // 0-100 readiness
  promptSummary: string;
};

function activeContent(project: Project, templateId: string): string | null {
  const file = findFile(project, templateId);
  if (!file) return null;
  return activeVersion(file)?.content ?? null;
}

function columnValues(content: string, col: string): string[] {
  const { rows } = parseCsv(content);
  return rows.map((r) => r[col]).filter(Boolean);
}

export function runDataCheck(project: Project): DataCheckResult {
  const findings: Finding[] = [];
  const pool = templatesForProject(project);

  // ---- completeness by requirement level ----
  const levels: Requirement[] = ["required", "recommended", "optional"];
  const completeness = {
    required: { present: 0, total: 0, missing: [] as string[] },
    recommended: { present: 0, total: 0, missing: [] as string[] },
    optional: { present: 0, total: 0, missing: [] as string[] },
  };
  for (const t of pool) {
    const present = !!activeContent(project, t.id);
    const bucket = completeness[t.requirement];
    bucket.total++;
    if (present) bucket.present++;
    else bucket.missing.push(t.title);
  }
  for (const lvl of levels) {
    const c = completeness[lvl];
    if (c.missing.length && lvl === "required")
      findings.push({
        severity: "error",
        title: `${c.missing.length} required file(s) missing`,
        detail: `Core modules can't run without: ${c.missing.join(", ")}.`,
      });
    else if (c.missing.length && lvl === "recommended")
      findings.push({
        severity: "warning",
        title: `${c.missing.length} recommended file(s) missing`,
        detail: `Adds depth when provided: ${c.missing.join(", ")}.`,
      });
  }

  // ---- per-file validation + time gaps ----
  for (const t of pool) {
    const file = findFile(project, t.id);
    if (!file) continue;
    const v = activeVersion(file);
    if (!v) continue;
    if (v.status === "error")
      findings.push({ severity: "error", title: `${t.title}: invalid`, detail: v.issues.join(" ") });
    if (v.coverage && v.coverage.missing.length)
      findings.push({
        severity: "warning",
        title: `${t.title}: time pocket`,
        detail: `Missing ${v.coverage.missing.length} period(s) between ${v.coverage.start} and ${v.coverage.end}: ${v.coverage.missing.join(", ")}.`,
      });
  }

  // ---- cross-file referential integrity ----
  const skuMaster = activeContent(project, "sku_master");
  if (skuMaster) {
    const knownSkus = new Set(columnValues(skuMaster, "sku"));
    for (const tid of ["sales_history", "demand_forecast", "inventory", "bom"]) {
      const content = activeContent(project, tid);
      if (!content) continue;
      const col = tid === "bom" ? "parent_sku" : "sku";
      const refs = new Set(columnValues(content, col));
      const unknown = [...refs].filter((s) => !knownSkus.has(s));
      if (unknown.length)
        findings.push({
          severity: "warning",
          title: `${tid}: ${unknown.length} unknown SKU(s)`,
          detail: `Not in SKU Master: ${unknown.slice(0, 5).join(", ")}${unknown.length > 5 ? "…" : ""}.`,
        });
    }
  }
  const custMaster = activeContent(project, "customer_master");
  const sales = activeContent(project, "sales_history");
  if (custMaster && sales) {
    const known = new Set(columnValues(custMaster, "customer"));
    const unknown = [...new Set(columnValues(sales, "customer"))].filter((c) => !known.has(c));
    if (unknown.length)
      findings.push({
        severity: "warning",
        title: `Sales History: ${unknown.length} unknown customer(s)`,
        detail: `Not in Customer Master: ${unknown.join(", ")}.`,
      });
  }

  if (findings.length === 0)
    findings.push({ severity: "ok", title: "All checks passed", detail: "Files are complete and consistent." });

  // ---- readiness score ----
  const reqOk = completeness.required.present / Math.max(1, completeness.required.total);
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const score = Math.max(
    0,
    Math.round(reqOk * 70 + (1 - Math.min(1, warnings / 6)) * 30 - errors * 15)
  );

  // ---- compact prompt for the AI narrative ----
  const promptSummary = [
    `Project: ${project.name} (${project.industry}).`,
    `Required files ${completeness.required.present}/${completeness.required.total}, recommended ${completeness.recommended.present}/${completeness.recommended.total}, optional ${completeness.optional.present}/${completeness.optional.total}.`,
    `Readiness score: ${score}/100.`,
    "Findings:",
    ...findings.map((f) => `- [${f.severity}] ${f.title}: ${f.detail}`),
  ].join("\n");

  return { completeness, findings, score, promptSummary };
}
