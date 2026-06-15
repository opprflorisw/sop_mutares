// One-off: seed the demo users + Sealings project/files into the
// Convex dev deployment via the public ensureSeed mutation. Mirrors
// the browser SeedGate so the data is present without opening the app.
//
//   node scripts/seed-convex.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// URL: http arg wins (e.g. prod), else VITE_CONVEX_URL from .env.local (dev).
// Pass --reset to wipe existing users/projects before seeding.
const env = readFileSync(join(root, ".env.local"), "utf8");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) || env.match(/VITE_CONVEX_URL=(.+)/)?.[1].trim();
const RESET = process.argv.includes("--reset");
if (!url) throw new Error("Provide a Convex URL (arg) or set VITE_CONVEX_URL in .env.local");
console.log(`Seeding ${url}${RESET ? " (reset)" : ""}`);

const TIME_FIELDS = {
  sales_history: "date",
  demand_forecast: "date",
  inventory: "date",
  capacity: "date",
};
const BASE_TEMPLATE_IDS = [
  "sku_master", "customer_master", "plant_master", "sales_history",
  "demand_forecast", "bom", "inventory", "capacity",
];

const BG = {
  sealings:
    "SFC Solutions India makes automotive sealing systems for Indian OEMs (TML, Maruti, Tata, M&M, Nissan, VW) across five plants. This is the real Mutares S&OP cadence: a monthly ICP (consensus plan) drives demand, an RCCP balances it against extrusion/mixing capacity, and the review pack tracks inventory, forecast accuracy & BIAS, and gap-closing actions. The Dec'22 baseline is ₹35.56 Cr. Watch the demand-vs-supply gap by family, forecast bias by SKU, and the inventory projection.",
  electrotech:
    "ElectroTech Industries builds connected devices (smart-home hubs, industrial controllers, power modules, sensors) for EU B2B/B2C customers from three plants. The Karlsruhe SMT line is the bottleneck, and a Shenzhen capacitor supplier with a long lead time and weak reliability is the key material risk. A whole month (Nov-2022) is deliberately missing from sales history — a data-quality gap to exercise the AI data check. Watch the capacity overload and the data-gap flag in the Data Manager.",
  apex:
    "Apex Brake Systems is a Tier-1 brake manufacturer in México, carved out of a larger group and now run as a standalone turnaround. The 2024 plan is dominated by one shock: a major EV customer (VoltAuto) has ramped regenerative-braking caliper orders far faster than Monterrey can build them — both CNC cells are already over 100%, so a chunk of that demand is unmet and at risk. Meanwhile the legacy Drum Brakes business in Toluca is shrinking, yet the team keeps over-forecasting it and has built a mountain of finished drums (including a fully discontinued shoe) — inventory days there are an order of magnitude above target. A single Asian supplier for the ABS chip used in the new calipers has a 40-day lead time and weak reliability, putting the whole EV ramp at risk. Watch: the EV gap and its costed options (Supply), the Monterrey overload (Capacity), the drum over-forecast (Demand), and the Toluca SLOB + supplier risk.",
  helios:
    "Helios Pumps & Compressors is an Italian industrial-equipment maker with three plants (Milan, Turin, Bologna). It's a classic mix-and-margin story: the big-volume Centrifugal Pumps line earns barely 16% contribution margin, while Vacuum Compressors (~45%) and Spare-Parts Kits (~53%) are far more profitable. Two things stand out this cycle. First, the only real supply gap sits on the low-margin pumps in Milan — so the question is whether it's even worth chasing. Second, the high-margin Vacuum Compressors in Turin are growing but being consistently under-forecast, leaving revenue and margin on the table; Turin also runs at ~99% of its planned capacity (though still under the physical ceiling), so any upside needs a capacity conversation. There's also a discontinued seal kit quietly tying up cash in Bologna, and the motor that feeds the profitable vacuum line comes from a single shaky supplier. Watch: contribution margin by family and the plan bridge (Demand), the dual-capacity view in Turin (Capacity), and SLOB + supplier risk (Supply).",
};

const SCENARIOS = [
  {
    dir: "sealings",
    project: {
      name: "SFC India — Sealings",
      industry: "Automotive (Sealings)",
      factory: "5 plants · Bawal, Manesar, Chennai, Sanand, Sahibabad",
      description: "Automotive sealing systems for Indian OEMs (TML, Maruti, Tata, M&M, Nissan, VW). Dec'22 ICP baseline ₹35.56 Cr across 5 plants.",
      background: BG.sealings,
      currency: "INR",
    },
  },
  {
    dir: "electrotech",
    project: {
      name: "ElectroTech Industries — EU",
      industry: "Electronics manufacturing",
      factory: "3 plants · Lyon, Karlsruhe, Berlin",
      description: "Connected-device electronics maker (smart-home hubs, industrial controllers, power modules, sensors) for EU B2B/B2C customers. Capacitor supply from Shenzhen is a key risk.",
      background: BG.electrotech,
      currency: "EUR",
    },
  },
  {
    dir: "apex",
    withSupplier: true,
    project: {
      name: "Apex Brake Systems — México",
      industry: "Automotive (Braking)",
      factory: "4 plants · Monterrey, San Luis Potosí, Toluca, Querétaro",
      description: "Tier-1 brake maker mid-turnaround. EV caliper demand is outrunning Monterrey's capacity while a declining drum business piles up obsolete stock in Toluca.",
      background: BG.apex,
      currency: "USD",
    },
  },
  {
    dir: "helios",
    withSupplier: true,
    project: {
      name: "Helios Pumps & Compressors — Italy",
      industry: "Industrial equipment",
      factory: "3 plants · Milan, Turin, Bologna",
      description: "Pumps & compressors maker with a wide margin spread — the high-revenue pumps earn ~16% while the under-forecast vacuum line earns ~45%.",
      background: BG.helios,
      currency: "EUR",
    },
  },
];

function parse(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((l) => {
    const cells = l.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? "").trim()]));
  });
  return { headers, rows };
}
const mIdx = (p) => { const [y, m] = p.split("-").map(Number); return y * 12 + (m - 1); };
const mFrom = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;

function analyze(templateId, text) {
  const { rows } = parse(text);
  const dateField = TIME_FIELDS[templateId];
  let coverage, status = "valid", issues = [];
  if (dateField) {
    const periods = [...new Set(rows.map((r) => r[dateField]?.slice(0, 7)).filter(Boolean))].sort();
    if (periods.length >= 2) {
      const idx = periods.map(mIdx);
      const diffs = idx.slice(1).map((v, i) => v - idx[i]);
      const counts = new Map();
      let step = diffs[0];
      for (const d of diffs) {
        const c = (counts.get(d) ?? 0) + 1;
        counts.set(d, c);
        if (c > (counts.get(step) ?? 0)) step = d;
      }
      if (step <= 0) step = 1;
      const missing = [];
      for (let i = 1; i < idx.length; i++) {
        const gap = idx[i] - idx[i - 1];
        if (gap > step) for (let k = step; k < gap; k += step) missing.push(mFrom(idx[i - 1] + k));
      }
      coverage = { start: periods[0], end: periods[periods.length - 1], missing };
      if (missing.length) {
        status = "warning";
        issues.push(`Time gap: missing ${missing.length} period(s) — ${missing.join(", ")}`);
      }
    }
  }
  return { rows: rows.length, status, issues, coverage };
}

const projectsPayload = SCENARIOS.map((sc) => {
  const templateIds = sc.withSupplier ? [...BASE_TEMPLATE_IDS, "supplier"] : BASE_TEMPLATE_IDS;
  const files = templateIds.map((templateId) => {
    const content = readFileSync(join(root, "src", "sample-data", sc.dir, `${templateId}.csv`), "utf8");
    const a = analyze(templateId, content);
    return { templateId, fileName: `${templateId}.csv`, content, ...a };
  });
  return { ...sc.project, files };
});

const users = [
  { name: "Floris", email: "floris@oppr.ai", role: "Admin", password: "12345678" },
  { name: "Sanchay", email: "sanchay@oppr.ai", role: "Admin", password: "12345678" },
];

const client = new ConvexHttpClient(url);

if (RESET) {
  const existingProjects = await client.query(api.projects.listWithFiles, {});
  for (const p of existingProjects) await client.mutation(api.projects.remove, { id: p.id });
  const existingUsers = await client.query(api.users.list, {});
  for (const u of existingUsers) await client.mutation(api.users.remove, { id: u.id });
}

await client.mutation(api.projects.ensureSeed, { users, projects: projectsPayload });
const out = await client.query(api.projects.listWithFiles, {});
const userList = await client.query(api.users.list, {});
console.log(`Seeded. Users: ${userList.length}. Projects: ${out.length}.`);
for (const p of out) {
  console.log(`  ${p.name} (${p.currency}) — ${p.files.length} files`);
}
