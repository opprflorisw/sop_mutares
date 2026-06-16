// ============================================================
// Deterministic generator for the "Nordic Smart Home Electronics — EU"
// demo scenario. Mirrors Varun's reference dashboards in OUR framework:
//   • 5 facilities (Site A–E) with a clear capacity bottleneck on Site A
//   • FG001–FG010 across 4 families, a few SKUs with poor BIAS/accuracy
//   • inventory above target, an EOL SLOB item, an NPI ramp
//   • a board-level supply-chain scorecard (6 RAG categories)
// Run: node src/sample-data/demo-electronics/generate.mjs
// Writes the canonical S&OP-set CSVs next to this file.
// ============================================================
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = dirname(fileURLToPath(import.meta.url));
// quote any field containing a comma / quote / newline (RFC-4180)
const cell = (v) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const w = (name, rows) => {
  const csv = rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
  writeFileSync(join(OUT, name), csv);
  console.log(`  ${name} — ${rows.length - 1} rows`);
};

// seeded RNG (mulberry32) — reproducible, no Math.random
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = rng(20260616);
const jit = (v, pct) => Math.round(v * (1 + (rnd() * 2 - 1) * pct));

// ---- months ----
const ym = (y, m) => `${y}-${String(m).padStart(2, "0")}`;
function monthsBetween(y0, m0, y1, m1) {
  const out = [];
  let y = y0, m = m0;
  while (y < y1 || (y === y1 && m <= m1)) {
    out.push(ym(y, m));
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}
const ACT_MONTHS = monthsBetween(2024, 7, 2025, 12);   // 18 months actuals
const FC_MONTHS = monthsBetween(2026, 1, 2026, 12);    // 12 months forecast
const CAP_MONTHS = monthsBetween(2025, 7, 2026, 12);   // capacity horizon
const INV_MONTHS = monthsBetween(2025, 7, 2025, 12);   // inventory snapshots

// ---- plants (5 facilities) ----
// Site A (Tallinn) is the lead SMT/PCBA site and the binding constraint.
const PLANTS = [
  { plant: "TLL", site: "Site A", name: "Tallinn", loc: "Tallinn, EE", cap: 96000, invTarget: 40 },
  { plant: "KRK", site: "Site B", name: "Kraków", loc: "Kraków, PL", cap: 88000, invTarget: 40 },
  { plant: "OPO", site: "Site C", name: "Porto", loc: "Porto, PT", cap: 72000, invTarget: 35 },
  { plant: "MUC", site: "Site D", name: "Munich", loc: "Munich, DE", cap: 60000, invTarget: 30 },
  { plant: "GDN", site: "Site E", name: "Gdańsk", loc: "Gdańsk, PL", cap: 54000, invTarget: 45 },
];

// ---- SKUs (FG001–FG010) ----
// base = avg monthly units (2025); m = forecast multiplier vs prior-year actual
//   → drives MAPE/BIAS directly. sign of (m-1): + over-forecast, - under.
// m = forecast multiplier vs prior-year actual → drives MAPE/BIAS directly:
// mape ≈ |m-1|×100, bias sign = over (m>1) / under (m<1). Tuned to Varun's
// FVA-bubble positions: FG001/FG009 good (≥75%), the climate/connectivity
// SKUs fair (55–75%), and Power & Sensing the poor cluster (<55%).
const SKUS = [
  { sku: "FG001", desc: "Smart Home Hub Pro", family: "Smart Home", plant: "TLL", price: 168, cost: 119, base: 1050, m: 0.77, mpu: 9.0 },   // acc ~77 · under
  { sku: "FG002", desc: "Smart Thermostat", family: "Climate Control", plant: "TLL", price: 96, cost: 64, base: 820, m: 0.63, mpu: 7.5 },     // acc ~63 · under
  { sku: "FG003", desc: "Connect Bridge", family: "Connectivity", plant: "KRK", price: 54, cost: 36, base: 760, m: 1.30, mpu: 4.5 },          // acc ~70 · over
  { sku: "FG004", desc: "Power Module X", family: "Power & Sensing", plant: "KRK", price: 132, cost: 101, base: 980, m: 1.63, mpu: 8.0 },      // acc ~37 · over
  { sku: "FG005", desc: "Motion Sensor", family: "Power & Sensing", plant: "OPO", price: 39, cost: 27, base: 1500, m: 1.94, mpu: 3.0 },        // acc ~6 · over
  { sku: "FG006", desc: "IoT Gateway Module", family: "Connectivity", plant: "OPO", price: 124, cost: 86, base: 1020, m: 0.61, mpu: 7.0 },     // acc ~61 · under
  { sku: "FG007", desc: "Eco Plug Mini", family: "Power & Sensing", plant: "GDN", price: 22, cost: 17, base: 240, m: 1.98, mpu: 2.5 },         // acc ~2 · over · EOL
  { sku: "FG008", desc: "Climate Sensor Pro", family: "Climate Control", plant: "MUC", price: 78, cost: 52, base: 520, m: 1.32, mpu: 6.0 },    // acc ~68 · over
  { sku: "FG009", desc: "Smart Lock Pro", family: "Smart Home", plant: "TLL", price: 184, cost: 121, base: 980, m: 0.75, mpu: 9.5 },           // acc ~75 · under
  { sku: "FG010", desc: "Air Quality Monitor", family: "Power & Sensing", plant: "MUC", price: 142, cost: 98, base: 940, m: 0.37, mpu: 8.5 },  // acc ~37 · under
];
const byId = Object.fromEntries(SKUS.map((s) => [s.sku, s]));
const FAMILIES = [...new Set(SKUS.map((s) => s.family))];

// seasonality — gentle peak in autumn (electronics buy-in before winter)
const seas = (m) => { const mm = +m.slice(5); return 1 + 0.18 * Math.sin(((mm - 3) / 12) * 2 * Math.PI); };

// ---- customers ----
const CUSTOMERS = [
  { customer: "NordRetail", region: "North", channel: "B2C" },
  { customer: "TechDistro EU", region: "West", channel: "B2B" },
  { customer: "HomeServe", region: "South", channel: "OEM" },
  { customer: "BuildSmart", region: "East", channel: "B2B" },
];

// =====================================================================
// 1. sku_master
// =====================================================================
w("sku_master.csv", [
  ["sku", "description", "family", "uom", "plant", "std_cost", "price"],
  ...SKUS.map((s) => [s.sku, s.desc, s.family, "pcs", s.plant, s.cost, s.price]),
]);

// 2. customer_master
w("customer_master.csv", [
  ["customer", "region", "channel", "segment"],
  ...CUSTOMERS.map((c) => [c.customer, c.region, c.channel, "Connected devices"]),
]);

// 3. plant_master
w("plant_master.csv", [
  ["plant", "name", "location", "capacity_minutes", "target_inv_days"],
  ...PLANTS.map((p) => [p.plant, `${p.site} — ${p.name}`, p.loc, p.cap, p.invTarget]),
]);

// =====================================================================
// 4. sales_history — monthly actuals by SKU × customer
// =====================================================================
const actualBy = {}; // `${sku}|${month}` -> units
const salesRows = [["date", "sku", "customer", "plant", "qty", "revenue"]];
for (const s of SKUS) {
  for (const mo of ACT_MONTHS) {
    // gentle YoY growth + seasonality + noise
    const yoy = mo >= "2025-01" ? 1.06 : 1.0;
    const units = Math.max(0, jit(Math.round(s.base * seas(mo) * yoy), 0.08));
    actualBy[`${s.sku}|${mo}`] = units;
    // split across 2 customers
    const c1 = CUSTOMERS[(s.sku.charCodeAt(4)) % CUSTOMERS.length];
    const c2 = CUSTOMERS[(s.sku.charCodeAt(4) + 1) % CUSTOMERS.length];
    const q1 = Math.round(units * 0.6), q2 = units - q1;
    salesRows.push([`${mo}-01`, s.sku, c1.customer, s.plant, q1, Math.round(q1 * s.price)]);
    salesRows.push([`${mo}-01`, s.sku, c2.customer, s.plant, q2, Math.round(q2 * s.price)]);
  }
}
w("sales_history.csv", salesRows);

// =====================================================================
// 5. demand_forecast — 2026, set so accuracy vs prior-year (2025) hits target
// =====================================================================
const fcBy = {}; // `${sku}|${month}` -> units
const fcRows = [["date", "sku", "customer", "plant", "baseline_qty"]];
for (const s of SKUS) {
  for (const mo of FC_MONTHS) {
    const priorYr = `2025-${mo.slice(5)}`;
    const priorActual = actualBy[`${s.sku}|${priorYr}`] ?? Math.round(s.base * seas(mo));
    const units = Math.max(0, jit(Math.round(priorActual * s.m), 0.05));
    fcBy[`${s.sku}|${mo}`] = units;
    const c1 = CUSTOMERS[(s.sku.charCodeAt(4)) % CUSTOMERS.length];
    fcRows.push([`${mo}-01`, s.sku, c1.customer, s.plant, units]);
  }
}
w("demand_forecast.csv", fcRows);

// =====================================================================
// 6. inventory — RM / WIP / FG by plant, monthly snapshots
//    Story: FG inventory runs above target; FG007 (EOL) sits as SLOB.
// =====================================================================
const invRows = [["date", "plant", "sku", "category", "qty", "value"]];
for (const mo of INV_MONTHS) {
  for (const s of SKUS) {
    const monthlyUnits = actualBy[`${s.sku}|${mo}`] ?? s.base;
    // FG cover ~ 1.3–1.8 months (above target) — EOL FG007 carries 9× cover
    const coverMul = s.sku === "FG007" ? 9 : 1.3 + rnd() * 0.5;
    const fgQty = Math.round(monthlyUnits * coverMul);
    invRows.push([`${mo}-01`, s.plant, s.sku, "FG", fgQty, Math.round(fgQty * s.cost)]);
    // WIP + RM as a fraction
    const wip = Math.round(monthlyUnits * 0.35);
    invRows.push([`${mo}-01`, s.plant, s.sku, "WIP", wip, Math.round(wip * s.cost * 0.6)]);
    const rm = Math.round(monthlyUnits * 0.5);
    invRows.push([`${mo}-01`, s.plant, s.sku, "RM", rm, Math.round(rm * s.cost * 0.4)]);
  }
}
w("inventory.csv", invRows);

// =====================================================================
// 7. capacity — required vs available minutes per resource per month
//    Story: Site A (TLL) SMT lines overloaded ~6 months; Site C (OPO)
//    slightly over; Sites D/E carry spare. required derived from forecast
//    load (mpu × units) on the resource, plus a winter bump.
// =====================================================================
const RESOURCES = [
  { plant: "TLL", resource: "SMT Line 1", avail: 26000, load: 1.16 },
  { plant: "TLL", resource: "SMT Line 2", avail: 24000, load: 1.05 },
  { plant: "TLL", resource: "Assembly A", avail: 22000, load: 0.92 },
  { plant: "KRK", resource: "Assembly B", avail: 26000, load: 0.88 },
  { plant: "KRK", resource: "Test Cell", avail: 18000, load: 0.74 },
  { plant: "OPO", resource: "Assembly C", avail: 24000, load: 1.04 },
  { plant: "OPO", resource: "Packaging C", avail: 16000, load: 0.83 },
  { plant: "MUC", resource: "Pilot Line", avail: 20000, load: 0.76 },
  { plant: "GDN", resource: "Packaging E", avail: 18000, load: 0.82 },
];
const capRows = [["date", "plant", "resource", "available_min", "required_min"]];
for (const mo of CAP_MONTHS) {
  const winter = 1 + 0.12 * Math.sin(((+mo.slice(5) - 3) / 12) * 2 * Math.PI); // autumn/winter bump
  for (const r of RESOURCES) {
    const req = Math.round(r.avail * r.load * winter * (0.97 + rnd() * 0.06));
    capRows.push([`${mo}-01`, r.plant, r.resource, r.avail, req]);
  }
}
w("capacity.csv", capRows);

// =====================================================================
// 8. bom + 9. supplier — component structure incl. the WiFi/BT Combo
//    Module from Taiwan Semiconductor (long lead, lower reliability → risk).
// =====================================================================
const COMPONENTS = [
  { component: "WIFI-BT-COMBO", supplier: "TWN-SEMI", lead: 35, rel: 86, moq: 300, cost: 6.4 },
  { component: "MCU-CORTEX-M4", supplier: "EURO-CHIP", lead: 21, rel: 94, moq: 1000, cost: 3.1 },
  { component: "PMIC-5V", supplier: "EURO-CHIP", lead: 18, rel: 96, moq: 2000, cost: 1.8 },
  { component: "ENCLOSURE-ABS", supplier: "POLYMER-NL", lead: 12, rel: 98, moq: 500, cost: 2.2 },
  { component: "PCB-4LAYER", supplier: "PCB-EAST", lead: 28, rel: 90, moq: 400, cost: 4.0 },
];
const bomRows = [["parent_sku", "component", "qty_per", "supplier", "lead_time_days", "unit_cost"]];
for (const s of SKUS) {
  // every FG uses MCU + PCB + enclosure; connectivity/home use the combo module
  const comps = ["MCU-CORTEX-M4", "PCB-4LAYER", "ENCLOSURE-ABS"];
  if (["Connectivity", "Smart Home"].includes(s.family)) comps.unshift("WIFI-BT-COMBO");
  if (s.family === "Power & Sensing") comps.push("PMIC-5V");
  for (const c of comps) {
    const cc = COMPONENTS.find((x) => x.component === c);
    bomRows.push([s.sku, c, 1, cc.supplier, cc.lead, cc.cost]);
  }
}
w("bom.csv", bomRows);
w("supplier.csv", [
  ["supplier", "component", "lead_time_days", "reliability", "moq"],
  ...COMPONENTS.map((c) => [c.supplier, c.component, c.lead, c.rel, c.moq]),
]);

// =====================================================================
// 10. budget — monthly AOP revenue by family (2026). Plan lands a touch
//     above budget on most families, below on Power & Sensing (the
//     under-performing line).
// =====================================================================
const budgetRows = [["month", "family", "budget_revenue"]];
for (const mo of FC_MONTHS) {
  for (const fam of FAMILIES) {
    // plan value for the family this month
    let plan = 0;
    for (const s of SKUS) if (s.family === fam) plan += (fcBy[`${s.sku}|${mo}`] ?? 0) * s.price;
    const attain = fam === "Power & Sensing" ? 1.12 : 0.94 + rnd() * 0.05; // budget set above plan for P&S → plan below budget
    budgetRows.push([mo, fam, Math.round(plan * attain)]);
  }
}
w("budget.csv", budgetRows);

// =====================================================================
// 11. portfolio — one NPI ramp, one EOL run-down
// =====================================================================
w("portfolio.csv", [
  ["item", "type", "start_month", "ramp_months", "peak_units", "cannibalizes"],
  ["FG011", "NPI", "2026-04", 5, 1400, "FG001"],
  ["FG007", "EOL", "2026-02", 4, 0, ""],
]);

// =====================================================================
// 12. scorecard — board-level supply-chain scorecard (img 9), 6 RAG
//     categories. direction: 'higher' or 'lower' = better. headline=1
//     surfaces the metric in the KPI strip.
// =====================================================================
const sc = [["category", "metric", "value", "target", "unit", "direction", "headline"]];
const row = (cat, metric, value, target, unit, dir, head = 0) => sc.push([cat, metric, value, target, unit, dir, head]);
// headline strip
row("Customer Delivery", "OTIF — all customers", 98.2, 97, "%", "higher", 1);
row("Demand", "Forecast accuracy", 84, 85, "%", "higher", 1);
row("Inventory", "Inventory days", 43, 40, "d", "lower", 1);
row("Freight & Logistics", "Outbound freight %", 0.31, 0.39, "%", "lower", 1);
row("People & Savings", "Savings YTD", 176, 142, "k€", "higher", 1);
// Customer Delivery
row("Customer Delivery", "OTIF — NordRetail", 99, 97, "%", "higher");
row("Customer Delivery", "OTIF — TechDistro EU", 96, 97, "%", "higher");
row("Customer Delivery", "OTIF — HomeServe", 100, 97, "%", "higher");
row("Customer Delivery", "Line fill rate", 97.4, 98, "%", "higher");
// Freight & Logistics
row("Freight & Logistics", "Premium freight", 28, 20, "k€", "lower");
row("Freight & Logistics", "Inbound import freight", 412, 380, "k€", "lower");
row("Freight & Logistics", "Demurrage", 0, 0, "k€", "lower");
// Inventory
row("Inventory", "Days — Site A", 47, 40, "d", "lower");
row("Inventory", "Days — Site C", 33, 35, "d", "lower");
row("Inventory", "Raw material days", 31, 30, "d", "lower");
row("Inventory", "Obsolescence (SLOB)", 0.31, 0.2, "M€", "lower");
// Demand
row("Demand", "Forecast BIAS", -4.2, 0, "%", "lower");
row("Demand", "Plan vs budget", -3, 0, "%", "higher");
row("Demand", "A-item accuracy", 89, 90, "%", "higher");
// Capacity
row("Capacity", "Site A utilisation", 113, 100, "%", "lower");
row("Capacity", "Site C utilisation", 104, 100, "%", "lower");
row("Capacity", "Site D utilisation", 76, 100, "%", "lower");
row("Capacity", "Site E utilisation", 82, 100, "%", "lower");
row("Capacity", "Overloaded sites", 2, 0, "#", "lower");
// People & Savings
row("People & Savings", "FTE — direct", 248, 250, "#", "lower");
row("People & Savings", "Savings vs target", 24, 0, "%", "higher");
row("People & Savings", "Open gap-close actions", 6, 0, "#", "lower");
w("scorecard.csv", sc);

console.log("Done — Nordic Smart Home Electronics demo data written.");
