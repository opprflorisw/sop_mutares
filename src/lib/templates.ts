// ============================================================
// Canonical data templates — the "enforced format" contract.
// Each template = fixed header + example row + field dictionary +
// a requirement level (required / recommended / optional) and,
// for time-series files, the date field used to detect gaps.
// ============================================================

export type Requirement = "required" | "recommended" | "optional";

export type TemplateField = {
  name: string;
  type: "string" | "number" | "date" | "enum";
  required: boolean;
  description: string;
  enumValues?: string[];
};

export type DataTemplate = {
  id: string;
  file: string;
  title: string;
  module: "Master" | "Demand" | "Supply" | "Inventory";
  requirement: Requirement;
  timeSeries: boolean;
  dateField?: string;
  description: string;
  fields: TemplateField[];
  example: Record<string, string | number>;
};

export const REQUIREMENT_META: Record<
  Requirement,
  { label: string; tone: "info" | "accent" | "neutral"; bar: string; blurb: string }
> = {
  // Monochrome-blue hierarchy with a purple accent for "recommended" —
  // coherent with the brand palette (the old amber clashed).
  required: { label: "Required", tone: "info", bar: "#185FA5", blurb: "Core modules need this file." },
  recommended: { label: "Recommended", tone: "accent", bar: "#7F77DD", blurb: "Unlocks more analysis." },
  optional: { label: "Optional", tone: "neutral", bar: "#8A929E", blurb: "Nice to have." },
};

export const TEMPLATES: DataTemplate[] = [
  {
    id: "sku_master",
    file: "sku_master.csv",
    title: "SKU Master",
    module: "Master",
    requirement: "required",
    timeSeries: false,
    description: "The product catalogue every other file references.",
    fields: [
      { name: "sku", type: "string", required: true, description: "Unique SKU / part number" },
      { name: "description", type: "string", required: true, description: "Human-readable description" },
      { name: "family", type: "string", required: true, description: "Product family / group (S&OP plans here)" },
      { name: "uom", type: "string", required: true, description: "Unit of measure (e.g. pcs, Tn)" },
      { name: "plant", type: "string", required: true, description: "Primary plant code" },
      { name: "std_cost", type: "number", required: true, description: "Standard unit cost" },
      { name: "price", type: "number", required: true, description: "List / selling price per unit" },
    ],
    example: { sku: "AL-1024", description: "Welt Bodyside FrRH", family: "Welt seals", uom: "pcs", plant: "BWL", std_cost: 38.5, price: 52.0 },
  },
  {
    id: "customer_master",
    file: "customer_master.csv",
    title: "Customer Master",
    module: "Master",
    requirement: "recommended",
    timeSeries: false,
    description: "Customers used for demand mix and OTIF.",
    fields: [
      { name: "customer", type: "string", required: true, description: "Customer code / name" },
      { name: "region", type: "string", required: true, description: "Region / geography" },
      { name: "channel", type: "enum", required: true, description: "Sales channel", enumValues: ["OEM", "Aftermarket", "B2B", "B2C"] },
      { name: "segment", type: "string", required: false, description: "Optional segment" },
    ],
    example: { customer: "TML", region: "North", channel: "OEM", segment: "Passenger" },
  },
  {
    id: "plant_master",
    file: "plant_master.csv",
    title: "Plant Master",
    module: "Master",
    requirement: "recommended",
    timeSeries: false,
    description: "Plants/sites with capacity and inventory targets.",
    fields: [
      { name: "plant", type: "string", required: true, description: "Plant code" },
      { name: "name", type: "string", required: true, description: "Plant name" },
      { name: "location", type: "string", required: true, description: "City / country" },
      { name: "capacity_minutes", type: "number", required: true, description: "Available capacity per period (minutes)" },
      { name: "target_inv_days", type: "number", required: true, description: "Target inventory days" },
    ],
    example: { plant: "BWL", name: "Bawal", location: "Haryana, IN", capacity_minutes: 86400, target_inv_days: 40 },
  },
  {
    id: "sales_history",
    file: "sales_history.csv",
    title: "Sales History (Actuals)",
    module: "Demand",
    requirement: "required",
    timeSeries: true,
    dateField: "date",
    description: "Historical actual demand — drives forecast accuracy.",
    fields: [
      { name: "date", type: "date", required: true, description: "Period (YYYY-MM-DD, first of month)" },
      { name: "sku", type: "string", required: true, description: "SKU (must exist in SKU Master)" },
      { name: "customer", type: "string", required: true, description: "Customer code" },
      { name: "plant", type: "string", required: true, description: "Plant code" },
      { name: "qty", type: "number", required: true, description: "Actual quantity sold" },
      { name: "revenue", type: "number", required: true, description: "Actual revenue" },
    ],
    example: { date: "2022-12-01", sku: "AL-1024", customer: "TML", plant: "BWL", qty: 42000, revenue: 2184000 },
  },
  {
    id: "demand_forecast",
    file: "demand_forecast.csv",
    title: "Demand Forecast (Baseline)",
    module: "Demand",
    requirement: "required",
    timeSeries: true,
    dateField: "date",
    description: "Statistical / baseline forecast before consensus overrides.",
    fields: [
      { name: "date", type: "date", required: true, description: "Future period (YYYY-MM-DD)" },
      { name: "sku", type: "string", required: true, description: "SKU" },
      { name: "customer", type: "string", required: true, description: "Customer code" },
      { name: "plant", type: "string", required: true, description: "Plant code" },
      { name: "baseline_qty", type: "number", required: true, description: "Forecast quantity" },
    ],
    example: { date: "2023-01-01", sku: "AL-1024", customer: "TML", plant: "BWL", baseline_qty: 44000 },
  },
  {
    id: "bom",
    file: "bom.csv",
    title: "Bill of Materials",
    module: "Supply",
    requirement: "recommended",
    timeSeries: false,
    description: "Component structure for MPS, pegging and supplier risk.",
    fields: [
      { name: "parent_sku", type: "string", required: true, description: "Finished good SKU" },
      { name: "component", type: "string", required: true, description: "Component / material code" },
      { name: "qty_per", type: "number", required: true, description: "Quantity per parent unit" },
      { name: "supplier", type: "string", required: true, description: "Supplier code" },
      { name: "lead_time_days", type: "number", required: true, description: "Replenishment lead time" },
      { name: "unit_cost", type: "number", required: true, description: "Component unit cost" },
    ],
    example: { parent_sku: "AL-1024", component: "RUB-EPDM-12", qty_per: 1.2, supplier: "SUP-204", lead_time_days: 21, unit_cost: 9.4 },
  },
  {
    id: "inventory",
    file: "inventory.csv",
    title: "Inventory Snapshot",
    module: "Inventory",
    requirement: "required",
    timeSeries: true,
    dateField: "date",
    description: "RM / WIP / FG stock by plant — control-tower fuel.",
    fields: [
      { name: "date", type: "date", required: true, description: "Snapshot period (YYYY-MM-DD)" },
      { name: "plant", type: "string", required: true, description: "Plant code" },
      { name: "sku", type: "string", required: true, description: "SKU or component" },
      { name: "category", type: "enum", required: true, description: "Inventory stage", enumValues: ["RM", "WIP", "FG"] },
      { name: "qty", type: "number", required: true, description: "Quantity on hand" },
      { name: "value", type: "number", required: true, description: "Inventory value" },
    ],
    example: { date: "2022-12-01", plant: "BWL", sku: "AL-1024", category: "FG", qty: 12000, value: 624000 },
  },
  {
    id: "capacity",
    file: "capacity.csv",
    title: "Capacity (RCCP)",
    module: "Supply",
    requirement: "required",
    timeSeries: true,
    dateField: "date",
    description: "Available vs required minutes per resource for RCCP.",
    fields: [
      { name: "date", type: "date", required: true, description: "Period (YYYY-MM-DD)" },
      { name: "plant", type: "string", required: true, description: "Plant code" },
      { name: "resource", type: "string", required: true, description: "Line / work centre" },
      { name: "available_min", type: "number", required: true, description: "Available minutes" },
      { name: "required_min", type: "number", required: true, description: "Required minutes for plan" },
    ],
    example: { date: "2022-12-01", plant: "BWL", resource: "Extrusion-1", available_min: 28800, required_min: 27100 },
  },
  {
    id: "supplier",
    file: "supplier.csv",
    title: "Supplier Master",
    module: "Supply",
    requirement: "optional",
    timeSeries: false,
    description: "Supplier lead-time & reliability for risk analysis.",
    fields: [
      { name: "supplier", type: "string", required: true, description: "Supplier code" },
      { name: "component", type: "string", required: true, description: "Component supplied" },
      { name: "lead_time_days", type: "number", required: true, description: "Quoted lead time" },
      { name: "reliability", type: "number", required: true, description: "On-time % (0-100)" },
      { name: "moq", type: "number", required: true, description: "Minimum order quantity" },
    ],
    example: { supplier: "SUP-204", component: "RUB-EPDM-12", lead_time_days: 21, reliability: 96, moq: 5000 },
  },
];

// ============================================================
// Canonical floor — the small, universal data contract every NEW
// customer adheres to (items / sales / plan, + optional inventory). It
// guarantees the Universal widgets can populate for any business. The
// older, richer SFC-style templates above are the "S&OP" set used by the
// seeded demo projects. A project shows whichever set its data belongs
// to (new/empty projects default to the floor).
// ============================================================
export const FLOOR_TEMPLATE_IDS = ["items", "sales", "plan", "inventory_simple"] as const;
const FLOOR = new Set<string>(FLOOR_TEMPLATE_IDS);

const FLOOR_TEMPLATES: DataTemplate[] = [
  {
    id: "items",
    file: "items.csv",
    title: "Item Master",
    module: "Master",
    requirement: "required",
    timeSeries: false,
    description: "The product/SKU catalogue — every other file references it.",
    fields: [
      { name: "item_id", type: "string", required: true, description: "Unique item / SKU code" },
      { name: "name", type: "string", required: true, description: "Item name / description" },
      { name: "category", type: "string", required: true, description: "Product category / family" },
      { name: "unit_cost", type: "number", required: true, description: "Cost per unit" },
      { name: "unit_price", type: "number", required: true, description: "Selling price per unit" },
    ],
    example: { item_id: "ESP-250", name: "Espresso Blend 250g", category: "Beans", unit_cost: 3.2, unit_price: 7.5 },
  },
  {
    id: "sales",
    file: "sales.csv",
    title: "Sales (Actuals)",
    module: "Demand",
    requirement: "required",
    timeSeries: true,
    dateField: "month",
    description: "Actual sales by month and item — units and revenue.",
    fields: [
      { name: "month", type: "date", required: true, description: "Period (YYYY-MM)" },
      { name: "item_id", type: "string", required: true, description: "Item (must exist in Item Master)" },
      { name: "units", type: "number", required: true, description: "Units sold" },
      { name: "revenue", type: "number", required: true, description: "Revenue" },
      { name: "channel", type: "string", required: false, description: "Sales channel (optional — enables channel widgets)" },
      { name: "region", type: "string", required: false, description: "Region (optional — enables region widgets)" },
    ],
    example: { month: "2025-07", item_id: "ESP-250", units: 957, revenue: 7178, channel: "Retail", region: "North" },
  },
  {
    id: "plan",
    file: "plan.csv",
    title: "Plan / Forecast",
    module: "Demand",
    requirement: "required",
    timeSeries: true,
    dateField: "month",
    description: "Planned / forecast units by month and item.",
    fields: [
      { name: "month", type: "date", required: true, description: "Period (YYYY-MM)" },
      { name: "item_id", type: "string", required: true, description: "Item" },
      { name: "planned_units", type: "number", required: true, description: "Planned / forecast units" },
    ],
    example: { month: "2025-07", item_id: "ESP-250", planned_units: 1113 },
  },
  {
    id: "inventory_simple",
    file: "inventory.csv",
    title: "Inventory",
    module: "Inventory",
    requirement: "recommended",
    timeSeries: true,
    dateField: "month",
    description: "On-hand stock by month and item — unlocks inventory widgets.",
    fields: [
      { name: "month", type: "date", required: true, description: "Period (YYYY-MM)" },
      { name: "item_id", type: "string", required: true, description: "Item" },
      { name: "on_hand_units", type: "number", required: true, description: "Units on hand" },
      { name: "on_hand_value", type: "number", required: true, description: "Value of stock on hand" },
    ],
    example: { month: "2025-07", item_id: "ESP-250", on_hand_units: 1080, on_hand_value: 3456 },
  },
];

TEMPLATES.push(...FLOOR_TEMPLATES);

// Advanced / depth inputs (network balancing, reconciliation, portfolio).
// Optional, and offered to ANY project so the depth features can be tried.
const ADVANCED = new Set<string>(["site_product", "budget", "portfolio"]);
const ADVANCED_TEMPLATES: DataTemplate[] = [
  {
    id: "site_product",
    file: "site_product.csv",
    title: "Site–Product Matrix",
    module: "Supply",
    requirement: "optional",
    timeSeries: false,
    description: "Which sites can produce which families — enables cross-site reallocation.",
    fields: [
      { name: "plant", type: "string", required: true, description: "Plant / site code" },
      { name: "family", type: "string", required: true, description: "Product family the site can make" },
      { name: "qualified", type: "string", required: true, description: "1/yes if the site is qualified" },
      { name: "transfer_cost", type: "number", required: false, description: "Transfer cost per unit to this site" },
      { name: "lead_time_days", type: "number", required: false, description: "Transfer lead time (days)" },
    ],
    example: { plant: "SND", family: "Profile extrusions", qualified: "1", transfer_cost: 0.6, lead_time_days: 14 },
  },
  {
    id: "budget",
    file: "budget.csv",
    title: "Budget / AOP",
    module: "Demand",
    requirement: "optional",
    timeSeries: true,
    dateField: "month",
    description: "Financial budget by family — for plan-to-budget reconciliation.",
    fields: [
      { name: "month", type: "date", required: true, description: "Period (YYYY-MM)" },
      { name: "family", type: "string", required: true, description: "Product family" },
      { name: "budget_revenue", type: "number", required: true, description: "Budgeted revenue" },
    ],
    example: { month: "2025-07", family: "Profile extrusions", budget_revenue: 240000 },
  },
  {
    id: "portfolio",
    file: "portfolio.csv",
    title: "Portfolio (NPI / EOL)",
    module: "Demand",
    requirement: "optional",
    timeSeries: false,
    description: "New-product introductions and end-of-life run-downs with ramp profiles.",
    fields: [
      { name: "item", type: "string", required: true, description: "SKU / item" },
      { name: "type", type: "enum", required: true, description: "NPI or EOL", enumValues: ["NPI", "EOL"] },
      { name: "start_month", type: "date", required: true, description: "Ramp / run-down start (YYYY-MM)" },
      { name: "ramp_months", type: "number", required: true, description: "Months to reach peak / zero" },
      { name: "peak_units", type: "number", required: true, description: "Peak monthly units" },
      { name: "cannibalizes", type: "string", required: false, description: "SKU this one takes demand from" },
    ],
    example: { item: "ESP-COLD", type: "NPI", start_month: "2026-03", ramp_months: 4, peak_units: 800, cannibalizes: "COLD-BREW" },
  },
];
TEMPLATES.push(...ADVANCED_TEMPLATES);

// Board scorecard — a flat metrics file for the Executive supply-chain
// scorecard (OTIF, freight, savings, etc.) that can't be derived from the
// operational data. Offered to any project that wants the exec view.
const SCORECARD_TEMPLATE: DataTemplate = {
  id: "scorecard",
  file: "scorecard.csv",
  title: "Supply-chain Scorecard",
  module: "Master",
  requirement: "optional",
  timeSeries: false,
  description: "Board KPIs grouped by category with targets — powers the Executive scorecard widget.",
  fields: [
    { name: "category", type: "string", required: true, description: "Panel the metric sits in (e.g. Customer Delivery)" },
    { name: "metric", type: "string", required: true, description: "Metric name" },
    { name: "value", type: "number", required: true, description: "Current value" },
    { name: "target", type: "number", required: true, description: "Target value" },
    { name: "unit", type: "string", required: true, description: "Unit (%, d, k€, # …)" },
    { name: "direction", type: "enum", required: true, description: "Which way is good", enumValues: ["higher", "lower"] },
    { name: "headline", type: "number", required: false, description: "1 to surface in the KPI strip" },
  ],
  example: { category: "Customer Delivery", metric: "OTIF — all customers", value: 98.2, target: 97, unit: "%", direction: "higher", headline: 1 },
};
TEMPLATES.push(SCORECARD_TEMPLATE);

export const floorTemplates = (): DataTemplate[] => TEMPLATES.filter((t) => FLOOR.has(t.id) || ADVANCED.has(t.id));
export const sopTemplates = (): DataTemplate[] => TEMPLATES.filter((t) => !FLOOR.has(t.id));

/**
 * Which template set a project should show. New/empty projects use the
 * small canonical floor; the seeded demos (which already hold S&OP-set
 * files) keep their richer set. Mixed → everything.
 */
export function templatesForProject(project: { files: { templateId: string }[] }): DataTemplate[] {
  const ids = new Set(project.files.map((f) => f.templateId));
  if (ids.size === 0) return floorTemplates();
  const hasFloor = [...ids].some((id) => FLOOR.has(id));
  const hasSop = [...ids].some((id) => !FLOOR.has(id));
  if (hasFloor && !hasSop) return floorTemplates();
  if (hasSop && !hasFloor) return sopTemplates();
  return TEMPLATES;
}

export function getTemplate(id: string): DataTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Build a downloadable blank CSV for a template (header + example row). */
export function templateToCsv(t: DataTemplate): string {
  const header = t.fields.map((f) => f.name).join(",");
  const exampleRow = t.fields
    .map((f) => {
      const v = t.example[f.name];
      return v === undefined ? "" : String(v);
    })
    .join(",");
  return `${header}\n${exampleRow}\n`;
}

/**
 * "Mix & match" — given a CSV's header row, find the template whose
 * required columns it best matches. Returns the best match + a 0-1 score.
 */
export function detectTemplate(
  headers: string[],
  pool: DataTemplate[] = TEMPLATES
): { template: DataTemplate; score: number } | null {
  const norm = headers.map((h) => h.trim().toLowerCase());
  let best: { template: DataTemplate; score: number } | null = null;
  for (const t of pool) {
    const cols = t.fields.map((f) => f.name.toLowerCase());
    const hits = cols.filter((c) => norm.includes(c)).length;
    const score = hits / cols.length;
    if (!best || score > best.score) best = { template: t, score };
  }
  return best && best.score >= 0.5 ? best : null;
}
