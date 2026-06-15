// Generates two RICH demo scenarios designed to light up the dashboard's
// exception flags, into src/sample-data/apex and src/sample-data/helios.
//
//   node scripts/gen-extra-scenarios.mjs
//
// Each scenario is engineered so the tool surfaces specific, teachable
// problems (see the `flags` notes per scenario below). Forecast is derived
// from the prior-year actual × a per-SKU multiplier, so the YoY accuracy /
// BIAS proxy in the tool produces the intended over/under-forecast signals.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- helpers ----------
const pad = (m) => String(m).padStart(2, "0");
function months(sy, sm, count) {
  const out = []; let y = sy, m = sm;
  for (let i = 0; i < count; i++) { out.push(`${y}-${pad(m)}-01`); if (++m > 12) { m = 1; y++; } }
  return out;
}
const ym = (d) => d.slice(0, 7);
const priorYear = (yyyymm) => { const [y, m] = yyyymm.split("-"); return `${+y - 1}-${m}`; };
const round = (n) => Math.round(n);
const seasonal = (i, amp = 0.12) => 1 + amp * Math.sin(((i + 1) * Math.PI) / 6);
const toCsv = (h, rows) => [h.join(","), ...rows.map((r) => r.join(","))].join("\n") + "\n";

function gen(cfg) {
  const OUT = join(__dirname, "..", "src", "sample-data", cfg.dir);
  mkdirSync(OUT, { recursive: true });
  const write = (name, content) => {
    writeFileSync(join(OUT, name), content, "utf8");
    console.log(`  ${(cfg.dir + "/" + name).padEnd(34)} ${content.trim().split("\n").length - 1} rows`);
  };

  // history window + forecast window (forecast year = history year + 1 for the
  // overlapping months, so prior-year actuals always exist for the proxy).
  const HIST = months(cfg.histStart[0], cfg.histStart[1], cfg.histMonths); // e.g. 18
  const FC = months(cfg.fcStart[0], cfg.fcStart[1], 12);

  // ---- masters ----
  write("sku_master.csv", toCsv(
    ["sku", "description", "family", "uom", "plant", "std_cost", "price"],
    cfg.skus.map((s) => [s.sku, s.desc, s.family, s.uom ?? "pcs", s.plant, s.cost, s.price])
  ));
  write("customer_master.csv", toCsv(["customer", "region", "channel", "segment"], cfg.customers));
  write("plant_master.csv", toCsv(
    ["plant", "name", "location", "capacity_minutes", "target_inv_days"],
    cfg.plants.map((p) => [p.code, p.name, p.loc, p.capMin, p.targetDays])
  ));

  // ---- sales history (actuals) ----  build a lookup for the forecast step
  const salesByKey = new Map(); // `${sku}|${YYYY-MM}` -> qty
  {
    const rows = [];
    HIST.forEach((date, i) => {
      if (cfg.gapMonth && date === cfg.gapMonth) return; // deliberate data gap
      cfg.skus.forEach((s) => {
        if (s.discontinued) return; // discontinued SKU has no sales
        // trend: linear toward end-of-history level via s.trend (per-month factor)
        const trend = Math.pow(s.trend ?? 1, i);
        const qty = round(s.base * trend * seasonal(i, s.amp ?? 0.12));
        if (qty <= 0) return;
        salesByKey.set(`${s.sku}|${ym(date)}`, qty);
        rows.push([date, s.sku, s.customer, s.plant, qty, round(qty * s.price)]);
      });
    });
    write("sales_history.csv", toCsv(["date", "sku", "customer", "plant", "qty", "revenue"], rows));
  }

  // ---- demand forecast (baseline) ----  derived from prior-year actual × fcMult
  {
    const rows = [];
    FC.forEach((date) => {
      const pm = priorYear(ym(date));
      cfg.skus.forEach((s) => {
        if (s.discontinued) return; // no forward demand for discontinued
        const prior = salesByKey.get(`${s.sku}|${pm}`) ?? s.base;
        const qty = round(prior * (s.fcMult ?? 1.05));
        if (qty <= 0) return;
        rows.push([date, s.sku, s.customer, s.plant, qty]);
      });
    });
    write("demand_forecast.csv", toCsv(["date", "sku", "customer", "plant", "baseline_qty"], rows));
  }

  // ---- BOM + suppliers ----
  write("bom.csv", toCsv(
    ["parent_sku", "component", "qty_per", "supplier", "lead_time_days", "unit_cost"], cfg.bom
  ));
  write("supplier.csv", toCsv(
    ["supplier", "component", "lead_time_days", "reliability", "moq"], cfg.suppliers
  ));

  // ---- inventory snapshots ----  qty + value per plant/sku/category
  {
    const snaps = cfg.invSnaps;
    const rows = [];
    snaps.forEach((date, si) => {
      const drift = 1 + (cfg.invDrift ?? 0.03) * si;
      cfg.inventory.forEach((p) => {
        const mk = (cat, qty, val) => { if (qty > 0) rows.push([date, p.plant, p.sku, cat, round(qty * (cat === "FG" ? drift : 1)), round(val * (cat === "FG" ? drift : 1))]); };
        mk("RM", p.rmQty, p.rmVal);
        mk("WIP", p.wipQty, p.wipVal);
        mk("FG", p.fgQty, p.fgVal);
      });
    });
    write("inventory.csv", toCsv(["date", "plant", "sku", "category", "qty", "value"], rows));
  }

  // ---- capacity (RCCP) ----  per line over the history window
  {
    const rows = [];
    HIST.forEach((date, i) => {
      cfg.lines.forEach((l) => {
        // overloaded lines stay overloaded across the window; latest month (i last) ~neutral
        const req = round(l.req * seasonal(i, 0.06));
        rows.push([date, l.plant, l.line, l.avail, req]);
      });
    });
    write("capacity.csv", toCsv(["date", "plant", "resource", "available_min", "required_min"], rows));
  }

  console.log(`Done → src/sample-data/${cfg.dir}/\n`);
}

// ============================================================
// SCENARIO A — Apex Brake Systems (México, USD)
// A turnaround under a demand shock. Flags the tool should surface:
//  • EV Regen Calipers: demand surge MTY can't supply → gap + revenue at risk
//  • MTY CNC cells > 100% (two overloaded lines)
//  • Drum Brakes Legacy: over-forecast (high MAPE, +BIAS) while declining
//  • Toluca: FG pile-up → very high inventory days, low turns
//  • SLOB: discontinued DR-900 (obsolete) + slow drum FG
//  • Single-source ABS chip from Asia: low reliability + 40-day lead (critical)
//  • Data gap: 2023-09 missing from sales history
// ============================================================
gen({
  dir: "apex",
  histStart: [2023, 1], histMonths: 18, // 2023-01 .. 2024-06
  fcStart: [2024, 7], // 2024-07 .. 2025-06
  gapMonth: "2023-09-01",
  invSnaps: ["2023-12-01", "2024-03-01", "2024-06-01"],
  invDrift: 0.05,
  skus: [
    // EV Regen Calipers — surging, on the constrained plant (MTY)
    { sku: "RC-EV1", desc: "Regen Caliper EV Front", family: "EV Regen Calipers", plant: "MTY", customer: "VoltAuto", cost: 96, price: 168, base: 4200, trend: 1.035, fcMult: 1.28 },
    { sku: "RC-EV2", desc: "Regen Caliper EV Rear", family: "EV Regen Calipers", plant: "MTY", customer: "VoltAuto", cost: 88, price: 152, base: 3000, trend: 1.03, fcMult: 1.25 },
    // Disc Brake Pads — healthy core (SLP)
    { sku: "DP-100", desc: "Disc Pad Standard", family: "Disc Brake Pads", plant: "SLP", customer: "RutaTruck", cost: 11, price: 19, base: 9000, trend: 1.005, fcMult: 1.06 },
    { sku: "DP-140", desc: "Disc Pad Ceramic", family: "Disc Brake Pads", plant: "SLP", customer: "AutoNoreste", cost: 16, price: 28, base: 7000, trend: 1.01, fcMult: 1.08 },
    { sku: "DP-160", desc: "Disc Pad HD Fleet", family: "Disc Brake Pads", plant: "SLP", customer: "RutaTruck", cost: 21, price: 34, base: 5200, trend: 1.02, fcMult: 0.82 }, // under-forecast
    // Drum Brakes Legacy — declining + over-forecast + SLOB (TOL)
    { sku: "DR-200", desc: "Drum Brake 9in", family: "Drum Brakes Legacy", plant: "TOL", customer: "ClasicoParts", cost: 14, price: 23, base: 6000, trend: 0.965, fcMult: 1.34 }, // over-forecast
    { sku: "DR-240", desc: "Drum Brake 10in", family: "Drum Brakes Legacy", plant: "TOL", customer: "ClasicoParts", cost: 17, price: 27, base: 4000, trend: 0.95, fcMult: 1.22 },
    { sku: "DR-900", desc: "Drum Shoe (discontinued)", family: "Drum Brakes Legacy", plant: "TOL", customer: "ClasicoParts", cost: 9, price: 16, base: 0, discontinued: true }, // obsolete stock
    // Hydraulic Actuators — steady (QRO)
    { sku: "HA-300", desc: "Brake Master Cylinder", family: "Hydraulic Actuators", plant: "QRO", customer: "IndustriaMX", cost: 31, price: 52, base: 2600, trend: 1.01, fcMult: 1.05 },
    { sku: "HA-360", desc: "Hydraulic Booster", family: "Hydraulic Actuators", plant: "QRO", customer: "IndustriaMX", cost: 44, price: 74, base: 2100, trend: 1.015, fcMult: 1.07 },
  ],
  customers: [
    ["VoltAuto", "North America", "OEM", "EV"],
    ["RutaTruck", "México", "OEM", "Commercial"],
    ["AutoNoreste", "México", "OEM", "Passenger"],
    ["ClasicoParts", "México", "Aftermarket", "Legacy"],
    ["IndustriaMX", "México", "B2B", "Industrial"],
    ["FleetServ", "North America", "Aftermarket", "Fleet"],
  ],
  plants: [
    { code: "MTY", name: "Monterrey", loc: "Monterrey, MX", capMin: 57600, targetDays: 35 },
    { code: "SLP", name: "San Luis Potosí", loc: "San Luis Potosí, MX", capMin: 57600, targetDays: 35 },
    { code: "TOL", name: "Toluca", loc: "Toluca, MX", capMin: 28800, targetDays: 35 },
    { code: "QRO", name: "Querétaro", loc: "Querétaro, MX", capMin: 25200, targetDays: 35 },
  ],
  lines: [
    { plant: "MTY", line: "CNC-Cell-1", avail: 28800, req: 33400 }, // overload
    { plant: "MTY", line: "CNC-Cell-2", avail: 28800, req: 31200 }, // overload → MTY util ~1.12
    { plant: "SLP", line: "Press-1", avail: 28800, req: 24200 },
    { plant: "SLP", line: "Press-2", avail: 28800, req: 21600 },
    { plant: "TOL", line: "Drum-Line-1", avail: 28800, req: 12800 }, // spare (declining)
    { plant: "QRO", line: "Assy-1", avail: 25200, req: 21000 },
  ],
  bom: [
    ["RC-EV1", "ABS-CHIP", 1, "SUP-ASIA", 40, 22.0],
    ["RC-EV1", "CAL-CAST", 1, "SUP-FUNDI", 18, 28.0],
    ["RC-EV2", "ABS-CHIP", 1, "SUP-ASIA", 40, 22.0],
    ["DP-100", "FRICTION-MIX", 1, "SUP-FRIC", 12, 3.1],
    ["DP-140", "FRICTION-MIX", 1, "SUP-FRIC", 12, 3.1],
    ["DR-200", "STEEL-COIL", 2, "SUP-ACERO", 16, 4.4],
    ["HA-300", "ALU-FORGE", 1, "SUP-FUNDI", 18, 12.5],
  ],
  suppliers: [
    ["SUP-ASIA", "ABS-CHIP", 40, 81, 20000], // single-source, long lead, low reliability → critical
    ["SUP-FUNDI", "CAL-CAST", 18, 94, 4000],
    ["SUP-FRIC", "FRICTION-MIX", 12, 97, 8000],
    ["SUP-ACERO", "STEEL-COIL", 16, 90, 10000], // high
    ["SUP-FUNDI", "ALU-FORGE", 18, 94, 3000],
  ],
  inventory: [
    // MTY — selling out (low FG), EV ramp
    { plant: "MTY", sku: "RC-EV1", rmQty: 9000, rmVal: 198000, wipQty: 2600, wipVal: 78000, fgQty: 1200, fgVal: 110000 },
    // SLP — healthy
    { plant: "SLP", sku: "DP-100", rmQty: 60000, rmVal: 90000, wipQty: 14000, wipVal: 42000, fgQty: 22000, fgVal: 165000 },
    // TOL — FG pile-up on a DECLINING family → very high days + slow SLOB
    { plant: "TOL", sku: "DR-200", rmQty: 30000, rmVal: 132000, wipQty: 8000, wipVal: 56000, fgQty: 41000, fgVal: 690000 },
    { plant: "TOL", sku: "DR-240", rmQty: 18000, rmVal: 92000, wipQty: 4000, wipVal: 34000, fgQty: 23000, fgVal: 430000 },
    { plant: "TOL", sku: "DR-900", rmQty: 0, rmVal: 0, wipQty: 0, wipVal: 0, fgQty: 9000, fgVal: 121000 }, // OBSOLETE (no sales)
    // QRO — steady
    { plant: "QRO", sku: "HA-300", rmQty: 12000, rmVal: 168000, wipQty: 3000, wipVal: 66000, fgQty: 5000, fgVal: 198000 },
  ],
});

// ============================================================
// SCENARIO B — Helios Pumps & Compressors (Italy, EUR)
// A margin / mix story. Flags the tool should surface:
//  • Contribution margin spread: Centrifugal Pumps ~17% vs Vacuum Compressors
//    ~45% vs Spare Parts ~53% — the high-revenue line earns the least
//  • The supply gap sits on the LOW-margin Centrifugal Pumps (Milan)
//  • Turin running 95–100% of the PLANNED level but under the MAC (amber) —
//    the dual-capacity nuance
//  • Vacuum Compressors under-forecast (−BIAS) while growing → revenue upside
//  • SLOB: discontinued SPK-OLD seal kit (obsolete)
//  • Motor supplier (critical) feeding the high-margin Vacuum line
// ============================================================
gen({
  dir: "helios",
  histStart: [2023, 1], histMonths: 18,
  fcStart: [2024, 7],
  invSnaps: ["2023-12-01", "2024-03-01", "2024-06-01"],
  invDrift: 0.02,
  skus: [
    // Centrifugal Pumps — high revenue, LOW margin (Milan, slightly constrained)
    { sku: "CP-100", desc: "Centrifugal Pump 50m³", family: "Centrifugal Pumps", plant: "MIL", customer: "AcquaCivile", cost: 1980, price: 2400, base: 1800, trend: 1.004, fcMult: 1.05 },
    { sku: "CP-140", desc: "Centrifugal Pump 120m³", family: "Centrifugal Pumps", plant: "MIL", customer: "AcquaCivile", cost: 2700, price: 3200, base: 1400, trend: 1.006, fcMult: 1.07 },
    // Vacuum Compressors — HIGH margin, growing, UNDER-forecast (Turin, tight planned)
    { sku: "VC-200", desc: "Vacuum Compressor V2", family: "Vacuum Compressors", plant: "TUR", customer: "PharmaNord", cost: 4800, price: 8800, base: 600, trend: 1.03, fcMult: 0.84 },
    { sku: "VC-240", desc: "Vacuum Compressor V4", family: "Vacuum Compressors", plant: "TUR", customer: "ChemItalia", cost: 6600, price: 12000, base: 420, trend: 1.035, fcMult: 0.86 },
    // Spare Parts Kits — high margin, lumpy (Bologna) + one obsolete
    { sku: "SP-300", desc: "Seal & Bearing Kit", family: "Spare Parts Kits", plant: "BOL", customer: "ServiceEU", cost: 150, price: 320, base: 2200, trend: 1.0, fcMult: 1.04, amp: 0.28 },
    { sku: "SP-340", desc: "Impeller Repair Kit", family: "Spare Parts Kits", plant: "BOL", customer: "ServiceEU", cost: 130, price: 280, base: 1500, trend: 1.0, fcMult: 1.03, amp: 0.3 },
    { sku: "SPK-OLD", desc: "Legacy Seal Kit (discontinued)", family: "Spare Parts Kits", plant: "BOL", customer: "ServiceEU", cost: 120, price: 250, base: 0, discontinued: true }, // obsolete
    // Booster Sets — seasonal (Bologna)
    { sku: "BS-400", desc: "Pressure Booster Set", family: "Booster Sets", plant: "BOL", customer: "EdiliziaSpA", cost: 3600, price: 5400, base: 300, trend: 1.01, fcMult: 1.06, amp: 0.35 },
  ],
  customers: [
    ["AcquaCivile", "Italy", "B2B", "Municipal water"],
    ["PharmaNord", "EU", "B2B", "Pharma"],
    ["ChemItalia", "Italy", "B2B", "Chemicals"],
    ["ServiceEU", "EU", "Aftermarket", "Service"],
    ["EdiliziaSpA", "Italy", "B2B", "Construction"],
    ["OEMPartner", "EU", "OEM", "OEM"],
  ],
  plants: [
    { code: "MIL", name: "Milan", loc: "Milano, IT", capMin: 57600, targetDays: 45 },
    { code: "TUR", name: "Turin", loc: "Torino, IT", capMin: 28800, targetDays: 45 },
    { code: "BOL", name: "Bologna", loc: "Bologna, IT", capMin: 50400, targetDays: 45 },
  ],
  lines: [
    { plant: "MIL", line: "Machining-1", avail: 28800, req: 32600 }, // overload; with Assembly pushes MIL plant > 100% → Centrifugal gap (low margin)
    { plant: "MIL", line: "Assembly-1", avail: 28800, req: 27900 },   // MIL total 60500 / 57600 ≈ 105%
    { plant: "TUR", line: "Clean-Assembly", avail: 28800, req: 24200 }, // ~84% MAC → ~99% of planned (amber), under the ceiling
    { plant: "BOL", line: "Kitting-1", avail: 25200, req: 18800 },
    { plant: "BOL", line: "Test-1", avail: 25200, req: 16200 },
  ],
  bom: [
    ["CP-100", "PUMP-CAST", 1, "SUP-CAST", 24, 640],
    ["CP-140", "PUMP-CAST", 1, "SUP-CAST", 24, 880],
    ["VC-200", "VAC-MOTOR", 1, "SUP-MOT", 32, 1700],
    ["VC-240", "VAC-MOTOR", 1, "SUP-MOT", 32, 2100],
    ["SP-300", "SEAL-SET", 1, "SUP-SEAL", 10, 42],
    ["BS-400", "PUMP-CAST", 1, "SUP-CAST", 24, 540],
  ],
  suppliers: [
    ["SUP-CAST", "PUMP-CAST", 24, 90, 200], // high (long-ish lead)
    ["SUP-MOT", "VAC-MOTOR", 32, 86, 50], // critical — feeds the high-margin Vacuum line
    ["SUP-SEAL", "SEAL-SET", 10, 98, 1000],
  ],
  inventory: [
    // Milan — moderate
    { plant: "MIL", sku: "CP-100", rmQty: 900, rmVal: 1782000, wipQty: 260, wipVal: 514000, fgQty: 320, fgVal: 768000 },
    // Turin — LOW inventory (selling fast, under-forecast)
    { plant: "TUR", sku: "VC-200", rmQty: 120, rmVal: 576000, wipQty: 40, wipVal: 192000, fgQty: 28, fgVal: 246000 },
    // Bologna — healthy spares + one obsolete
    { plant: "BOL", sku: "SP-300", rmQty: 4000, rmVal: 600000, wipQty: 600, wipVal: 90000, fgQty: 2600, fgVal: 832000 },
    { plant: "BOL", sku: "SPK-OLD", rmQty: 0, rmVal: 0, wipQty: 0, wipVal: 0, fgQty: 3200, fgVal: 384000 }, // OBSOLETE (no sales)
  ],
});

console.log("All extra scenarios generated.");
