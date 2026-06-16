import { useMemo } from "react";
import { parseCsv } from "./csv";
import { activeVersion, findFile, useProjects, type Project } from "./projects";
import { PALETTE } from "./colors";

// ============================================================
// projectData — derives every module's numbers from the project's
// ACTIVE uploaded CSVs (the real implementation behind the phases).
// Pure + memoised; degrades gracefully when files are missing.
// ============================================================

function rowsOf(project: Project, templateId: string): Record<string, string>[] {
  const f = findFile(project, templateId);
  if (!f) return [];
  const v = activeVersion(f);
  if (!v) return [];
  return parseCsv(v.content).rows;
}
const num = (s: string | undefined) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const ym = (d: string | undefined) => (d ?? "").slice(0, 7);

export type Family = {
  family: string;
  color: string;
  unconstrained: number; // units
  constrained: number;
  price: number;
  cost: number; // weighted std cost / unit
  cmPct: number; // contribution margin %
  cmValue: number; // contribution margin on the demand plan (currency)
  gapUnits: number;
  gapPct: number;
  demandValue: number; // currency
  supplyValue: number;
  revenueAtRisk: number;
  cmAtRisk: number; // margin lost on the gap
};

export type CapacityLine = {
  plant: string;
  line: string;
  availableMin: number; // available demonstrated capacity (the "MAC")
  plannedMin: number; // planned available demonstrated capacity (= available × planning %)
  requiredMin: number;
  util: number; // vs available demonstrated (req / available)
  plannedUtil: number; // vs planned available demonstrated (req / planned)
  overload: boolean; // req > available demonstrated
  color: string;
};

// Slow-moving & obsolete stock (SLOB) — FG sitting longer than it sells.
export type SlobItem = {
  sku: string;
  desc: string;
  plant: string;
  value: number;
  qty: number;
  monthsCover: number; // FG qty / avg monthly sales
  status: "obsolete" | "slow";
};

export type PlantInv = {
  code: string;
  name: string;
  rm: number;
  wip: number;
  fg: number;
  invTotal: number;
  invDays: number;
  utilisation: number;
  color: string;
};

export type SkuAccuracy = {
  sku: string;
  desc: string;
  mape: number;
  bias: number;
  status: "good" | "warn" | "bad";
  state: string;
  action: string;
};

export type Issue = {
  severity: "critical" | "high" | "medium";
  title: string;
  detail: string;
  valueAtRisk: number;
};

export type MaterialAlert = {
  material: string;
  severity: "critical" | "high" | "medium";
  leadTime: number;
  reliability: number;
  affects: string;
};

export type ProjectData = {
  hasData: boolean;
  currency: string;
  families: Family[];
  capacityLines: CapacityLine[];
  plants: PlantInv[];
  skuAccuracy: SkuAccuracy[];
  customerMix: { name: string; share: number; color: string }[];
  demandSeries: { m: string; rev: number; cm: number; actual: boolean }[];
  capacitySchedule: { periods: string[]; rows: { line: string; plant: string; util: number[] }[] };
  materialAlerts: MaterialAlert[];
  issues: Issue[];
  slob: SlobItem[];
  // Forward inventory projection — planned glide toward target.
  inventoryProjection: { m: string; days: number; value: number; planned: boolean }[];
  // Forecast bias by lag — actual vs the plan as it stood 1 and 2 months out (illustrative).
  forecastLag: { m: string; actual: number; lag1: number; lag2: number }[];
  plannedCapacityPct: number; // planning % applied to available demonstrated capacity
  kpis: {
    revenueProjection: number;
    contributionMargin: number; // 12m CM value on the demand plan
    cmPct: number; // blended contribution margin %
    forecastAccuracy: number;
    forecastBias: number;
    inventoryDays: number;
    inventoryTarget: number;
    inventoryTurns: number;
    capacityUtil: number;
    plannedCapacityUtil: number; // vs planned available demonstrated capacity
    revenueAtRisk: number;
    slobValue: number;
    overloadedLines: number;
  };
};

// Planning target as a % of available demonstrated capacity (the "MAC").
// Per the Mutares RCCP method the MAC is only achieved ~25% of the time, so
// the plan is built on a haircut of it. 0.85 is a sensible default.
export const PLANNED_CAPACITY_PCT = 0.85;

export function computeProjectData(project: Project | null): ProjectData {
  const empty: ProjectData = {
    hasData: false,
    currency: project?.currency ?? "EUR",
    families: [], capacityLines: [], plants: [], skuAccuracy: [],
    customerMix: [], demandSeries: [], capacitySchedule: { periods: [], rows: [] }, materialAlerts: [],
    issues: [], slob: [], inventoryProjection: [], forecastLag: [],
    plannedCapacityPct: PLANNED_CAPACITY_PCT,
    kpis: { revenueProjection: 0, contributionMargin: 0, cmPct: 0, forecastAccuracy: 0, forecastBias: 0, inventoryDays: 0, inventoryTarget: 40, inventoryTurns: 0, capacityUtil: 0, plannedCapacityUtil: 0, revenueAtRisk: 0, slobValue: 0, overloadedLines: 0 },
  };
  if (!project) return empty;

  const skuRows = rowsOf(project, "sku_master");
  const fcRows = rowsOf(project, "demand_forecast");
  const salesRows = rowsOf(project, "sales_history");
  const invRows = rowsOf(project, "inventory");
  const capRows = rowsOf(project, "capacity");
  const plantRows = rowsOf(project, "plant_master");
  if (skuRows.length === 0) return { ...empty, currency: project.currency };

  // ---- SKU master ----
  const skus = skuRows.map((r) => ({
    sku: r.sku, desc: r.description, family: r.family, plant: r.plant,
    price: num(r.price), cost: num(r.std_cost),
  }));
  const skuByCode = new Map(skus.map((s) => [s.sku, s]));
  const families = [...new Set(skus.map((s) => s.family))];
  const familyColor = new Map(families.map((f, i) => [f, PALETTE[i % PALETTE.length]]));

  // ---- Capacity (latest period) → plant utilisation ----
  const capDates = [...new Set(capRows.map((r) => r.date))].sort();
  const latestCap = capDates[capDates.length - 1];
  const capLatest = capRows.filter((r) => r.date === latestCap);
  const capacityLines: CapacityLine[] = capLatest.map((r) => {
    const avail = num(r.available_min);
    const planned = avail * PLANNED_CAPACITY_PCT;
    const req = num(r.required_min);
    return {
      plant: r.plant, line: r.resource, availableMin: avail, plannedMin: planned, requiredMin: req,
      util: avail ? (req / avail) * 100 : 0,
      plannedUtil: planned ? (req / planned) * 100 : 0,
      overload: req > avail,
      color: familyColor.get(skus.find((s) => s.plant === r.plant)?.family ?? "") ?? "#185FA5",
    };
  });
  // capacity schedule — util% per line over the last 4 periods
  const recentDates = capDates.slice(-4);
  const lineKeys = [...new Set(capRows.map((r) => `${r.plant}|${r.resource}`))];
  const capacitySchedule = {
    periods: recentDates.map((dd) => ym(dd)),
    rows: lineKeys.map((k) => {
      const [plant, line] = k.split("|");
      const util = recentDates.map((dd) => {
        const row = capRows.find((r) => r.date === dd && r.plant === plant && r.resource === line);
        if (!row) return 0;
        const a = num(row.available_min);
        return a ? Math.round((num(row.required_min) / a) * 100) : 0;
      });
      return { line, plant, util };
    }),
  };

  const plantUtil = new Map<string, number>();
  for (const p of new Set(capLatest.map((r) => r.plant))) {
    const lines = capLatest.filter((r) => r.plant === p);
    const avail = lines.reduce((s, r) => s + num(r.available_min), 0);
    const req = lines.reduce((s, r) => s + num(r.required_min), 0);
    plantUtil.set(p, avail ? req / avail : 1);
  }

  // ---- Demand forecast → family demand (12m) ----
  const familyDemandUnits = new Map<string, number>();
  const familyDemandValue = new Map<string, number>();
  const familyWeightedPrice = new Map<string, { v: number; q: number }>();
  const familyWeightedCost = new Map<string, { v: number; q: number }>();
  for (const r of fcRows) {
    const s = skuByCode.get(r.sku);
    if (!s) continue;
    const q = num(r.baseline_qty);
    familyDemandUnits.set(s.family, (familyDemandUnits.get(s.family) ?? 0) + q);
    familyDemandValue.set(s.family, (familyDemandValue.get(s.family) ?? 0) + q * s.price);
    const w = familyWeightedPrice.get(s.family) ?? { v: 0, q: 0 };
    w.v += q * s.price; w.q += q;
    familyWeightedPrice.set(s.family, w);
    const wc = familyWeightedCost.get(s.family) ?? { v: 0, q: 0 };
    wc.v += q * s.cost; wc.q += q;
    familyWeightedCost.set(s.family, wc);
  }
  // dominant plant per family (by demand)
  const familyPlantUnits = new Map<string, Map<string, number>>();
  for (const r of fcRows) {
    const s = skuByCode.get(r.sku);
    if (!s) continue;
    const m = familyPlantUnits.get(s.family) ?? new Map();
    m.set(s.plant, (m.get(s.plant) ?? 0) + num(r.baseline_qty));
    familyPlantUnits.set(s.family, m);
  }

  const familyData: Family[] = families.map((fam) => {
    const unconstrained = familyDemandUnits.get(fam) ?? 0;
    const w = familyWeightedPrice.get(fam) ?? { v: 0, q: 1 };
    const price = w.q ? w.v / w.q : 0;
    const wc = familyWeightedCost.get(fam) ?? { v: 0, q: 1 };
    const cost = wc.q ? wc.v / wc.q : 0;
    const cmPct = price ? ((price - cost) / price) * 100 : 0;
    // constrained by the dominant plant's capacity utilisation
    const plantsForFam = familyPlantUnits.get(fam);
    let domPlant = "";
    let domQty = -1;
    if (plantsForFam) for (const [p, q] of plantsForFam) if (q > domQty) { domQty = q; domPlant = p; }
    const u = plantUtil.get(domPlant) ?? 1;
    const constrained = u > 1 ? Math.round(unconstrained / u) : unconstrained;
    const gapUnits = Math.max(0, unconstrained - constrained);
    const unitMargin = price - cost;
    return {
      family: fam, color: familyColor.get(fam)!,
      unconstrained, constrained, price, cost,
      cmPct, cmValue: unconstrained * unitMargin,
      gapUnits, gapPct: unconstrained ? (gapUnits / unconstrained) * 100 : 0,
      demandValue: unconstrained * price, supplyValue: constrained * price,
      revenueAtRisk: gapUnits * price,
      cmAtRisk: gapUnits * unitMargin,
    };
  }).sort((a, b) => b.demandValue - a.demandValue);

  // Blended contribution margin across the demand plan (real, from std cost).
  const totalDemandValueAll = familyData.reduce((s, f) => s + f.demandValue, 0);
  const totalCmValueAll = familyData.reduce((s, f) => s + f.cmValue, 0);
  const blendedCmPct = totalDemandValueAll ? totalCmValueAll / totalDemandValueAll : 0;

  // ---- Inventory (latest snapshot) ----
  const invDates = [...new Set(invRows.map((r) => r.date))].sort();
  const latestInv = invDates[invDates.length - 1];
  const invLatest = invRows.filter((r) => r.date === latestInv);
  const plantNames = new Map(plantRows.map((r) => [r.plant, r.name]));
  // plant annual demand value (for days of supply)
  const plantDemandValue = new Map<string, number>();
  for (const r of fcRows) {
    const s = skuByCode.get(r.sku);
    if (!s) continue;
    plantDemandValue.set(s.plant, (plantDemandValue.get(s.plant) ?? 0) + num(r.baseline_qty) * s.price);
  }
  const invPlantCodes = [...new Set(invLatest.map((r) => r.plant))];
  const plants: PlantInv[] = invPlantCodes.map((code) => {
    const rows = invLatest.filter((r) => r.plant === code);
    const sum = (cat: string) => rows.filter((r) => r.category === cat).reduce((s, r) => s + num(r.value), 0);
    const rm = sum("RM"), wip = sum("WIP"), fg = sum("FG");
    const invTotal = rm + wip + fg;
    const annualDemand = plantDemandValue.get(code) ?? 0;
    const perDay = annualDemand / 365;
    const invDays = perDay ? invTotal / perDay : 0;
    return {
      code, name: plantNames.get(code) ?? code,
      rm, wip, fg, invTotal, invDays,
      utilisation: Math.round((plantUtil.get(code) ?? 0) * 100),
      color: PALETTE[invPlantCodes.indexOf(code) % PALETTE.length],
    };
  }).sort((a, b) => b.invTotal - a.invTotal);

  // ---- Forecast accuracy (YoY proxy): forecast month vs same month prior year actual ----
  const salesBy = new Map<string, number>(); // `${sku}|${YYYY-MM}` -> qty
  for (const r of salesRows) salesBy.set(`${r.sku}|${ym(r.date)}`, (salesBy.get(`${r.sku}|${ym(r.date)}`) ?? 0) + num(r.qty));
  const fcBy = new Map<string, number>();
  for (const r of fcRows) fcBy.set(`${r.sku}|${ym(r.date)}`, (fcBy.get(`${r.sku}|${ym(r.date)}`) ?? 0) + num(r.baseline_qty));

  function priorYear(yyyymm: string) {
    const [y, m] = yyyymm.split("-").map(Number);
    return `${y - 1}-${String(m).padStart(2, "0")}`;
  }
  const skuAccuracy: SkuAccuracy[] = skus.map((s) => {
    const fcMonths = [...fcBy.keys()].filter((k) => k.startsWith(s.sku + "|")).map((k) => k.split("|")[1]);
    let errSum = 0, n = 0, fSum = 0, aSum = 0;
    for (const fm of fcMonths) {
      const f = fcBy.get(`${s.sku}|${fm}`) ?? 0;
      const a = salesBy.get(`${s.sku}|${priorYear(fm)}`);
      if (!a) continue;
      errSum += Math.abs(f - a) / a; n++; fSum += f; aSum += a;
    }
    const mape = n ? (errSum / n) * 100 : 0;
    const bias = aSum ? ((fSum - aSum) / aSum) * 100 : 0;
    const status: SkuAccuracy["status"] = mape > 15 ? "bad" : mape > 10 ? "warn" : "good";
    return {
      sku: s.sku, desc: s.desc,
      mape: +mape.toFixed(1), bias: +bias.toFixed(1),
      status,
      state: status === "good" ? "Approved" : status === "warn" ? "Pending" : "Override",
      action:
        status === "good" ? "Stable. Maintain model."
        : status === "warn" ? "Drift vs prior year — validate mix."
        : "High error vs prior year. Recalibrate before consensus.",
    };
  }).sort((a, b) => b.mape - a.mape);

  // ---- Customer mix (from sales actuals) ----
  const custQty = new Map<string, number>();
  for (const r of salesRows) custQty.set(r.customer, (custQty.get(r.customer) ?? 0) + num(r.qty));
  const totalCustQty = [...custQty.values()].reduce((a, b) => a + b, 0) || 1;
  const customerMix = [...custQty.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, q], i) => ({ name, share: q / totalCustQty, color: PALETTE[i % PALETTE.length] }));

  // ---- Monthly revenue series (history actuals + forecast) ----
  const histMonths = [...new Set(salesRows.map((r) => ym(r.date)))].sort();
  const fcMonthsAll = [...new Set(fcRows.map((r) => ym(r.date)))].sort();
  const revByMonth = new Map<string, number>();
  for (const r of salesRows) revByMonth.set(ym(r.date), (revByMonth.get(ym(r.date)) ?? 0) + num(r.revenue));
  for (const r of fcRows) {
    const s = skuByCode.get(r.sku);
    if (!s) continue;
    const k = ym(r.date);
    revByMonth.set(k, (revByMonth.get(k) ?? 0) + num(r.baseline_qty) * s.price);
  }
  const allMonths = [...new Set([...histMonths, ...fcMonthsAll])].sort();
  const histSet = new Set(histMonths);
  const demandSeries = allMonths.map((m) => {
    const rev = revByMonth.get(m) ?? 0;
    return { m, rev, cm: rev * blendedCmPct, actual: histSet.has(m) };
  });

  // ---- KPIs ----
  const revenueProjection = fcRows.reduce((s, r) => {
    const sk = skuByCode.get(r.sku);
    return s + (sk ? num(r.baseline_qty) * sk.price : 0);
  }, 0);
  const validAcc = skuAccuracy.filter((a) => a.mape > 0);
  const forecastAccuracy = validAcc.length
    ? Math.round(100 - validAcc.reduce((s, a) => s + a.mape, 0) / validAcc.length)
    : 0;
  const forecastBias = validAcc.length
    ? +(validAcc.reduce((s, a) => s + a.bias, 0) / validAcc.length).toFixed(1)
    : 0;
  const invTotalAll = plants.reduce((s, p) => s + p.invTotal, 0);
  const invDaysWeighted = invTotalAll
    ? plants.reduce((s, p) => s + p.invDays * p.invTotal, 0) / invTotalAll
    : 0;
  const totAvail = capLatest.reduce((s, r) => s + num(r.available_min), 0);
  const totReq = capLatest.reduce((s, r) => s + num(r.required_min), 0);
  const capacityUtil = totAvail ? Math.round((totReq / totAvail) * 100) : 0;
  const revenueAtRisk = familyData.reduce((s, f) => s + f.revenueAtRisk, 0);
  const overloadedLines = capacityLines.filter((l) => l.overload).length;
  const invTargets = plantRows.map((r) => num(r.target_inv_days)).filter((x) => x > 0);
  const inventoryTarget = invTargets.length ? Math.round(invTargets.reduce((a, b) => a + b, 0) / invTargets.length) : 40;
  // SCOR inventory turnover ≈ annual demand value / inventory value on hand
  const annualDemandValueAll = [...plantDemandValue.values()].reduce((a, b) => a + b, 0);
  const inventoryTurns = invTotalAll ? +(annualDemandValueAll / invTotalAll).toFixed(1) : 0;
  const totPlanned = capLatest.reduce((s, r) => s + num(r.available_min) * PLANNED_CAPACITY_PCT, 0);
  const plannedCapacityUtil = totPlanned ? Math.round((totReq / totPlanned) * 100) : 0;
  const contributionMargin = totalCmValueAll;

  // ---- SLOB — slow-moving & obsolete FG stock ----
  const salesTotalBySku = new Map<string, number>();
  for (const r of salesRows) salesTotalBySku.set(r.sku, (salesTotalBySku.get(r.sku) ?? 0) + num(r.qty));
  const histMonthCount = Math.max(1, new Set(salesRows.map((r) => ym(r.date))).size);
  const slob: SlobItem[] = invLatest
    .filter((r) => r.category === "FG" && num(r.qty) > 0)
    .map((r) => {
      const sk = skuByCode.get(r.sku);
      const avgMonthly = (salesTotalBySku.get(r.sku) ?? 0) / histMonthCount;
      const qty = num(r.qty);
      const monthsCover = avgMonthly > 0 ? qty / avgMonthly : Infinity;
      const status: SlobItem["status"] | null =
        avgMonthly === 0 ? "obsolete" : monthsCover > 4 ? "slow" : null;
      if (!status) return null;
      return {
        sku: r.sku, desc: sk?.desc ?? r.sku, plant: r.plant,
        value: num(r.value), qty,
        monthsCover: monthsCover === Infinity ? 99 : +monthsCover.toFixed(1),
        status,
      };
    })
    .filter(Boolean) as SlobItem[];
  slob.sort((a, b) => b.value - a.value);
  const slobValue = slob.reduce((s, x) => s + x.value, 0);

  // ---- Forward inventory projection — planned glide toward target ----
  const perDayAll = annualDemandValueAll / 365;
  const projMonths = fcMonthsAll.slice(0, 3);
  const inventoryProjection: ProjectData["inventoryProjection"] = [];
  if (invTotalAll > 0 && perDayAll > 0) {
    inventoryProjection.push({ m: latestInv ? ym(latestInv) : "now", days: +invDaysWeighted.toFixed(1), value: invTotalAll, planned: false });
    const valuePerDay = invDaysWeighted ? invTotalAll / invDaysWeighted : perDayAll;
    let days = invDaysWeighted;
    const reducing = invDaysWeighted > inventoryTarget; // only draw down when over target
    for (const m of projMonths) {
      if (reducing) days = days + (inventoryTarget - days) / 3; // close a third of the gap each month
      inventoryProjection.push({ m, days: +days.toFixed(1), value: Math.round(days * valuePerDay), planned: true });
    }
  }

  // ---- Forecast bias by lag — actual vs plan 1 & 2 months out (illustrative) ----
  const biasFrac = forecastBias / 100;
  const accErr = (100 - forecastAccuracy) / 100;
  const recentHist = histMonths.slice(-6);
  const forecastLag = recentHist.map((m, i) => {
    const actual = revByMonth.get(m) ?? 0;
    const dir = i % 2 === 0 ? 1 : -1;
    return {
      m,
      actual,
      lag1: Math.round(actual * (1 + biasFrac * 0.6)),
      lag2: Math.round(actual * (1 + biasFrac + dir * accErr * 0.6)),
    };
  });

  // ---- Material / MRP alerts (supplier reliability + lead time × BOM) ----
  const bomRows = rowsOf(project, "bom");
  const supplierRows = rowsOf(project, "supplier");
  const componentFamilies = (component: string) => {
    const parents = bomRows.filter((b) => b.component === component).map((b) => b.parent_sku);
    const fams = new Set(parents.map((p) => skuByCode.get(p)?.family).filter(Boolean) as string[]);
    return [...fams];
  };
  const materialAlerts: MaterialAlert[] = supplierRows
    .map((r) => {
      const reliability = num(r.reliability);
      const leadTime = num(r.lead_time_days);
      const severity: MaterialAlert["severity"] | null =
        reliability < 88 || leadTime > 27 ? "critical"
        : reliability < 93 || leadTime > 20 ? "high"
        : reliability < 97 ? "medium" : null;
      if (!severity) return null;
      const fams = componentFamilies(r.component);
      return {
        material: r.component, severity, leadTime, reliability,
        affects: fams.length ? fams.join(", ") : "—",
      };
    })
    .filter(Boolean) as MaterialAlert[];
  materialAlerts.sort((a, b) => ({ critical: 0, high: 1, medium: 2 })[a.severity] - ({ critical: 0, high: 1, medium: 2 })[b.severity]);

  // ---- Issues feed ----
  const issues: Issue[] = [];
  for (const f of familyData.filter((x) => x.gapPct > 5).slice(0, 2))
    issues.push({ severity: f.gapPct > 20 ? "critical" : "high", title: `${f.family} gap ${f.gapPct.toFixed(0)}%`, detail: `Demand ${Math.round(f.unconstrained).toLocaleString()} vs supply ${Math.round(f.constrained).toLocaleString()} units — capacity-constrained.`, valueAtRisk: Math.round(f.revenueAtRisk / 1000) });
  for (const l of capacityLines.filter((x) => x.overload).slice(0, 2))
    issues.push({ severity: "critical", title: `${l.plant} ${l.line} overloaded`, detail: `${l.util.toFixed(0)}% load. Needs overtime or re-route.`, valueAtRisk: 0 });
  const worstSku = skuAccuracy[0];
  if (worstSku && worstSku.mape > 12)
    issues.push({ severity: "medium", title: `Forecast error on ${worstSku.sku}`, detail: `MAPE ${worstSku.mape}% vs prior year. ${worstSku.action}`, valueAtRisk: 0 });

  return {
    hasData: true,
    currency: project.currency,
    families: familyData,
    capacityLines,
    plants,
    skuAccuracy,
    customerMix,
    demandSeries,
    capacitySchedule,
    materialAlerts,
    issues,
    slob,
    inventoryProjection,
    forecastLag,
    plannedCapacityPct: PLANNED_CAPACITY_PCT,
    kpis: { revenueProjection, contributionMargin, cmPct: +(blendedCmPct * 100).toFixed(1), forecastAccuracy, forecastBias, inventoryDays: +invDaysWeighted.toFixed(1), inventoryTarget, inventoryTurns, capacityUtil, plannedCapacityUtil, revenueAtRisk, slobValue, overloadedLines },
  };
}

export function useProjectData(): ProjectData {
  const { activeProject } = useProjects();
  return useMemo(() => computeProjectData(activeProject), [activeProject]);
}

// ---- formatting helpers ----
export function fmtMoney(value: number, currency: string): string {
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${sym}${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sym}${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sym}${(value / 1e3).toFixed(0)}k`;
  return `${sym}${value.toFixed(0)}`;
}
export function fmtUnits(value: number): string {
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}k`;
  return `${Math.round(value)}`;
}
