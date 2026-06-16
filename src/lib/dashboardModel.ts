// ============================================================
// Dashboard layering model — the "what goes where" reference behind
// the S&OP tool. Encodes the THREE-LAYER idea:
//
//   Layer 1 · Core        — on every S&OP dashboard, any industry.
//   Layer 2 · Industry    — lights up for a manufacturing archetype.
//   Layer 3 · Specialized — company-specific + advanced (IBP) depth.
//
// Each module (Overview/Demand/Supply/Capacity) renders the core layer
// as its MAIN tab, then adds an Industry tab and a Specialized tab.
// Sourced from background/SOP_Process_Reference.md (process + KPIs),
// Varun's v5 EU dashboard (information architecture), and industry
// demand/supply/capacity research. `status` ties each element back to
// what the live app already ships.
// ============================================================

export type Layer = "core" | "industry" | "specialized";
export type ModuleKey = "overview" | "demand" | "supply" | "capacity";
export type IndustryKey = "discrete" | "process" | "cpg" | "pharma" | "electronics";

export type DashElement = {
  name: string;
  what: string; // what the widget shows
  why: string; // why it belongs in this layer
  data?: string; // template / data it needs
  kpi?: string; // KPI it carries
  status?: "live" | "planned"; // does the app ship it today?
};

export type Industry = {
  key: IndustryKey;
  label: string;
  archetype: string; // the planning archetype in one phrase
  blurb: string; // what makes its planning different
  examples: string; // example seeded scenarios / sectors
};

export type ModuleModel = {
  key: ModuleKey;
  label: string;
  emoji: string;
  step: string; // S&OP process step it maps to
  purpose: string;
  core: DashElement[];
  industry: Record<IndustryKey, DashElement[]>;
  specialized: DashElement[];
};

export const LAYERS: { key: Layer; label: string; tagline: string; color: string }[] = [
  { key: "core", label: "Core", tagline: "Every S&OP dashboard, any industry", color: "#185FA5" },
  { key: "industry", label: "Industry", tagline: "Lights up for a manufacturing archetype", color: "#7F77DD" },
  { key: "specialized", label: "Specialized", tagline: "Company-specific + advanced IBP depth", color: "#1D9E75" },
];

export const INDUSTRIES: Industry[] = [
  {
    key: "discrete",
    label: "Discrete / Automotive",
    archetype: "Build-to-schedule against OEM call-offs",
    blurb:
      "Demand arrives as EDI release schedules (830 / DELJIT), not a forecast you own — JIT/JIS, firm vs planned horizons, deep BOMs and program lifecycles dominate. Customer concentration is high (a few OEMs).",
    examples: "SFC India — Sealings (the seeded automotive scenario)",
  },
  {
    key: "process",
    label: "Process / Chemicals / Food",
    archetype: "Recipe-driven, campaign & yield-constrained",
    blurb:
      "Formulas not BOMs, bulk volume (tons) not units, co-products/by-products, tank & reactor throughput, grade changeovers with cleaning (CIP), and shelf-life on intermediates. Plan in throughput and yield.",
    examples: "Sealings extrusion/moulding leans this way; a chemicals scenario would be pure-process",
  },
  {
    key: "cpg",
    label: "CPG / FMCG",
    archetype: "Promotion- and channel-driven, sell-through",
    blurb:
      "Promotions are the biggest source of demand variability; multi-channel (DTC / wholesale / retail) with retail sell-through (POS) as the real signal; SKU proliferation, FEFO shelf-life and fill-rate service obsession.",
    examples: "A food/beverage or household-goods portfolio company",
  },
  {
    key: "pharma",
    label: "Pharma / Healthcare",
    archetype: "Patient-driven via distributors, lot & expiry governed",
    blurb:
      "Demand is patient/script-driven through wholesalers (channel inventory matters); long-term launch curves + short-term replenishment; batch/lot, expiry, cold-chain, serialization and QA-release holds are first-class constraints.",
    examples: "A medtech / generics portfolio company",
  },
  {
    key: "electronics",
    label: "Electronics / High-tech",
    archetype: "Short lifecycle, long-lead components, allocation",
    blurb:
      "Rapid obsolescence and price erosion, configure-to-order / attach rates, very long component lead times forcing last-time-buys and allocation, and demand sensing for high volatility.",
    examples: "ElectroTech Industries — EU (the seeded electronics scenario)",
  },
];

export const MODULES: ModuleModel[] = [
  // ---------------------------------------------------------- OVERVIEW
  {
    key: "overview",
    label: "Overview",
    emoji: "📊",
    step: "Step 5 — Executive S&OP / MBR",
    purpose:
      "The one-page executive snapshot leadership decides on: the balanced plan, the gaps that need a decision, and what was committed.",
    core: [
      { name: "Executive KPI strip", what: "Revenue projection, forecast accuracy, inventory days, capacity utilisation, revenue at risk — each with target + RAG.", why: "The five numbers every S&OP review opens on, regardless of sector.", kpi: "Business-outcome KPIs", status: "live" },
      { name: "Demand vs supply gap (by family)", what: "Unconstrained demand vs constrained supply per product family, in units and value.", why: "The gap is the single most important S&OP artifact — it drives every decision.", data: "demand_forecast · capacity · sku_master", status: "live" },
      { name: "Issues to decide", what: "Ranked exceptions (gaps, overloads, accuracy breaches) with value at risk.", why: "S&OP is exception-driven; the exec meeting works the escalations, not the whole plan.", status: "live" },
      { name: "Decision & action log", what: "Committed decisions with owner, status and due date.", why: "Turns the review into accountability — the defining output of Step 5.", kpi: "% decisions made vs deferred", status: "live" },
      { name: "Plan-to-budget gap", what: "Operational plan vs the financial budget / AOP, with the variance.", why: "Reconciling volume to money is what separates S&OP from a supply meeting.", kpi: "Plan-to-budget gap %", status: "planned" },
    ],
    industry: {
      discrete: [
        { name: "Top-OEM concentration & call-off adherence", what: "Revenue share of the top customers and how actuals track their EDI call-offs.", why: "A few OEMs drive the business; their schedule adherence is the headline risk.", kpi: "Call-off adherence" },
        { name: "Program / platform lifecycle", what: "SOP/EOP timeline of vehicle programs feeding demand.", why: "Discrete demand is governed by program launch/run-out, not season.", status: "planned" },
      ],
      process: [
        { name: "Site throughput & yield summary", what: "Tons produced vs plan and first-pass yield by site.", why: "Process plants are measured in throughput and yield, not unit counts.", kpi: "Yield %, throughput" },
        { name: "Grade / campaign adherence", what: "Did campaigns run to plan; changeover losses.", why: "Campaign discipline is the process-industry equivalent of schedule attainment." },
      ],
      cpg: [
        { name: "Service level (OTIF / fill rate) headline", what: "On-time-in-full and case-fill vs target by channel.", why: "In CPG the board judges S&OP on shelf availability first.", kpi: "OTIF / fill rate" },
        { name: "Promo & channel mix", what: "Baseline vs promotional volume and the DTC/wholesale/retail split.", why: "Promotions and channel shape are the dominant demand levers." },
      ],
      pharma: [
        { name: "Launch readiness & expiry exposure", what: "New-product launch supply readiness and value of stock nearing expiry.", why: "Launches and write-offs are the pharma board's two biggest swings.", kpi: "Expiry write-off" },
        { name: "Tender / contract pipeline", what: "Won/at-risk tenders feeding step-change demand.", why: "Tenders create lumpy, high-stakes demand unique to healthcare." },
      ],
      electronics: [
        { name: "NPI ramp & obsolescence (E&O) exposure", what: "New-product ramp status and excess-&-obsolete reserve.", why: "Short lifecycles mean ramp and obsolescence dominate the P&L risk.", kpi: "E&O reserve" },
        { name: "Component allocation flags", what: "Where long-lead parts are constraining the buildable plan.", why: "Allocation, not factory capacity, is often the true ceiling in high-tech." },
      ],
    },
    specialized: [
      { name: "Scenario compare at exec altitude", what: "Downside / base / upside revenue & margin side by side.", why: "Stage-3 IBP: leadership chooses a scenario, not just reads a number.", status: "live" },
      { name: "Working-capital / EBITDA bridge", what: "How the plan moves cash, inventory and EBITDA.", why: "The Mutares value lever — ties operations to the financial thesis.", status: "planned" },
      { name: "Portfolio roll-up (multi-company)", what: "Same one-pager rolled across portfolio companies for comparability.", why: "Mutares' real differentiator: apples-to-apples across the portfolio.", status: "planned" },
      { name: "AI “what changed since last cycle”", what: "Narrative of the material deltas vs the prior plan.", why: "Cuts the review from data-reading to decision-making.", status: "planned" },
    ],
  },

  // ---------------------------------------------------------- DEMAND
  {
    key: "demand",
    label: "Demand",
    emoji: "📈",
    step: "Step 2 — Demand Review",
    purpose:
      "Produce the unconstrained consensus demand plan — the best view of what the market wants, in units and value, with accuracy and bias measured.",
    core: [
      { name: "Revenue / volume / CM over horizon", what: "Actuals + consensus forecast across the rolling horizon, switchable between value, volume and margin.", why: "Plan must live in both units and value — finance can't reconcile otherwise.", data: "sales_history · demand_forecast", status: "live" },
      { name: "Forecast accuracy (MAPE) & bias", what: "Error and systematic over/under by SKU and family vs prior actuals.", why: "Closing the accuracy loop is what makes every future cycle better.", kpi: "MAPE / WMAPE · bias", status: "live" },
      { name: "Plan bridge (forecast value-add)", what: "Statistical baseline → consensus → committed supply, showing value added and at risk.", why: "Proves human consensus beats the raw model — the core demand-review test.", kpi: "Forecast value-add", status: "live" },
      { name: "Governed consensus overrides", what: "Reason-coded, expiring adjustments on top of the baseline.", why: "Auditable overrides + assumptions register make the plan defensible.", status: "live" },
      { name: "Customer / demand mix", what: "Share of demand by customer/segment.", why: "Mix shifts move margin even when volume holds — always worth seeing.", status: "live" },
      { name: "Scenario comparison", what: "Base / upside / downside revenue and margin.", why: "Demand review hands scenarios to reconciliation; universal Stage-2→3 element.", status: "live" },
    ],
    industry: {
      discrete: [
        { name: "EDI release schedule vs forecast", what: "Customer 830 planning releases and DELJIT call-offs vs your forecast.", why: "Automotive demand IS the OEM release — the forecast must reconcile to it.", data: "(EDI 830 / DELJIT feed)" },
        { name: "Firm vs planned horizon (time fences)", what: "Frozen call-off window vs planned/free zone.", why: "JIT/JIS make the near-term frozen zone contractually firm." },
      ],
      process: [
        { name: "Demand by grade / recipe", what: "Volume by product grade in bulk units (tons).", why: "Process demand is planned by grade and throughput, not discrete SKUs." },
        { name: "Feedstock-linked seasonality", what: "Seasonal demand tied to input availability/price.", why: "Process margins swing with feedstock — demand and input are coupled." },
      ],
      cpg: [
        { name: "Promotion uplift modelling", what: "Baseline vs promo split, uplift and post-promo dip, cannibalisation.", why: "Promotions are the single largest source of CPG demand variability.", kpi: "Promo forecast accuracy" },
        { name: "Channel & sell-through (POS)", what: "DTC / wholesale / retail views with retail sell-through as the lead signal.", why: "The real demand is the retailer's order, sensed from POS." },
      ],
      pharma: [
        { name: "Launch curve + replenishment split", what: "Long-term launch forecast separated from short-term patient-driven replenishment.", why: "Pharma runs two clocks: launch readiness and steady-state scripts." },
        { name: "Channel inventory (wholesaler stock)", what: "Distributor stock that distorts true patient demand.", why: "Sell-in ≠ sell-out; channel stock must be netted to see real demand." },
      ],
      electronics: [
        { name: "Lifecycle ramp / decline curves", what: "Short product lifecycles modelled as ramp-up and end-of-life decline.", why: "High-tech demand is dominated by where a product sits in its short life." },
        { name: "Configure-to-order / attach rates", what: "Option and accessory demand derived from base-unit attach rates.", why: "CTO demand is computed, not forecast directly." },
      ],
    },
    specialized: [
      { name: "Demand sensing (ML short-term)", what: "Near-term statistical/ML correction from latest signals.", why: "Stage-4 capability for volatile, fast-moving categories.", status: "planned" },
      { name: "NPI ramp & cannibalisation modelling", what: "New-item ramp curves and the demand they take from incumbents.", why: "Step-1 portfolio review feeds this; advanced where launches are frequent.", status: "planned" },
      { name: "Probabilistic / distribution forecasts", what: "Ranges and confidence, not a single point.", why: "Mature IBP plans to a distribution to size safety stock properly.", status: "planned" },
      { name: "Assumptions register & FVA leaderboard", what: "Every override's rationale and whether it improved accuracy.", why: "Makes the plan auditable and rewards good judgement.", status: "planned" },
    ],
  },

  // ---------------------------------------------------------- SUPPLY
  {
    key: "supply",
    label: "Supply",
    emoji: "🏭",
    step: "Step 3 — Supply Review",
    purpose:
      "Determine whether and how the unconstrained demand can be met — the constrained plan, the costed gap, material risk and inventory.",
    core: [
      { name: "Demand vs supply gap (constrained)", what: "Per-family demand, constrained supply, gap, gap% and revenue at risk.", why: "The supply review's headline — what we can actually commit.", status: "live" },
      { name: "Gap resolution — costed options", what: "Overtime / shift / re-route / outsource options with cost per recovered unit.", why: "The spec is explicit: never present “we can't” without costed options.", status: "live" },
      { name: "Inventory RM / WIP / FG by plant", what: "Stock split and days of supply per site.", why: "Inventory is the demand-supply shock absorber; always on the supply view.", data: "inventory · plant_master", kpi: "Inventory days / turns", status: "live" },
      { name: "Inventory projection to target", what: "Planned glide of inventory days toward target, freeing working capital.", why: "Connects the plan to cash — the forward, not just current, position.", status: "live" },
      { name: "Slow-moving & obsolete (SLOB)", what: "FG sitting beyond cover or with no sales — cash at risk.", why: "Universal working-capital leak; first thing a turnaround looks at.", status: "live" },
      { name: "MRP — material & supplier risk", what: "Components flagged by supplier reliability and lead time.", why: "Material constraints — not just machines — break supply plans.", data: "bom · supplier", status: "live" },
    ],
    industry: {
      discrete: [
        { name: "BOM pegging & component coverage", what: "Demand pegged down the BOM to component orders and coverage.", why: "Deep multi-level BOMs make pegging essential in discrete." },
        { name: "JIT inbound risk & premium freight", what: "Inbound supplier risk to JIT lines and expedite cost.", why: "JIT has no buffer — inbound disruption stops the line." },
      ],
      process: [
        { name: "Yield & co-product balance", what: "Recipe yield and the co-/by-products a campaign forces out.", why: "Making one grade produces others — supply must balance the whole slate." },
        { name: "Bulk storage / tank constraints", what: "Tank and silo capacity limiting what can be made/held.", why: "Storage, not just production, constrains process supply." },
      ],
      cpg: [
        { name: "Co-pack / 3PL capacity & FEFO", what: "External co-packer capacity and first-expiry-first-out flow.", why: "CPG leans on co-packers and must rotate short-life stock." },
        { name: "Fill rate by DC", what: "Case fill and availability per distribution centre.", why: "Service is judged at the DC/shelf, so supply is viewed there." },
      ],
      pharma: [
        { name: "Lot / batch, expiry & QA hold", what: "Inventory by lot with expiry and quality-release status.", why: "Regulated stock is unusable until released and worthless past expiry." },
        { name: "Cold-chain & serialization", what: "Temperature-controlled flow and unit traceability.", why: "Compliance constraints that gate what supply can ship." },
      ],
      electronics: [
        { name: "Long-lead allocation & last-time-buy", what: "Constrained components, allocation rules and end-of-life buys.", why: "Component lead times exceed the plan horizon — buys are decisions." },
        { name: "E&O reserve", what: "Excess-and-obsolete provision as lifecycles end.", why: "Short lifecycles make obsolescence a recurring supply write-down." },
      ],
    },
    specialized: [
      { name: "Multi-echelon inventory optimisation", what: "Safety stock set across the network, not per node.", why: "Stage-4 inventory science; big working-capital prize.", status: "planned" },
      { name: "Capacity solver / make-vs-buy re-route", what: "Optimised re-allocation of volume across lines and suppliers.", why: "Turns the costed options into an optimised recommendation.", status: "planned" },
      { name: "Supplier risk network", what: "Dual-sourcing and dependency mapping.", why: "Resilience view for fragile or single-sourced supply chains.", status: "planned" },
    ],
  },

  // ---------------------------------------------------------- CAPACITY
  {
    key: "capacity",
    label: "Capacity",
    emoji: "⚙️",
    step: "Step 3 — Supply Review (RCCP)",
    purpose:
      "Rough-cut capacity: load vs available/planned capacity, where the bottleneck is, and the period-by-period schedule that needs a decision.",
    core: [
      { name: "Line utilisation vs capacity (RCCP)", what: "Required load vs available and planned demonstrated capacity per line.", why: "RCCP is the universal aggregate capacity check in the supply step.", data: "capacity", kpi: "Capacity utilisation", status: "live" },
      { name: "Bottleneck / overload identification", what: "The constraining lines and how far over they run.", why: "S&OP acts on the constraint — surface it explicitly.", status: "live" },
      { name: "Production schedule (load % × period)", what: "Heatmap of load by line over the coming periods.", why: "Shows which periods need a capacity decision before commit.", status: "live" },
      { name: "Planning-level lever (MAC haircut)", what: "Slider for the % of max demonstrated capacity treated as plannable.", why: "Demonstrated capacity is rarely 100% reliable; plan on a haircut.", status: "live" },
    ],
    industry: {
      discrete: [
        { name: "Work-centre by shift & changeover (SMED)", what: "Capacity by line/shift and changeover time lost.", why: "Discrete capacity is shift- and changeover-bound." },
        { name: "OEE & sequence feasibility", what: "Availability×performance×quality and whether the JIS sequence is buildable.", why: "OEE and sequence are the real discrete capacity ceiling.", kpi: "OEE" },
      ],
      process: [
        { name: "Reactor / tank throughput (tons/hr)", what: "Continuous-asset capacity in throughput, not unit count.", why: "Process capacity is a rate on an asset, governed by physics." },
        { name: "Campaign scheduling & CIP changeover", what: "Grade campaigns with cleaning/validation time between them.", why: "Changeover/cleaning is a major, grade-dependent capacity loss." },
      ],
      cpg: [
        { name: "Line + co-packer capacity", what: "Internal and external (co-pack) capacity together.", why: "CPG peaks are met with flexible external capacity." },
        { name: "Changeover under SKU proliferation", what: "Changeover load driven by a wide, churning SKU range.", why: "SKU count, more than volume, eats CPG line time." },
      ],
      pharma: [
        { name: "Qualified-line constraint", what: "Only validated lines can make a given product.", why: "Regulatory qualification hard-limits where capacity exists." },
        { name: "Batch minima & cleaning validation", what: "Minimum economic batch sizes and validated cleaning between products.", why: "Batch economics and validation shape the feasible schedule." },
      ],
      electronics: [
        { name: "SMT & test capacity", what: "Surface-mount line and test-station capacity separately.", why: "Test capacity is a distinct, often-binding constraint in electronics." },
        { name: "EMS / contract-manufacturer capacity", what: "Outsourced manufacturing partner capacity and allocation.", why: "Much high-tech build sits with EMS partners, not owned lines." },
      ],
    },
    specialized: [
      { name: "Finite scheduling & shift what-ifs", what: "Cost a Saturday / 3rd shift / holiday working scenario.", why: "Moves RCCP toward finite scheduling with a cost per option.", status: "planned" },
      { name: "OEE & downtime analytics", what: "Loss-tree analysis of where capacity is lost.", why: "Deep operational layer for capacity recovery.", status: "planned" },
      { name: "Capex evaluation for expansion", what: "Compare adding capacity vs losing the revenue.", why: "The exec trade-off when a gap can't be closed operationally.", status: "planned" },
    ],
  },
];

export function getModule(key: ModuleKey): ModuleModel {
  return MODULES.find((m) => m.key === key)!;
}
