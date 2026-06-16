// Generates a complete second scenario — "ElectroTech Industries — EU",
// an electronics manufacturer (EUR, 3 EU plants) — into
// src/sample-data/electrotech/. Same template contract as Sealings.
// Deliberate gap: the whole of 2022-11 is missing from sales history.
//
//   node scripts/gen-electrotech-data.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "sample-data", "electrotech");
mkdirSync(OUT, { recursive: true });

const SKUS = [
  { sku: "SH-100", desc: "Smart Home Hub G2", family: "Smart Home Hubs", plant: "BER", customer: "RetailCo", cost: 52, price: 85, base: 18000 },
  { sku: "SH-140", desc: "Smart Home Hub Mini", family: "Smart Home Hubs", plant: "BER", customer: "RetailCo", cost: 28, price: 45, base: 24000 },
  { sku: "IC-220", desc: "Industrial Controller X", family: "Industrial Controllers", plant: "KAR", customer: "AutoMfg", cost: 92, price: 140, base: 9000 },
  { sku: "IC-260", desc: "Industrial Controller S", family: "Industrial Controllers", plant: "KAR", customer: "EnergyCo", cost: 70, price: 110, base: 7500 },
  { sku: "PM-330", desc: "Power Module 48V", family: "Power Modules", plant: "LYO", customer: "TelecomEU", cost: 38, price: 60, base: 14000 },
  { sku: "SN-410", desc: "Sensor Node BLE", family: "Sensor Nodes", plant: "LYO", customer: "TelecomEU", cost: 12, price: 22, base: 30000 },
];

const CUSTOMERS = [
  ["RetailCo", "DACH", "B2C", "Consumer"],
  ["AutoMfg", "DACH", "OEM", "Automotive"],
  ["EnergyCo", "France", "B2B", "Energy"],
  ["TelecomEU", "EU", "B2B", "Telecom"],
];

const PLANTS = [
  ["LYO", "Lyon", "Lyon, FR", 64800, 30],
  ["KAR", "Karlsruhe", "Karlsruhe, DE", 57600, 30],
  ["BER", "Berlin", "Berlin, DE", 50400, 30],
];

const LINES = [
  ["LYO", "SMT-1", 28800, 24800],
  ["KAR", "SMT-2", 28800, 33100], // overloaded
  ["BER", "Assembly-1", 25200, 22600],
  ["LYO", "Test-1", 21600, 16800],
];

const BOM = [
  ["SH-100", "CAP-100UF", 6, "SUP-SZ", 35, 0.42],
  ["SH-100", "MCU-32", 1, "SUP-EU", 18, 4.1],
  ["SH-140", "CAP-100UF", 4, "SUP-SZ", 35, 0.42],
  ["IC-220", "MCU-32", 2, "SUP-EU", 18, 4.1],
  ["IC-220", "PCB-4L", 1, "SUP-EU", 21, 6.5],
  ["IC-260", "PCB-4L", 1, "SUP-EU", 21, 6.5],
  ["PM-330", "FET-60V", 4, "SUP-SZ", 35, 0.9],
  ["SN-410", "CAP-100UF", 2, "SUP-SZ", 35, 0.42],
];

const SUPPLIERS = [
  ["SUP-SZ", "CAP-100UF", 35, 84, 50000], // Shenzhen — long lead, low reliability
  ["SUP-SZ", "FET-60V", 35, 84, 20000],
  ["SUP-EU", "MCU-32", 18, 95, 5000],
  ["SUP-EU", "PCB-4L", 21, 93, 3000],
];

function months(sy, sm, count) {
  const out = []; let y = sy, m = sm;
  for (let i = 0; i < count; i++) { out.push(`${y}-${String(m).padStart(2, "0")}-01`); if (++m > 12) { m = 1; y++; } }
  return out;
}
const seasonal = (i) => 1 + 0.1 * Math.sin(((i + 1) * Math.PI) / 6);
const round = (n) => Math.round(n);
const csvCell = (v) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = (h, rows) => [h.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n") + "\n";
function write(name, content) {
  writeFileSync(join(OUT, name), content, "utf8");
  console.log(`  ${name.padEnd(22)} ${content.trim().split("\n").length - 1} rows`);
}

write("sku_master.csv", toCsv(["sku", "description", "family", "uom", "plant", "std_cost", "price"],
  SKUS.map((s) => [s.sku, s.desc, s.family, "pcs", s.plant, s.cost, s.price])));
write("customer_master.csv", toCsv(["customer", "region", "channel", "segment"], CUSTOMERS));
write("plant_master.csv", toCsv(["plant", "name", "location", "capacity_minutes", "target_inv_days"], PLANTS));

{
  const hist = months(2022, 7, 12); // 2022-07 .. 2023-06
  const rows = [];
  hist.forEach((date, i) => {
    if (date === "2022-11-01") return; // DELIBERATE GAP: whole month missing
    SKUS.forEach((s) => {
      const qty = round(s.base * seasonal(i) * (1 + 0.05 * (i / 12)));
      rows.push([date, s.sku, s.customer, s.plant, qty, round(qty * s.price)]);
    });
  });
  write("sales_history.csv", toCsv(["date", "sku", "customer", "plant", "qty", "revenue"], rows));
}
{
  const fc = months(2023, 7, 12);
  const rows = [];
  fc.forEach((date, i) => SKUS.forEach((s) => {
    const qty = round(s.base * 1.09 * seasonal(i + 12));
    rows.push([date, s.sku, s.customer, s.plant, qty]);
  }));
  write("demand_forecast.csv", toCsv(["date", "sku", "customer", "plant", "baseline_qty"], rows));
}
write("bom.csv", toCsv(["parent_sku", "component", "qty_per", "supplier", "lead_time_days", "unit_cost"], BOM));
{
  const snaps = ["2022-12-01", "2023-03-01", "2023-06-01"];
  const inv = [
    { plant: "BER", sku: "SH-100", rm: 180000, wip: 95000, fg: 240000 },
    { plant: "KAR", sku: "IC-220", rm: 320000, wip: 210000, fg: 140000 },
    { plant: "LYO", sku: "PM-330", rm: 150000, wip: 80000, fg: 60000 },
  ];
  const rows = [];
  snaps.forEach((date, si) => {
    const drift = 1 + 0.04 * si;
    inv.forEach((p) => {
      rows.push([date, p.plant, p.sku, "RM", round(p.rm * drift / 10), round(p.rm * drift)]);
      rows.push([date, p.plant, p.sku, "WIP", round(p.wip * drift / 10), round(p.wip * drift)]);
      rows.push([date, p.plant, p.sku, "FG", round(p.fg * drift / 10), round(p.fg * drift)]);
    });
  });
  write("inventory.csv", toCsv(["date", "plant", "sku", "category", "qty", "value"], rows));
}
{
  const cap = months(2022, 7, 12);
  const rows = [];
  cap.forEach((date, i) => LINES.forEach(([plant, line, avail, req]) =>
    rows.push([date, plant, line, avail, round(req * seasonal(i))])));
  write("capacity.csv", toCsv(["date", "plant", "resource", "available_min", "required_min"], rows));
}
write("supplier.csv", toCsv(["supplier", "component", "lead_time_days", "reliability", "moq"], SUPPLIERS));

console.log("\nDone → src/sample-data/electrotech/");
