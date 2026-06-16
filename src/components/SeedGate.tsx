import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SEALINGS_CSV } from "../lib/sampleSealings";
import { ELECTROTECH_CSV } from "../lib/sampleElectrotech";
import { APEX_CSV } from "../lib/sampleApex";
import { HELIOS_CSV } from "../lib/sampleHelios";
import { DEMO_ELECTRONICS_CSV } from "../lib/sampleDemoElectronics";
import { SCENARIO_BACKGROUNDS } from "../lib/scenarioBackgrounds";
import { getTemplate } from "../lib/templates";
import { analyzeCsv } from "../lib/projects";
import type { PlacedWidget } from "../lib/dashboards";

// Idempotently seeds the demo accounts + both demo scenarios into
// Convex on first run. ensureSeed only inserts what's missing (users by
// email, projects by name), so running it repeatedly is safe.

function buildFiles(csvMap: Record<string, string>) {
  return Object.entries(csvMap).map(([templateId, content]) => {
    const t = getTemplate(templateId)!;
    const a = analyzeCsv(t, content);
    return { templateId, fileName: `${templateId}.csv`, content, rows: a.rows, status: a.status, issues: a.issues, coverage: a.coverage };
  });
}

// ---- demo dashboard layouts (mirror Varun's references, in our framework) ----
const pw = (widgetId: string, w: number, h: number, config?: Record<string, unknown>): PlacedWidget => ({ widgetId, w, h, config });
const kpi = (metric: string): PlacedWidget => ({ widgetId: "stat", w: 2, h: 1, config: { metric } });
const DEMO_DASHBOARDS = [
  {
    name: "Executive scorecard", icon: "dashboard", page: "overview",
    description: "Board-level supply-chain scorecard — six RAG categories vs target.",
    widgets: [pw("scorecard", 12, 5), pw("decisions", 12, 3)],
  },
  {
    name: "Exec S&OP summary", icon: "dashboard", page: "overview",
    description: "The monthly one-glance: KPIs, demand/supply, capacity options and forecast vs budget.",
    widgets: [
      kpi("revenue"), kpi("budgetAttain"), kpi("accuracy"), kpi("invDays"), kpi("capacity"), kpi("revenueAtRisk"),
      pw("revenue-trend", 8, 3), pw("customer-mix", 4, 3),
      pw("capacity-scenarios", 8, 3), pw("issues", 4, 3),
      pw("budget-forecast", 12, 4),
    ],
  },
  {
    name: "S&OP process", icon: "bolt", page: "overview",
    description: "The monthly cycle — activities, owners and the by-month checklist.",
    widgets: [pw("process-tracker", 12, 4), pw("decisions", 12, 3)],
  },
  {
    name: "Forecast & accuracy", icon: "chart", page: "demand",
    description: "Forecast accuracy & BIAS, accuracy vs revenue, and forecast vs budget with manual override.",
    widgets: [
      kpi("accuracy"), kpi("bias"), kpi("revenue"), kpi("budgetAttain"),
      pw("accuracy-table", 12, 4),
      pw("accuracy-scatter", 8, 3), pw("customer-mix", 4, 3),
      pw("budget-forecast", 12, 4),
    ],
  },
  {
    name: "Capacity balance", icon: "box", page: "capacity",
    description: "Unconstrained vs constrained load across the network, with named capacity options.",
    widgets: [
      kpi("capacity"), kpi("plannedCapacity"), kpi("overloaded"), kpi("revenueAtRisk"),
      pw("capacity-balance", 12, 4),
      pw("capacity-lines", 12, 3),
      pw("capacity-scenarios", 8, 3), pw("issues", 4, 3),
    ],
  },
  {
    name: "Supply & inventory", icon: "factory", page: "supply",
    description: "The gap, inventory health, SLOB and supplier risk.",
    widgets: [
      kpi("revenueAtRisk"), kpi("invTurns"), kpi("slob"), kpi("overloaded"),
      pw("gap-table", 12, 2),
      pw("inventory-plants", 6, 3), pw("inventory-projection", 6, 2),
      pw("slob", 6, 2), pw("mrp-risk", 6, 2),
    ],
  },
];

export default function SeedGate() {
  const ensureSeed = useMutation(api.projects.ensureSeed);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const users = [
      { name: "Floris", email: "floris@oppr.ai", role: "Admin" as const, password: "12345678" },
      { name: "Sanchay", email: "sanchay@oppr.ai", role: "Admin" as const, password: "12345678" },
    ];
    const projects = [
      {
        name: "Nordic Smart Home Electronics — EU",
        industry: "Electronics manufacturing",
        factory: "5 sites · Tallinn, Kraków, Porto, Munich, Gdańsk",
        description: "Showcase scenario: a connected-device maker across 5 facilities. Site A (Tallinn) SMT is the binding constraint, several SKUs carry poor forecast BIAS, FG inventory is above target, and the WiFi/BT combo module is the key supply risk. Built to mirror the full S&OP cycle.",
        background: SCENARIO_BACKGROUNDS["Nordic Smart Home Electronics — EU"],
        currency: "EUR",
        files: buildFiles(DEMO_ELECTRONICS_CSV),
        dashboards: DEMO_DASHBOARDS,
      },
      {
        name: "SFC India — Sealings",
        industry: "Automotive (Sealings)",
        factory: "5 plants · Bawal, Manesar, Chennai, Sanand, Sahibabad",
        description: "Automotive sealing systems for Indian OEMs (TML, Maruti, Tata, M&M, Nissan, VW). Dec'22 ICP baseline ₹35.56 Cr across 5 plants.",
        background: SCENARIO_BACKGROUNDS["SFC India — Sealings"],
        currency: "INR",
        files: buildFiles(SEALINGS_CSV),
      },
      {
        name: "ElectroTech Industries — EU",
        industry: "Electronics manufacturing",
        factory: "3 plants · Lyon, Karlsruhe, Berlin",
        description: "Connected-device electronics maker (smart-home hubs, industrial controllers, power modules, sensors) for EU B2B/B2C customers. Capacitor supply from Shenzhen is a key risk.",
        background: SCENARIO_BACKGROUNDS["ElectroTech Industries — EU"],
        currency: "EUR",
        files: buildFiles(ELECTROTECH_CSV),
      },
      {
        name: "Apex Brake Systems — México",
        industry: "Automotive (Braking)",
        factory: "4 plants · Monterrey, San Luis Potosí, Toluca, Querétaro",
        description: "Tier-1 brake maker mid-turnaround. EV caliper demand is outrunning Monterrey's capacity while a declining drum business piles up obsolete stock in Toluca.",
        background: SCENARIO_BACKGROUNDS["Apex Brake Systems — México"],
        currency: "USD",
        files: buildFiles(APEX_CSV),
      },
      {
        name: "Helios Pumps & Compressors — Italy",
        industry: "Industrial equipment",
        factory: "3 plants · Milan, Turin, Bologna",
        description: "Pumps & compressors maker with a wide margin spread — the high-revenue pumps earn ~16% while the under-forecast vacuum line earns ~45%.",
        background: SCENARIO_BACKGROUNDS["Helios Pumps & Compressors — Italy"],
        currency: "EUR",
        files: buildFiles(HELIOS_CSV),
      },
    ];

    ensureSeed({ users, projects }).catch((e) => console.error("Seed failed", e));
  }, [ensureSeed]);

  return null;
}
