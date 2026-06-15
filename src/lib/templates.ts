// ============================================================
// Canonical data templates — the "enforced format" contract.
// Each template = fixed header + example row + field dictionary.
// The File Explorer renders these and lets users download a .csv
// starter. Later phases validate uploads against these schemas
// (Zod) before anything is stored in a Project.
// ============================================================

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
  description: string;
  fields: TemplateField[];
  example: Record<string, string | number>;
};

export const TEMPLATES: DataTemplate[] = [
  {
    id: "sku_master",
    file: "sku_master.csv",
    title: "SKU Master",
    module: "Master",
    description: "The product catalogue every other file references.",
    fields: [
      { name: "sku", type: "string", required: true, description: "Unique SKU / part number" },
      { name: "description", type: "string", required: true, description: "Human-readable description" },
      { name: "family", type: "string", required: true, description: "Product family / group" },
      { name: "uom", type: "string", required: true, description: "Unit of measure (e.g. pcs, Tn)" },
      { name: "plant", type: "string", required: true, description: "Primary plant code" },
      { name: "std_cost", type: "number", required: true, description: "Standard unit cost" },
      { name: "price", type: "number", required: true, description: "List / selling price per unit" },
    ],
    example: { sku: "AL-1024", description: "Welt Bodyside FrRH", family: "Welt", uom: "pcs", plant: "BWL", std_cost: 38.5, price: 52.0 },
  },
  {
    id: "customer_master",
    file: "customer_master.csv",
    title: "Customer Master",
    module: "Master",
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

/** Build a downloadable CSV string for a template (header + example row). */
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
