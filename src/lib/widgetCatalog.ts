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
  { key: "stat:invDays", widgetId: "stat", config: { metric: "invDays" }, title: "Inventory days", blurb: "Days of inventory on hand vs the target.", module: "supply", layer: "core", highlight: true, requires: [{ templateId: "inventory" }, { templateId: "plant_master", fields: ["target_inv_days"] }] },
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
  { key: "customer-mix", widgetId: "customer-mix", title: "Customer demand mix", blurb: "Share of demand by customer / segment.", module: "demand", layer: "core", requires: [{ templateId: "sales_history" }, { templateId: "customer_master" }] },
  { key: "forecast-lag", widgetId: "forecast-lag", title: "Forecast bias by lag", blurb: "Actual vs the plan as it stood 1 and 2 months out.", module: "demand", layer: "core", requires: [{ templateId: "sales_history" }, { templateId: "demand_forecast" }] },
  { key: "capacity-lines", widgetId: "capacity-lines", title: "Line utilisation (RCCP)", blurb: "Required load vs available / planned capacity per line.", module: "capacity", layer: "core", highlight: true, requires: [{ templateId: "capacity" }] },
  { key: "capacity-heatmap", widgetId: "capacity-heatmap", title: "Production schedule heatmap", blurb: "Load % by line over the coming periods.", module: "capacity", layer: "core", requires: [{ templateId: "capacity" }] },
  { key: "inventory-plants", widgetId: "inventory-plants", title: "Inventory by plant (RM/WIP/FG)", blurb: "Stock split and days of supply per site.", module: "supply", layer: "core", highlight: true, requires: [{ templateId: "inventory" }, { templateId: "plant_master" }] },
  { key: "inventory-projection", widgetId: "inventory-projection", title: "Inventory projection", blurb: "Planned glide of inventory days toward target.", module: "supply", layer: "core", requires: [{ templateId: "inventory" }, { templateId: "plant_master", fields: ["target_inv_days"] }] },
  { key: "slob", widgetId: "slob", title: "Slow-moving & obsolete (SLOB)", blurb: "FG sitting beyond cover or with no sales — cash at risk.", module: "supply", layer: "core", requires: [{ templateId: "inventory" }, { templateId: "sales_history" }] },
  { key: "mrp-risk", widgetId: "mrp-risk", title: "MRP — material & supplier risk", blurb: "Components flagged by supplier reliability and lead time.", module: "supply", layer: "core", requires: [{ templateId: "bom" }, { templateId: "supplier" }] },
  // Governance panels have no hard data dependency (Convex-backed) — always available.
  { key: "issues", widgetId: "issues", title: "Key attention points", blurb: "Ranked exceptions with value at risk.", module: "overview", layer: "core", requires: [] },
  { key: "exceptions", widgetId: "exceptions", title: "Exceptions — what needs a decision", blurb: "Auto-ranked gaps, overloads, accuracy breaches, supplier risk, SLOB.", module: "overview", layer: "core", highlight: true, requires: [] },
  { key: "vulops", widgetId: "vulops", title: "Vulnerabilities & opportunities", blurb: "Tracked risks and upside, with owners.", module: "overview", layer: "core", requires: [] },
  { key: "decisions", widgetId: "decisions", title: "Decisions & actions", blurb: "Committed decisions with owner, status and due date.", module: "overview", layer: "core", requires: [] },
];

export const WIDGET_CATALOG: CatalogEntry[] = [...KPI, ...PANELS];

const CATALOG_BY_KEY = new Map(WIDGET_CATALOG.map((e) => [e.key, e]));
export function getCatalogEntry(key: string): CatalogEntry | undefined {
  return CATALOG_BY_KEY.get(key);
}

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
    const tp = profile.byId.get(req.templateId);
    if (!tp || !tp.uploaded) {
      missing.push({ templateId: req.templateId, reason: "not-uploaded", detail: `Upload ${req.templateId}.csv` });
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
