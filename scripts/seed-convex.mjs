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

// read VITE_CONVEX_URL from .env.local
const env = readFileSync(join(root, ".env.local"), "utf8");
const url = env.match(/VITE_CONVEX_URL=(.+)/)?.[1].trim();
if (!url) throw new Error("VITE_CONVEX_URL not found in .env.local");

const TIME_FIELDS = {
  sales_history: "date",
  demand_forecast: "date",
  inventory: "date",
  capacity: "date",
};
const TEMPLATE_IDS = [
  "sku_master", "customer_master", "plant_master", "sales_history",
  "demand_forecast", "bom", "inventory", "capacity",
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

const files = TEMPLATE_IDS.map((templateId) => {
  const content = readFileSync(join(root, "src", "sample-data", "sealings", `${templateId}.csv`), "utf8");
  const a = analyze(templateId, content);
  return { templateId, fileName: `${templateId}.csv`, content, ...a };
});

const payload = {
  users: [
    { name: "Floris", email: "floris@oppr.ai", role: "Admin", password: "12345678" },
    { name: "Sanchay", email: "sanchay@oppr.ai", role: "Admin", password: "12345678" },
  ],
  project: {
    name: "SFC India — Sealings",
    industry: "Automotive (Sealings)",
    factory: "5 plants · Bawal, Manesar, Chennai, Sanand, Sahibabad",
    description:
      "Automotive sealing systems for Indian OEMs (TML, Maruti, Tata, M&M, Nissan, VW). Dec'22 ICP baseline ₹35.56 Cr across 5 plants.",
    currency: "INR",
  },
  files,
};

const client = new ConvexHttpClient(url);

// reset first so re-running the seed reflects the latest sample data
const existingProjects = await client.query(api.projects.listWithFiles, {});
for (const p of existingProjects) await client.mutation(api.projects.remove, { id: p.id });
const existingUsers = await client.query(api.users.list, {});
for (const u of existingUsers) await client.mutation(api.users.remove, { id: u.id });

await client.mutation(api.projects.ensureSeed, payload);
const projects = await client.query(api.projects.listWithFiles, {});
const users = await client.query(api.users.list, {});
console.log(`Seeded. Users: ${users.length}. Projects: ${projects.length}.`);
for (const p of projects) {
  console.log(`  ${p.name} — ${p.files.length} files`);
  for (const f of p.files) {
    const v = f.versions.find((x) => x.id === f.activeVersionId);
    console.log(`    ${f.templateId.padEnd(16)} v${v.version} ${v.rows} rows [${v.status}]`);
  }
}
