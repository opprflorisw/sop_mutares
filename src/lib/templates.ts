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
  { label: string; tone: "bad" | "warn" | "neutral"; blurb: string }
> = {
  required: { label: "Required", tone: "bad", blurb: "Core modules need this file." },
  recommended: { label: "Recommended", tone: "warn", blurb: "Unlocks more analysis." },
  optional: { label: "Optional", tone: "neutral", blurb: "Nice to have." },
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
  headers: string[]
): { template: DataTemplate; score: number } | null {
  const norm = headers.map((h) => h.trim().toLowerCase());
  let best: { template: DataTemplate; score: number } | null = null;
  for (const t of TEMPLATES) {
    const cols = t.fields.map((f) => f.name.toLowerCase());
    const hits = cols.filter((c) => norm.includes(c)).length;
    const score = hits / cols.length;
    if (!best || score > best.score) best = { template: t, score };
  }
  return best && best.score >= 0.5 ? best : null;
}
