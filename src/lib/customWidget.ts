// ============================================================
// Custom widgets — the AI-assisted *spec* model (locked decision): a
// custom widget is structured config, not bespoke code, so it renders
// deterministically and travels inside a Blueprint. The AI (or the
// offline parser below) turns "revenue by region per month" into a spec;
// a generic renderer draws it from the project's own data.
// ============================================================

import { projectRows, toNum } from "./projectData";
import { getTemplate } from "./templates";
import type { Project } from "./projects";

export type Agg = "sum" | "avg" | "count";
export type ChartKind = "bar" | "line" | "pie" | "kpi";

export type CustomSpec = {
  title: string;
  source: string; // template id: sales | plan | items | inventory_simple (or S&OP-set ids)
  dimension: string; // a column on the source, or "month" / "category"
  measure: string; // a numeric column, or "count"
  agg: Agg;
  chart: ChartKind;
  page?: "overview" | "demand" | "supply" | "capacity";
};

// What measures/dimensions exist on the canonical-floor sources (used to
// ground the parser and validate a spec).
const SOURCE_FIELDS: Record<string, { date?: string; measures: string[]; dims: string[] }> = {
  sales: { date: "month", measures: ["revenue", "units"], dims: ["month", "category", "channel", "region", "item_id"] },
  plan: { date: "month", measures: ["planned_units"], dims: ["month", "category", "item_id"] },
  inventory_simple: { date: "month", measures: ["on_hand_value", "on_hand_units"], dims: ["month", "category", "item_id"] },
  items: { measures: ["unit_cost", "unit_price"], dims: ["category", "item_id"] },
  // S&OP-set fallbacks
  sales_history: { date: "date", measures: ["revenue", "qty"], dims: ["date", "customer", "plant", "sku"] },
  demand_forecast: { date: "date", measures: ["baseline_qty"], dims: ["date", "customer", "plant", "sku"] },
};

const MEASURE_LABEL: Record<string, string> = {
  revenue: "Revenue", units: "Units", planned_units: "Planned units",
  on_hand_value: "Inventory value", on_hand_units: "Inventory units",
  qty: "Quantity", baseline_qty: "Forecast units", count: "Count",
};
const DIM_LABEL: Record<string, string> = {
  month: "month", date: "month", category: "category", channel: "channel",
  region: "region", item_id: "item", customer: "customer", plant: "plant", sku: "SKU",
};

/**
 * Deterministic natural-language → spec parser (the offline AI path).
 * Grounds choices in which sources the project actually has.
 */
export function parseSpec(text: string, project: Project): CustomSpec {
  const t = text.toLowerCase();
  const has = (id: string) => projectRows(project, id).length > 0;

  // measure + source
  let measure = "revenue", source = "sales";
  if (/(plan|forecast)/.test(t) && has("plan")) { measure = "planned_units"; source = "plan"; }
  else if (/(stock|inventory|on.?hand)/.test(t) && has("inventory_simple")) { measure = "on_hand_value"; source = "inventory_simple"; }
  else if (/(unit|volume|quantity|qty)/.test(t)) { measure = "units"; source = "sales"; }
  else { measure = "revenue"; source = "sales"; }
  // if the inferred source isn't present, fall back to whatever sales-like file exists
  if (!has(source)) {
    if (has("sales")) { source = "sales"; measure = /unit|volume|qty/.test(t) ? "units" : "revenue"; }
    else if (has("sales_history")) { source = "sales_history"; measure = /unit|volume|qty/.test(t) ? "qty" : "revenue"; }
  }

  // dimension
  const fields = SOURCE_FIELDS[source] ?? { measures: [measure], dims: ["month"] };
  let dimension = "";
  if (/(by|per|across)\s+region/.test(t) && fields.dims.includes("region")) dimension = "region";
  else if (/(by|per|across)\s+channel/.test(t) && fields.dims.includes("channel")) dimension = "channel";
  else if (/(by|per)\s+(category|family|type|segment)/.test(t) && fields.dims.includes("category")) dimension = "category";
  else if (/(by|per)\s+(item|sku|product)/.test(t)) dimension = fields.dims.includes("item_id") ? "item_id" : "sku";
  else if (/(per month|by month|monthly|over time|trend|timeline)/.test(t)) dimension = fields.date ?? "month";
  if (!dimension) dimension = fields.dims.includes("category") ? "category" : (fields.date ?? fields.dims[0]);

  // chart
  let chart: ChartKind = "bar";
  if (/(trend|over time|per month|by month|monthly|timeline|line)/.test(t)) chart = "line";
  else if (/(share|mix|split|proportion|percentage|pie|breakdown)/.test(t)) chart = "pie";
  else if (/(total|overall|single|kpi|just the number|headline)/.test(t)) chart = "kpi";
  if (dimension === (fields.date ?? "month") && chart === "bar") chart = "line";

  // agg
  let agg: Agg = "sum";
  if (/(average|avg|mean)/.test(t)) agg = "avg";
  else if (/(count|number of|how many)/.test(t)) { agg = "count"; measure = "count"; }

  const title = `${MEASURE_LABEL[measure] ?? measure} by ${DIM_LABEL[dimension] ?? dimension}`;
  return { title, source, dimension, measure, agg, chart };
}

/** Aggregate a project's data per a spec → series of { name, value }. */
export function aggregateSpec(project: Project, spec: CustomSpec): { name: string; value: number }[] {
  const rows = projectRows(project, spec.source);
  if (rows.length === 0) return [];

  // category needs a join via the item master
  let catOf: ((id: string) => string) | null = null;
  if (spec.dimension === "category") {
    const items = projectRows(project, "items");
    const map = new Map(items.map((r) => [r.item_id, r.category]));
    catOf = (id) => map.get(id) ?? "—";
  }
  const isDate = spec.dimension === "month" || spec.dimension === "date";

  const groups = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    let key: string;
    if (catOf) key = catOf(r.item_id);
    else if (isDate) key = (r[spec.dimension] ?? r.month ?? r.date ?? "").slice(0, 7);
    else key = r[spec.dimension] || "—";
    if (!key) continue;
    const v = spec.measure === "count" ? 1 : toNum(r[spec.measure]);
    const g = groups.get(key) ?? { sum: 0, n: 0 };
    g.sum += v; g.n += 1;
    groups.set(key, g);
  }

  let out = [...groups.entries()].map(([name, g]) => ({
    name,
    value: spec.agg === "avg" ? (g.n ? g.sum / g.n : 0) : spec.agg === "count" ? g.n : g.sum,
  }));
  out = isDate ? out.sort((a, b) => a.name.localeCompare(b.name)) : out.sort((a, b) => b.value - a.value);
  return out;
}

// Floor ↔ S&OP-set equivalents, so duplication picks the project's real source.
const SRC_ALIAS: Record<string, string> = { sales_history: "sales", demand_forecast: "plan", sku_master: "items", inventory: "inventory_simple" };

// The UNIFIED data sources a project has (by source TYPE, never individual
// files) — what the config modal offers for data selection.
const SPEC_SOURCES = ["sales", "plan", "inventory_simple", "items", "sales_history", "demand_forecast", "inventory", "capacity"];
export function unifiedSources(project: Project): { id: string; title: string }[] {
  return SPEC_SOURCES.filter((id) => projectRows(project, id).length > 0).map((id) => ({ id, title: getTemplate(id)?.title ?? id }));
}

// Dimension + measure options for a source (from its template fields).
export function sourceFields(sourceId: string): { dims: { value: string; label: string }[]; measures: { value: string; label: string }[] } {
  const t = getTemplate(sourceId);
  const dims: { value: string; label: string }[] = [];
  const measures: { value: string; label: string }[] = [{ value: "count", label: "Count of rows" }];
  if (t) for (const f of t.fields) {
    if (f.type === "number") measures.push({ value: f.name, label: f.name });
    else dims.push({ value: f.name, label: f.name });
  }
  if (!dims.some((d) => d.value === "category")) dims.push({ value: "category", label: "category (via item master)" });
  return { dims, measures };
}

// Seed a custom spec by duplicating a standard widget as a basis.
export function duplicateSpec(
  requires: { templateId: string }[],
  module: CustomSpec["page"],
  title: string,
  project: Project
): CustomSpec {
  let source = "sales";
  for (const r of requires) {
    for (const cand of [r.templateId, SRC_ALIAS[r.templateId]]) {
      if (cand && projectRows(project, cand).length) { source = cand; break; }
    }
    if (projectRows(project, source).length) break;
  }
  if (!projectRows(project, source).length) source = unifiedSources(project)[0]?.id ?? "sales";
  const { dims, measures } = sourceFields(source);
  const measure = measures.find((m) => m.value !== "count")?.value ?? "count";
  const dimension = dims.find((d) => d.value === "month")?.value ?? dims[0]?.value ?? "month";
  return { title: `${title} (custom)`, source, dimension, measure, agg: "sum", chart: dimension === "month" ? "line" : "bar", page: module };
}
