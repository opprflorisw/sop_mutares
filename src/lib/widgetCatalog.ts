// ============================================================
// Widget catalog — the DECLARATIVE contract layer on top of the widget
// registry. The registry (components/widgets/registry.tsx) says how a
// widget renders; this says, for every widget (and every KPI stat), what
// DATA it needs, which INDUSTRY layer it belongs to, and what it shows in
// plain language. From that we can deterministically compute, for a given
// DataProfile + chosen industry, whether a widget is:
//
//   ready          — the data backs it, offer it
//   locked         — relevant, but needs data not yet uploaded (→ upsell)
//   not-relevant   — only meaningful for a different industry archetype
//
// This single readiness function powers the guided gallery (Phase B), the
// one-click generator (Phase C) and the Blueprint "can this company run
// it?" check (Phase E). Kept separate from registry.tsx so it composes
// without churn — entries reference widgets by id.
// ============================================================

import type { DataProfile } from "./dataProfile";
import { getTemplate } from "./templates";
import { INDUSTRIES, type IndustryKey, type Layer, type ModuleKey } from "./dashboardModel";

/**
 * Map a project's free-text `industry` to an archetype key. Direct key
 * match first, then keyword heuristics over the seeded scenarios.
 */
export function resolveIndustryKey(raw: string | undefined): IndustryKey | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  const direct = INDUSTRIES.find((i) => i.key === s);
  if (direct) return direct.key;
  if (/(auto|discrete|seal|vehicle|oem|tier)/.test(s)) return "discrete";
  if (/(chem|process|food|recipe|extru|mould|mold|bulk)/.test(s)) return "process";
  if (/(cpg|fmcg|consumer|beverage|household|retail)/.test(s)) return "cpg";
  if (/(pharma|health|medi|life.?science|biotech)/.test(s)) return "pharma";
  if (/(electro|high.?tech|semicon|device|hardware)/.test(s)) return "electronics";
  return undefined;
}

export type WidgetReq = {
  templateId: string;
  /** specific columns the widget needs (defaults to the template's required set). */
  fields?: string[];
  /** minimum data rows for the widget to be meaningful. */
  minRows?: number;
};

export type CatalogEntry = {
  /** gallery key — widget id, or "stat:<metric>" for a KPI tile. */
  key: string;
  widgetId: string;
  config?: Record<string, unknown>;
  title: string;
  /** plain-language "what this shows" for the gallery card + AI guide. */
  blurb: string;
  module: ModuleKey;
  layer: Layer;
  /** undefined = core / universal; otherwise only these archetypes. */
  industries?: IndustryKey[];
  requires: WidgetReq[];
  /** the generator seeds highlighted widgets first (the "most interesting"). */
  highlight?: boolean;
};

// ---- KPI stats (each preset is its own gallery entry) ----
const KPI: CatalogEntry[] = [
  { key: "stat:revenue", widgetId: "stat", config: { metric: "revenue" }, title: "Revenue projection", blurb: "12-month revenue outlook from the consensus plan.", module: "overview", layer: "core", highlight: true, requires: [{ templateId: "sales_history" }, { templateId: "demand_forecast" }] },
  { key: "stat:cm", widgetId: "stat", config: { metric: "cm" }, title: "Contribution margin", blurb: "Blended contribution margin on the demand plan.", module: "overview", layer: "core", highlight: true, requires: [{ templateId: "sku_master", fields: ["std_cost", "price"] }, { templateId: "demand_forecast" }] },
  { key: "stat:accuracy", widgetId: "stat", config: { metric: "accuracy" }, title: "Forecast accuracy", blurb: "How close the forecast tracked actuals (vs an 85% target).", module: "demand", layer: "core", highlight: true, requires: [{ templateId: "sales_history" }, { templateId: "demand_forecast" }] },
  { key: "stat:bias", widgetId: "stat", config: { metric: "bias" }, title: "Forecast bias", blurb: "Systematic over- or under-forecasting.", module: "demand", layer: "core", requires: [{ templateId: "sales_history" }, { templateId: "demand_forecast" }] },
  { key: "stat:invDays", widgetId: "stat", config: { metric: "invDays" }, title: "Inventory days", blurb: "Days of inventory on hand vs the target.", module: "supply", layer: "core", highlight: true, requires: [{ templateId: "inventory" }] },
  { key: "stat:invTurns", widgetId: "stat", config: { metric: "invTurns" }, title: "Inventory turns", blurb: "How many times inventory turns over per year.", module: "supply", layer: "core", requires: [{ templateId: "inventory" }] },
  { key: "stat:capacity", widgetId: "stat", config: { metric: "capacity" }, title: "Capacity utilisation", blurb: "Load vs available demonstrated capacity (MAC).", module: "capacity", layer: "core", highlight: true, requires: [{ templateId: "capacity" }] },
  { key: "stat:plannedCapacity", widgetId: "stat", config: { metric: "plannedCapacity" }, title: "Utilisation vs planned", blurb: "Load vs the planned (haircut) capacity level.", module: "capacity", layer: "core", requires: [{ templateId: "capacity" }] },
  { key: "stat:revenueAtRisk", widgetId: "stat", config: { metric: "revenueAtRisk" }, title: "Revenue at risk", blurb: "Revenue on the unmet demand-supply gap.", module: "overview", layer: "core", highlight: true, requires: [{ templateId: "demand_forecast" }, { templateId: "capacity" }] },
  { key: "stat:slob", widgetId: "stat", config: { metric: "slob" }, title: "SLOB value", blurb: "Value of slow-moving / obsolete finished goods.", module: "supply", layer: "core", requires: [{ templateId: "inventory" }, { templateId: "sales_history" }] },
  { key: "stat:overloaded", widgetId: "stat", config: { metric: "overloaded" }, title: "Overloaded lines", blurb: "Count of lines running over capacity — need a decision.", module: "capacity", layer: "core", requires: [{ templateId: "capacity" }] },
];

// ---- charts, tables & panels (mirror components/widgets/registry.tsx ids) ----
const PANELS: CatalogEntry[] = [
  { key: "revenue-trend", widgetId: "revenue-trend", title: "Demand & revenue outlook", blurb: "Actuals plus consensus forecast across the horizon, with margin.", module: "demand", layer: "core", highlight: true, requires: [{ templateId: "sales_history" }, { templateId: "demand_forecast" }] },
  { key: "gap-chart", widgetId: "gap-chart", title: "Demand vs supply gap", blurb: "Unconstrained demand vs constrained supply by family — the headline S&OP artifact.", module: "overview", layer: "core", highlight: true, requires: [{ templateId: "demand_forecast" }, { templateId: "capacity" }] },
  { key: "gap-table", widgetId: "gap-table", title: "Gap by product family", blurb: "Per-family demand, supply, gap and revenue at risk.", module: "supply", layer: "core", highlight: true, requires: [{ templateId: "demand_forecast" }, { templateId: "capacity" }] },
  { key: "plan-bridge", widgetId: "plan-bridge", title: "Plan bridge — baseline → committed", blurb: "Statistical baseline → committed supply → revenue at risk.", module: "demand", layer: "core", requires: [{ templateId: "demand_forecast" }, { templateId: "capacity" }] },
  { key: "accuracy-table", widgetId: "accuracy-table", title: "Forecast accuracy & bias (SKU)", blurb: "MAPE and bias by SKU, with the worst offenders to act on.", module: "demand", layer: "core", highlight: true, requires: [{ templateId: "sales_history" }, { templateId: "demand_forecast", minRows: 2 }] },
  { key: "customer-mix", widgetId: "customer-mix", title: "Demand mix", blurb: "Share of demand by customer / channel / segment.", module: "demand", layer: "core", requires: [{ templateId: "sales_history" }] },
  { key: "forecast-lag", widgetId: "forecast-lag", title: "Forecast bias by lag", blurb: "Actual vs the plan as it stood 1 and 2 months out.", module: "demand", layer: "core", requires: [{ templateId: "sales_history" }, { templateId: "demand_forecast" }] },
  { key: "capacity-lines", widgetId: "capacity-lines", title: "Line utilisation (RCCP)", blurb: "Required load vs available / planned capacity per line.", module: "capacity", layer: "core", highlight: true, requires: [{ templateId: "capacity" }] },
  { key: "capacity-heatmap", widgetId: "capacity-heatmap", title: "Production schedule heatmap", blurb: "Load % by line over the coming periods.", module: "capacity", layer: "core", requires: [{ templateId: "capacity" }] },
  { key: "inventory-plants", widgetId: "inventory-plants", title: "Inventory by site (RM/WIP/FG)", blurb: "Stock split and days of supply.", module: "supply", layer: "core", highlight: true, requires: [{ templateId: "inventory" }] },
  { key: "inventory-projection", widgetId: "inventory-projection", title: "Inventory projection", blurb: "Planned glide of inventory days toward target.", module: "supply", layer: "core", requires: [{ templateId: "inventory" }] },
  { key: "slob", widgetId: "slob", title: "Slow-moving & obsolete (SLOB)", blurb: "FG sitting beyond cover or with no sales — cash at risk.", module: "supply", layer: "core", requires: [{ templateId: "inventory" }, { templateId: "sales_history" }] },
  { key: "mrp-risk", widgetId: "mrp-risk", title: "MRP — material & supplier risk", blurb: "Components flagged by supplier reliability and lead time.", module: "supply", layer: "core", requires: [{ templateId: "bom" }, { templateId: "supplier" }] },
  // Governance panels have no hard data dependency (Convex-backed) — always available.
  { key: "issues", widgetId: "issues", title: "Key attention points", blurb: "Ranked exceptions with value at risk.", module: "overview", layer: "core", requires: [] },
  { key: "exceptions", widgetId: "exceptions", title: "Exceptions — what needs a decision", blurb: "Auto-ranked gaps, overloads, accuracy breaches, supplier risk, SLOB.", module: "overview", layer: "core", highlight: true, requires: [] },
  { key: "vulops", widgetId: "vulops", title: "Vulnerabilities & opportunities", blurb: "Tracked risks and upside, with owners.", module: "overview", layer: "core", requires: [] },
  { key: "decisions", widgetId: "decisions", title: "Decisions & actions", blurb: "Committed decisions with owner, status and due date.", module: "overview", layer: "core", requires: [] },

  // --- depth widgets (G1–G7) ---
  { key: "abc-pareto", widgetId: "abc-pareto", title: "ABC / Pareto analysis", blurb: "Classify SKUs by value (A/B/C) with the Pareto curve.", module: "demand", layer: "core", highlight: true, requires: [{ templateId: "sales_history" }] },
  { key: "abc-accuracy", widgetId: "abc-accuracy", title: "Accuracy targets by ABC class", blurb: "Class-segmented forecast-accuracy targets (A tight, C loose).", module: "demand", layer: "core", requires: [{ templateId: "sales_history" }, { templateId: "demand_forecast" }] },
  { key: "demand-control", widgetId: "demand-control", title: "Weekly demand control", blurb: "Short-term weekly actual vs plan between monthly cycles.", module: "demand", layer: "core", requires: [{ templateId: "sales_history" }, { templateId: "demand_forecast" }] },
  { key: "portfolio", widgetId: "portfolio", title: "Portfolio — NPI / EOL", blurb: "New-product ramps and end-of-life run-downs.", module: "demand", layer: "industry", requires: [{ templateId: "portfolio" }] },
  { key: "capacity-sites", widgetId: "capacity-sites", title: "Capacity by site (network)", blurb: "Per-site planned-vs-available roll-up with spare capacity.", module: "capacity", layer: "core", highlight: true, requires: [{ templateId: "capacity" }] },
  { key: "reallocation", widgetId: "reallocation", title: "Cross-site reallocation", blurb: "Move a constrained family's gap to a qualified spare site, costed.", module: "supply", layer: "core", requires: [{ templateId: "capacity" }] },
  { key: "plan-budget", widgetId: "plan-budget", title: "Plan vs budget (reconciliation)", blurb: "Operational plan vs the AOP/budget, by family.", module: "overview", layer: "core", requires: [{ templateId: "budget" }] },
  { key: "scenario", widgetId: "scenario", title: "Scenario engine (what-if)", blurb: "Adjust demand/supply/capacity levers → revenue, margin, service.", module: "overview", layer: "core", highlight: true, requires: [{ templateId: "demand_forecast" }] },
  { key: "cadence", widgetId: "cadence", title: "S&OP cadence & governance", blurb: "The monthly cycle as an owned, status-tracked checklist.", module: "overview", layer: "core", requires: [] },
];

export const WIDGET_CATALOG: CatalogEntry[] = [...KPI, ...PANELS];

const CATALOG_BY_KEY = new Map(WIDGET_CATALOG.map((e) => [e.key, e]));
export function getCatalogEntry(key: string): CatalogEntry | undefined {
  return CATALOG_BY_KEY.get(key);
}

/** Human-readable data sources a widget draws from (for the config UI). */
export function widgetDataSources(entry: CatalogEntry): string[] {
  if (!entry.requires.length) return ["Governance (no data file)"];
  return [...new Set(entry.requires.map((r) => getTemplate(r.templateId)?.title ?? r.templateId))];
}

// Canonical-floor equivalents: a widget that asks for an S&OP-set template
// is also satisfied by its floor counterpart (the universal data contract).
const ROLE_ALIASES: Record<string, string[]> = {
  sku_master: ["items"],
  sales_history: ["sales"],
  demand_forecast: ["plan"],
  inventory: ["inventory_simple"],
};

// ---- readiness ----
export type MissingReq = { templateId: string; reason: "not-uploaded" | "missing-fields" | "too-few-rows"; detail: string };
export type Readiness =
  | { state: "ready" }
  | { state: "locked"; missing: MissingReq[] }
  | { state: "not-relevant"; industry: IndustryKey };

/**
 * Deterministically decide whether a catalog entry is offerable for a
 * given data profile + chosen industry. Industry is checked first (a
 * widget for another archetype is simply not relevant), then each data
 * requirement against the profile.
 */
export function readinessFor(
  entry: CatalogEntry,
  profile: DataProfile,
  industry?: IndustryKey
): Readiness {
  if (entry.industries && industry && !entry.industries.includes(industry)) {
    return { state: "not-relevant", industry };
  }

  const missing: MissingReq[] = [];
  for (const req of entry.requires) {
    // Accept the required template OR a canonical-floor equivalent.
    const candidates = [req.templateId, ...(ROLE_ALIASES[req.templateId] ?? [])];
    const tp = candidates.map((id) => profile.byId.get(id)).find((p) => p && p.uploaded);
    if (!tp) {
      missing.push({ templateId: req.templateId, reason: "not-uploaded", detail: `Upload ${req.templateId}.csv` });
      continue;
    }
    // Satisfied by an alias (different schema) — don't enforce exact field names.
    if (tp.templateId !== req.templateId) {
      if (req.minRows && tp.rows < req.minRows) missing.push({ templateId: req.templateId, reason: "too-few-rows", detail: `Needs ≥ ${req.minRows} rows (has ${tp.rows})` });
      continue;
    }
    const needFields = req.fields ?? tp.fields.filter((f) => f.required).map((f) => f.name);
    const absent = needFields.filter((name) => !tp.fields.find((f) => f.name === name && f.present));
    if (absent.length) {
      missing.push({ templateId: req.templateId, reason: "missing-fields", detail: `Needs column(s): ${absent.join(", ")}` });
      continue;
    }
    if (req.minRows && tp.rows < req.minRows) {
      missing.push({ templateId: req.templateId, reason: "too-few-rows", detail: `Needs ≥ ${req.minRows} rows (has ${tp.rows})` });
    }
  }

  return missing.length ? { state: "locked", missing } : { state: "ready" };
}

/**
 * Deterministic, data-grounded recommendation text — correct even with no
 * AI endpoint (the offline default for the guide). Gemini can enhance it.
 */
export function dataGuide(profile: DataProfile, industry?: IndustryKey): string {
  const { ready, locked } = tierCatalog(profile, industry);
  const up = profile.templates.filter((t) => t.uploaded);
  const recommended = ready.filter((e) => e.highlight).map((e) => e.title);
  const unlock = [...new Set(locked.flatMap((l) => l.missing.map((m) => m.templateId)))];
  const lines: string[] = [];
  lines.push(`You've uploaded ${up.length} of ${profile.templates.length} datasets (${up.map((t) => t.title).join(", ") || "none yet"}).`);
  if (ready.length) {
    lines.push(`${ready.length} widgets are ready from your data${recommended.length ? ` — a good starting set: ${recommended.slice(0, 5).join(", ")}.` : "."}`);
  } else {
    lines.push("No widgets are data-ready yet — upload your core files (items, sales, plan) to begin.");
  }
  if (unlock.length) lines.push(`Upload ${unlock.slice(0, 4).join(", ")} to unlock ${locked.length} more widget(s).`);
  return lines.join("\n");
}

/** Convenience: all entries split into the three gallery tiers. */
export function tierCatalog(profile: DataProfile, industry?: IndustryKey) {
  const ready: CatalogEntry[] = [];
  const locked: { entry: CatalogEntry; missing: MissingReq[] }[] = [];
  const notRelevant: CatalogEntry[] = [];
  for (const entry of WIDGET_CATALOG) {
    const r = readinessFor(entry, profile, industry);
    if (r.state === "ready") ready.push(entry);
    else if (r.state === "locked") locked.push({ entry, missing: r.missing });
    else notRelevant.push(entry);
  }
  return { ready, locked, notRelevant };
}
