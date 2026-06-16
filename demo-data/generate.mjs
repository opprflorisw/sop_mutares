// Deterministic generator for the fresh-demo dataset:
// a small coffee roaster ("Fika Roasters"). Produces the 3 canonical-floor
// files (items / sales / plan) plus a held-back inventory file we use to
// demo the "🔒 upload this to unlock" tier. Seeded RNG → reproducible.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(here, { recursive: true });

// --- seeded RNG (mulberry32) ---
let seed = 0x9e3779b9;
function rnd() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const jitter = (p) => 1 + (rnd() * 2 - 1) * p; // ±p
const pick = (arr, weights) => {
  const r = rnd() * weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < arr.length; i++) { acc += weights[i]; if (r <= acc) return arr[i]; }
  return arr[arr.length - 1];
};

// --- items (the master) ---
const items = [
  { item_id: "ESP-250", name: "Espresso Blend 250g", category: "Beans", unit_cost: 3.2, unit_price: 7.5, base: 1200, season: "winter" },
  { item_id: "ESP-1KG", name: "Espresso Blend 1kg", category: "Beans", unit_cost: 11.0, unit_price: 24.0, base: 320, season: "winter" },
  { item_id: "FIL-250", name: "Filter Blend 250g", category: "Beans", unit_cost: 3.0, unit_price: 7.0, base: 900, season: "flat" },
  { item_id: "DEC-250", name: "Decaf Blend 250g", category: "Beans", unit_cost: 3.4, unit_price: 7.8, base: 360, season: "flat" },
  { item_id: "CAP-PODS", name: "Capsule Pods 10pk", category: "Pods", unit_cost: 1.8, unit_price: 4.5, base: 1500, season: "winter" },
  { item_id: "COLD-BREW", name: "Cold Brew 250ml", category: "RTD", unit_cost: 0.9, unit_price: 2.8, base: 650, season: "summer" },
  { item_id: "MUG-CER", name: "Ceramic Mug", category: "Merch", unit_cost: 2.5, unit_price: 9.0, base: 200, season: "dec" },
  { item_id: "GIFT-BOX", name: "Gift Box Set", category: "Gift", unit_cost: 8.0, unit_price: 22.0, base: 130, season: "dec" },
];

// --- months: actuals Jul'25..Jun'26 (12), plan extends +3 ---
function months(startY, startM, n) {
  const out = [];
  let y = startY, m = startM;
  for (let i = 0; i < n; i++) { out.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
const salesMonths = months(2025, 7, 12);
const planMonths = months(2025, 7, 15);

// seasonal multiplier by calendar month + the item's seasonality profile
function seasonal(profile, ym) {
  const mm = Number(ym.split("-")[1]);
  const winter = [11, 12, 1, 2].includes(mm) ? 1.25 : [6, 7, 8].includes(mm) ? 0.85 : 1.0;
  const summer = [6, 7, 8].includes(mm) ? 1.35 : [11, 12, 1].includes(mm) ? 0.8 : 1.0;
  const dec = mm === 12 ? 2.4 : mm === 11 ? 1.3 : 0.85;
  return profile === "winter" ? winter : profile === "summer" ? summer : profile === "dec" ? dec : 1.0;
}

const channels = ["Retail", "Wholesale", "DTC"];
const chanW = [0.5, 0.35, 0.15];
const regions = ["North", "South", "Export"];
const regW = [0.45, 0.4, 0.15];

// --- sales (actuals): month x item x channel, with a region per row ---
const salesRows = [["month", "item_id", "channel", "region", "units", "revenue"]];
for (const ym of salesMonths) {
  for (const it of items) {
    const monthTotal = it.base * seasonal(it.season, ym) * jitter(0.12);
    for (let c = 0; c < channels.length; c++) {
      const units = Math.max(0, Math.round(monthTotal * chanW[c] * jitter(0.18)));
      if (units === 0) continue;
      const region = pick(regions, regW);
      const revenue = Math.round(units * it.unit_price);
      salesRows.push([ym, it.item_id, channels[c], region, units, revenue]);
    }
  }
}

// --- plan: month x item (planned units), with a per-item forecast bias ---
const bias = {}; items.forEach((it) => (bias[it.item_id] = 1 + (rnd() * 0.3 - 0.15))); // ±15%
const planRows = [["month", "item_id", "planned_units"]];
for (const ym of planMonths) {
  for (const it of items) {
    const expected = it.base * seasonal(it.season, ym);
    const planned = Math.max(0, Math.round(expected * bias[it.item_id] * jitter(0.05)));
    planRows.push([ym, it.item_id, planned]);
  }
}

// --- inventory (HELD BACK — used to demo the locked tier): month x item ---
const invRows = [["month", "item_id", "on_hand_units", "on_hand_value"]];
for (const ym of salesMonths) {
  for (const it of items) {
    const onHand = Math.max(0, Math.round(it.base * 0.9 * jitter(0.25)));
    invRows.push([ym, it.item_id, onHand, Math.round(onHand * it.unit_cost)]);
  }
}

const itemRows = [["item_id", "name", "category", "unit_cost", "unit_price"],
  ...items.map((it) => [it.item_id, it.name, it.category, it.unit_cost, it.unit_price])];

// --- budget / AOP (G3): budgeted revenue by category × month ---
const byId = Object.fromEntries(items.map((it) => [it.item_id, it]));
const budgetRows = [["month", "family", "budget_revenue"]];
for (const ym of salesMonths) {
  const byCat = {};
  for (const it of items) {
    const planned = Math.round(it.base * seasonal(it.season, ym) * bias[it.item_id]);
    byCat[it.category] = (byCat[it.category] ?? 0) + planned * it.unit_price;
  }
  for (const [cat, val] of Object.entries(byCat)) budgetRows.push([ym, cat, Math.round(val * jitter(0.06))]);
}

// --- portfolio (G1): a couple of NPI / EOL events ---
const portfolioRows = [
  ["item", "type", "start_month", "ramp_months", "peak_units", "cannibalizes"],
  ["ESP-COLD", "NPI", "2026-03", 4, 800, "COLD-BREW"],
  ["FIL-250", "EOL", "2026-05", 3, 0, ""],
];
void byId;

const toCsv = (rows) => rows.map((r) => r.join(",")).join("\n") + "\n";
writeFileSync(join(here, "items.csv"), toCsv(itemRows));
writeFileSync(join(here, "sales.csv"), toCsv(salesRows));
writeFileSync(join(here, "plan.csv"), toCsv(planRows));
writeFileSync(join(here, "inventory.csv"), toCsv(invRows));
writeFileSync(join(here, "budget.csv"), toCsv(budgetRows));
writeFileSync(join(here, "portfolio.csv"), toCsv(portfolioRows));

console.log(`items.csv: ${itemRows.length - 1} rows`);
console.log(`sales.csv: ${salesRows.length - 1} rows`);
console.log(`plan.csv: ${planRows.length - 1} rows`);
console.log(`inventory.csv (held back): ${invRows.length - 1} rows`);
console.log(`budget.csv: ${budgetRows.length - 1} rows`);
console.log(`portfolio.csv: ${portfolioRows.length - 1} rows`);
