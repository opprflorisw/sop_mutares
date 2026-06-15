// Generates consistent, cross-referenced sample CSVs for the
// SFC India "Sealings" company into src/sample-data/sealings/.
// One deliberate gap is injected (FR-0912 missing 2023-03) so the
// AI data-check has something real to catch. Deterministic (no RNG).
//
//   node scripts/gen-sealings-data.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "sample-data", "sealings");
mkdirSync(OUT, { recursive: true });

const SKUS = [
  { sku: "AL-1024", desc: "Welt Bodyside FrRH", family: "Welt seals", plant: "BWL", customer: "TML", cost: 38.5, price: 52.0, base: 42000 },
  { sku: "DE-4421", desc: "GlassRun Fr Dr RH", family: "GlassRun channels", plant: "MNR", customer: "MSIL", cost: 55.0, price: 74.0, base: 31000 },
  { sku: "FR-0912", desc: "Profile NL-DE", family: "Profile extrusions", plant: "BWL", customer: "VW", cost: 61.0, price: 83.0, base: 18500 },
  { sku: "MNR-202", desc: "GlassRun Rr Dr RH", family: "GlassRun channels", plant: "MNR", customer: "TATA", cost: 54.0, price: 71.0, base: 26500 },
  { sku: "MNR-215", desc: "Welt Bodyside RrRH", family: "Welt seals", plant: "MNR", customer: "M&M", cost: 36.0, price: 48.0, base: 22000 },
  { sku: "NL-0571", desc: "Dog Leg Seal RH", family: "Dog-leg seals", plant: "CNS", customer: "RNAIPL", cost: 45.0, price: 61.0, base: 19500 },
];

const CUSTOMERS = [
  ["TML", "North", "OEM", "Commercial"],
  ["MSIL", "North", "OEM", "Passenger"],
  ["VW", "West", "OEM", "Passenger"],
  ["TATA", "West", "OEM", "Passenger"],
  ["M&M", "South", "OEM", "Utility"],
  ["RNAIPL", "South", "OEM", "Passenger"],
];

const PLANTS = [
  ["BWL", "Bawal", "Haryana, IN", 86400, 40],
  ["MNR", "Manesar", "Haryana, IN", 64800, 40],
  ["CNS", "Chennai", "Tamil Nadu, IN", 43200, 40],
  ["SND", "Sanand", "Gujarat, IN", 50400, 40],
  ["SBD", "Sahibabad", "Uttar Pradesh, IN", 36000, 40],
];

const LINES = [
  ["BWL", "Extrusion-1", 28800, 27100],
  ["BWL", "Extrusion-2", 28800, 31900], // overloaded
  ["CNS", "Moulding-1", 21600, 19000],
  ["SND", "Assembly-1", 25200, 19100],
  ["SBD", "Extrusion-3", 18000, 14800],
];

const BOM = [
  ["AL-1024", "RUB-EPDM-12", 1.2, "SUP-204", 21, 9.4],
  ["DE-4421", "RUB-EPDM-12", 1.6, "SUP-204", 21, 9.4],
  ["DE-4421", "STL-CORE-7", 1.0, "SUP-118", 28, 14.2],
  ["FR-0912", "RUB-EPDM-12", 1.1, "SUP-204", 21, 9.4],
  ["MNR-202", "STL-CORE-7", 1.0, "SUP-118", 28, 14.2],
  ["MNR-215", "COAT-PU", 0.3, "SUP-330", 14, 4.1],
  ["NL-0571", "RUB-EPDM-12", 0.9, "SUP-204", 21, 9.4],
];

const SUPPLIERS = [
  ["SUP-204", "RUB-EPDM-12", 21, 92, 5000],
  ["SUP-118", "STL-CORE-7", 28, 88, 8000],
  ["SUP-330", "COAT-PU", 14, 97, 2000],
];

// ---- helpers ----
function months(startYear, startMonth, count) {
  const out = [];
  let y = startYear;
  let m = startMonth;
  for (let i = 0; i < count; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}-01`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}
function seasonal(i) {
  return 1 + 0.08 * Math.sin(((i + 2) * Math.PI) / 6);
}
function round(n) {
  return Math.round(n);
}
function toCsv(header, rows) {
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n") + "\n";
}
function write(name, content) {
  writeFileSync(join(OUT, name), content, "utf8");
  const lines = content.trim().split("\n").length - 1;
  console.log(`  ${name.padEnd(22)} ${lines} rows`);
}

// ---- sku_master ----
write(
  "sku_master.csv",
  toCsv(
    ["sku", "description", "family", "uom", "plant", "std_cost", "price"],
    SKUS.map((s) => [s.sku, s.desc, s.family, "pcs", s.plant, s.cost, s.price])
  )
);

// ---- customer_master ----
write("customer_master.csv", toCsv(["customer", "region", "channel", "segment"], CUSTOMERS));

// ---- plant_master ----
write("plant_master.csv", toCsv(["plant", "name", "location", "capacity_minutes", "target_inv_days"], PLANTS));

// ---- sales_history (12 months actuals, with a deliberate gap) ----
{
  const hist = months(2022, 7, 12); // 2022-07 .. 2023-06
  const rows = [];
  hist.forEach((date, i) => {
    // DELIBERATE GAP: the whole of 2023-03 is missing, so the data
    // check has a clean "time pocket" to surface in the demo.
    if (date === "2023-03-01") return;
    SKUS.forEach((s) => {
      const qty = round(s.base * seasonal(i) * (1 + 0.04 * (i / 12)));
      rows.push([date, s.sku, s.customer, s.plant, qty, round(qty * s.price)]);
    });
  });
  write("sales_history.csv", toCsv(["date", "sku", "customer", "plant", "qty", "revenue"], rows));
}

// ---- demand_forecast (next 12 months baseline) ----
{
  const fc = months(2023, 7, 12); // 2023-07 .. 2024-06
  const rows = [];
  fc.forEach((date, i) => {
    SKUS.forEach((s) => {
      const qty = round(s.base * 1.06 * seasonal(i + 12));
      rows.push([date, s.sku, s.customer, s.plant, qty]);
    });
  });
  write("demand_forecast.csv", toCsv(["date", "sku", "customer", "plant", "baseline_qty"], rows));
}

// ---- bom ----
write("bom.csv", toCsv(["parent_sku", "component", "qty_per", "supplier", "lead_time_days", "unit_cost"], BOM));

// ---- inventory (3 snapshots x plants-with-stock x categories) ----
{
  const snaps = ["2022-12-01", "2023-03-01", "2023-06-01"];
  const invPlants = [
    { plant: "BWL", sku: "AL-1024", rm: 53400, wip: 57500, fg: 61600 },
    { plant: "CNS", sku: "NL-0571", rm: 10200, wip: 39600, fg: 2700 },
    { plant: "SBD", sku: "MNR-215", rm: 182500, wip: 18900, fg: 1100 },
  ];
  const rows = [];
  snaps.forEach((date, si) => {
    const drift = 1 + 0.03 * si;
    invPlants.forEach((p) => {
      rows.push([date, p.plant, p.sku, "RM", round(p.rm * drift), round(p.rm * drift * 100)]);
      rows.push([date, p.plant, p.sku, "WIP", round(p.wip * drift), round(p.wip * drift * 100)]);
      rows.push([date, p.plant, p.sku, "FG", round(p.fg * drift), round(p.fg * drift * 100)]);
    });
  });
  write("inventory.csv", toCsv(["date", "plant", "sku", "category", "qty", "value"], rows));
}

// ---- capacity (12 months x lines, overload on Extrusion-2) ----
{
  const cap = months(2022, 7, 12);
  const rows = [];
  cap.forEach((date, i) => {
    LINES.forEach(([plant, line, avail, req]) => {
      const required = round(req * seasonal(i));
      rows.push([date, plant, line, avail, required]);
    });
  });
  write("capacity.csv", toCsv(["date", "plant", "resource", "available_min", "required_min"], rows));
}

// ---- supplier ----
write("supplier.csv", toCsv(["supplier", "component", "lead_time_days", "reliability", "moq"], SUPPLIERS));

console.log("\nDone → src/sample-data/sealings/");
