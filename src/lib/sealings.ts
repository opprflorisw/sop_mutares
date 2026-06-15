// ============================================================
// Seed dataset — SFC India "Sealings" division (Dec'22)
// Extracted from the reference S&OP dashboard so the placeholder
// pages have realistic numbers to render. In later phases this is
// replaced by data uploaded into a Project (Convex).
// ============================================================

export type Plant = {
  code: string;
  name: string;
  share: number;
  color: string;
  utilisation: number;
  invTotal: number | null; // INR Cr
  rm: number | null;
  wip: number | null;
  fg: number | null;
  invDays: number | null;
  targetDays: number;
};

export const PLANTS: Plant[] = [
  { code: "BWL", name: "Bawal", share: 0.568, color: "#378ADD", utilisation: 94, invTotal: 172.6, rm: 53.4, wip: 57.5, fg: 61.6, invDays: 19.8, targetDays: 40 },
  { code: "MNR", name: "Manesar", share: 0.147, color: "#1D9E75", utilisation: 0, invTotal: null, rm: null, wip: null, fg: null, invDays: null, targetDays: 40 },
  { code: "CNS", name: "Chennai", share: 0.116, color: "#EF9F27", utilisation: 88, invTotal: 52.5, rm: 10.2, wip: 39.6, fg: 2.7, invDays: 54.2, targetDays: 40 },
  { code: "SND", name: "Sanand", share: 0.114, color: "#7F77DD", utilisation: 76, invTotal: null, rm: null, wip: null, fg: null, invDays: null, targetDays: 40 },
  { code: "SBD", name: "Sahibabad", share: 0.054, color: "#D85A30", utilisation: 82, invTotal: 202.5, rm: 182.5, wip: 18.9, fg: 1.1, invDays: 35.3, targetDays: 40 },
];

export const CUSTOMERS = [
  { name: "TML", share: 0.271, color: "#378ADD" },
  { name: "MSIL", share: 0.19, color: "#1D9E75" },
  { name: "TATA", share: 0.136, color: "#EF9F27" },
  { name: "M&M", share: 0.097, color: "#E24B4A" },
  { name: "RNAIPL/Nissan", share: 0.093, color: "#7F77DD" },
  { name: "Ford", share: 0.079, color: "#888780" },
  { name: "VW", share: 0.061, color: "#D85A30" },
  { name: "FCA", share: 0.036, color: "#0F6E56" },
  { name: "MGI/Others", share: 0.037, color: "#533AAB" },
];

export type Sku = {
  sku: string;
  desc: string;
  mape: number;
  bias: number;
  status: "good" | "warn" | "bad";
  state: string;
  action: string;
};

export const SKUS: Sku[] = [
  { sku: "AL-1024", desc: "Welt Bodyside FrRH", mape: 5.2, bias: 3.1, status: "good", state: "Approved", action: "Stable. Maintain model." },
  { sku: "DE-4421", desc: "GlassRun Fr Dr RH", mape: 19.6, bias: -22.3, status: "bad", state: "Override", action: "Worsening over-forecast. Apply demand sensing urgently." },
  { sku: "FR-0912", desc: "Profile NL-DE", mape: 14.1, bias: 16.8, status: "warn", state: "Pending", action: "Consistent under-forecast. Add promo calendar to model." },
  { sku: "MNR-202", desc: "GlassRun Rr Dr RH", mape: 7.4, bias: -4.8, status: "good", state: "Approved", action: "Mild worsening. Validate mix shift." },
  { sku: "MNR-215", desc: "Welt Bodyside RrRH", mape: 8.9, bias: -7.2, status: "good", state: "Approved", action: "Flat over-forecast. Check pull-forward." },
  { sku: "NL-0571", desc: "Dog Leg Seal RH", mape: 6.1, bias: 2.4, status: "good", state: "Approved", action: "Good accuracy. No action needed." },
];

export const WORKFLOW = [
  { num: "Step 1", title: "Data Refresh", sub: "D-4 to D-3", owner: "Planning team" },
  { num: "Step 2", title: "Demand Review", sub: "Day -3 · ICP", owner: "Demand Manager" },
  { num: "Step 3", title: "Supply Review", sub: "Day -1 · RCCP", owner: "Supply Plg Mgr" },
  { num: "Step 4", title: "S&OP Meeting", sub: "Day 0", owner: "BU Head" },
  { num: "Step 5", title: "MPS Update", sub: "Day +1", owner: "Site Planners" },
  { num: "Step 6", title: "SC Mgmt Review", sub: "Day +2", owner: "SC Director" },
];

// ============================================================
// S&OP plans at PRODUCT-FAMILY level (aggregate), with the core
// principle: store BOTH the unconstrained demand and the
// constrained supply — the GAP between them drives decisions.
// Every line carries units AND value (volume × price).
// ============================================================
export type FamilyPlan = {
  family: string;
  unconstrained: number; // demand units (000s)
  constrained: number; // supply units (000s) — capped by capacity/material
  price: number; // € per unit
  color: string;
};

export const FAMILIES: FamilyPlan[] = [
  { family: "Welt seals", unconstrained: 1240, constrained: 1240, price: 0.52, color: "#185FA5" },
  { family: "GlassRun channels", unconstrained: 980, constrained: 815, price: 0.74, color: "#1D9E75" },
  { family: "Dog-leg seals", unconstrained: 610, constrained: 610, price: 0.61, color: "#EF9F27" },
  { family: "Profile extrusions", unconstrained: 720, constrained: 540, price: 0.83, color: "#7F77DD" },
  { family: "Body-side mouldings", unconstrained: 430, constrained: 430, price: 0.48, color: "#D85A30" },
];

export function familyMetrics(f: FamilyPlan) {
  const gapUnits = f.unconstrained - f.constrained;
  return {
    gapUnits,
    gapPct: f.unconstrained ? (gapUnits / f.unconstrained) * 100 : 0,
    demandValue: (f.unconstrained * f.price) / 1000, // mEUR (units in 000s)
    supplyValue: (f.constrained * f.price) / 1000,
    revenueAtRisk: (gapUnits * f.price) / 1000,
  };
}

// Capacity (RCCP) — by line, with overload flagged where required > available.
export type CapacityLine = {
  plant: string;
  line: string;
  availableMin: number;
  requiredMin: number;
  color: string;
};

export const CAPACITY_LINES: CapacityLine[] = [
  { plant: "Bawal", line: "Extrusion-1", availableMin: 28800, requiredMin: 27100, color: "#185FA5" },
  { plant: "Bawal", line: "Extrusion-2", availableMin: 28800, requiredMin: 31900, color: "#185FA5" }, // overloaded
  { plant: "Chennai", line: "Moulding-1", availableMin: 21600, requiredMin: 19000, color: "#EF9F27" },
  { plant: "Sanand", line: "Assembly-1", availableMin: 25200, requiredMin: 19100, color: "#7F77DD" },
  { plant: "Sahibabad", line: "Extrusion-3", availableMin: 18000, requiredMin: 14800, color: "#D85A30" },
];

// MRP — material shortages that constrain the supply plan.
export type MrpAlert = {
  material: string;
  desc: string;
  severity: "critical" | "high" | "medium";
  week: string;
  affects: string;
  valueAtRisk: number; // kEUR
};

export const MRP_ALERTS: MrpAlert[] = [
  { material: "EPDM-12", desc: "EPDM rubber compound shortage", severity: "critical", week: "Wk 23", affects: "GlassRun, Profile families", valueAtRisk: 122 },
  { material: "STL-CORE-7", desc: "Steel carrier strip — Shenzhen supplier delay", severity: "high", week: "Wk 24", affects: "GlassRun channels", valueAtRisk: 56 },
  { material: "COAT-PU", desc: "PU coating — premium freight to recover", severity: "medium", week: "Wk 22", affects: "Welt seals", valueAtRisk: 18 },
];

// Exec issue feed (Control-Tower style) for the Overview snapshot.
export type Issue = {
  severity: "critical" | "high" | "medium";
  title: string;
  detail: string;
  valueAtRisk: number; // kEUR
};

export const ISSUE_FEED: Issue[] = [
  { severity: "critical", title: "EPDM shortage — Wk 23", detail: "Constrains GlassRun & Profile supply. 165k units at risk.", valueAtRisk: 122 },
  { severity: "critical", title: "Bawal Extrusion-2 overloaded", detail: "111% load Nov–Dec. Needs overtime or re-route.", valueAtRisk: 90 },
  { severity: "high", title: "Profile extrusions gap 25%", detail: "Demand 720k vs supply 540k. Capacity-constrained.", valueAtRisk: 149 },
  { severity: "medium", title: "Forecast bias -4.8%", detail: "Systematic over-forecast. Recalibrate before consensus.", valueAtRisk: 0 },
];

export const HEADLINE_KPIS = {
  icpTotalCr: 35.6,
  forecastAccuracy: 84,
  inventoryDays: 35.3,
  inventoryTarget: 40,
  savingsLakh: 155.6,
  savingsTargetLakh: 125,
  skuCount: 801,
  plantCount: 5,
};
