# Sales & Operations Planning (S&OP) — Process Reference

> A build-oriented reference describing the end-to-end S&OP cycle: high-level steps, detailed mechanics per step, the data each step consumes and produces, the roles involved, the decisions made, and the KPIs that govern it. Written to be used as a specification input for designing a tool, workflow, or data model.

---

## 1. What S&OP Is

Sales & Operations Planning is a **monthly, cross-functional decision-making process** that produces a single, agreed, financially-validated plan balancing **demand**, **supply**, **inventory**, and **financial** objectives over a rolling forward horizon.

Its defining characteristics:

- **Aggregate, not granular.** S&OP plans at the **product family / product group** level (typically 5–50 families), not SKU-by-SKU. SKU-level detail belongs to the downstream Master Production Schedule (MPS) and detailed scheduling. The solution should explicitly model this aggregation hierarchy.
- **One set of numbers.** The output is a reconciled plan that Sales, Operations, Finance, and Leadership all commit to — replacing siloed, conflicting departmental plans.
- **Forward-looking and rolling.** Horizon is typically **18–36 months**, re-planned every month, and must extend beyond the cumulative procurement + production lead time so supply decisions can actually be acted on.
- **Decision- and exception-driven.** The goal is not to admire forecasts but to surface **gaps** (demand vs. supply, plan vs. budget) and force **decisions** to close them.

### Core objectives

| Objective | What it means in practice |
|---|---|
| Balance demand & supply | Identify where forecast demand exceeds capacity/material, or vice versa, and resolve it |
| Align volume with the financial plan | Ensure the operational plan delivers the revenue/margin the business committed to |
| Manage inventory & service trade-offs | Set target inventory / backlog levels that hit service goals at acceptable cost |
| Surface decisions for leadership | Escalate only the gaps and scenarios that need executive authority |
| Improve forecast & plan accuracy over time | Close the loop with measured accuracy and continuous improvement |

---

## 2. The High-Level Cycle

S&OP runs as a **monthly cadence** of sequential steps. Each step has a hard handoff to the next; outputs of one are inputs to the next.

```
 ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────────┐   ┌───────────────┐
 │  Step 0     │   │  Step 1     │   │  Step 2     │   │  Step 3     │   │  Step 4      │   │  Step 5       │
 │  Data       │ → │  Product /  │ → │  Demand     │ → │  Supply     │ → │  Integrated  │ → │  Executive    │
 │  Gathering  │   │  Portfolio  │   │  Review     │   │  Review     │   │  Reconcil.   │   │  S&OP / MBR   │
 │             │   │  Review     │   │             │   │             │   │  (Pre-S&OP)  │   │               │
 └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └──────────────┘   └───────────────┘
   collect &         what we'll       what the          what we can       resolve gaps,       decide, commit,
   refresh data      sell / launch    market wants      actually make     build scenarios     authorize
```

Typical timing within a month (illustrative — calibrate to the org):

| Working day of month | Step |
|---|---|
| WD 1–2 | Step 0 — Data Gathering & Preparation |
| WD 2–3 | Step 1 — Product / Portfolio Review |
| WD 3–6 | Step 2 — Demand Review |
| WD 6–9 | Step 3 — Supply Review |
| WD 9–11 | Step 4 — Integrated Reconciliation (Pre-S&OP) |
| WD 11–14 | Step 5 — Executive S&OP / Management Business Review |

> Note: Step 1 (Product/Portfolio Review) is sometimes folded into the demand step in less mature organizations. Keep it separate in the design so it can be enabled independently.

---

## 3. Steps in Detail

Each step below is documented with a consistent template so it maps cleanly onto a build: **Objective · Owner & Participants · Inputs · Activities · Outputs · Key Decisions · KPIs · Systems/Data · Common Pitfalls.**

---

### Step 0 — Data Gathering & Preparation

**Objective.** Assemble, cleanse, and refresh the data foundation every later step depends on, so the cycle runs on one trusted, current dataset.

**Owner & Participants.** S&OP Planner / Data Analyst (owner); IT/BI support; functional data stewards.

**Inputs.**
- Actual sales (shipments, orders, POS/sell-through) for the closed period
- Open orders and backlog
- Current inventory positions (on-hand, in-transit, by location)
- Production output and capacity actuals
- Forecast from the prior cycle (for accuracy measurement)
- Master data: product hierarchy, BOMs, lead times, calendars, units of measure

**Activities.**
1. Close the prior period and load actuals.
2. Calculate prior-cycle **forecast accuracy / bias** and **plan attainment**.
3. Refresh statistical baseline forecast (if used).
4. Validate master data and flag exceptions (new/discontinued items, broken hierarchies).
5. Publish the prepared dataset and the standard report pack.

**Outputs.**
- Clean, reconciled dataset for the cycle
- Statistical baseline forecast
- Accuracy/bias and attainment scorecards
- Exception list (data quality issues to fix)

**Key Decisions.** None strategic — this is enablement. The "decision" is data sign-off / readiness gate.

**KPIs.** Data completeness %, on-time data readiness, prior-cycle forecast accuracy (MAPE), forecast bias.

**Systems/Data.** ERP (actuals, inventory, orders), data warehouse/BI, statistical forecasting engine, master data management.

**Common Pitfalls.** Garbage-in (uncleaned actuals), inconsistent hierarchies, late data delaying the whole cycle, measuring no accuracy so the loop never closes.

---

### Step 1 — Product / Portfolio Review

**Objective.** Agree the forward plan for the product portfolio: new product introductions (NPI), phase-ins/phase-outs, lifecycle transitions, and how these reshape the demand and supply picture.

**Owner & Participants.** Product Management / Marketing (owner); R&D/Engineering; Sales; Operations; Finance.

**Inputs.**
- Product roadmap and launch dates
- NPI pipeline and stage-gate status
- End-of-life (EOL) / discontinuation plans
- Cannibalization assumptions and ramp curves
- Project status (delays, risks)

**Activities.**
1. Review the status of every NPI and EOL in the pipeline.
2. Set/confirm launch and discontinuation dates and ramp/run-down curves.
3. Define cannibalization links (new item eats X% of incumbent).
4. Flag transitions that need demand-shaping or supply pre-build.
5. Update the product master and planning hierarchy accordingly.

**Outputs.**
- Approved product change calendar (launches, transitions, EOL)
- Ramp-up / run-down profiles feeding demand planning
- Updated planning hierarchy (new families, retired items)
- Risk list for launches at risk

**Key Decisions.** Launch/kill/delay calls; transition strategy; pre-build authorization for launches; obsolescence handling for EOL stock.

**KPIs.** NPI launch on-time %, % revenue from new products, time-to-volume, obsolescence cost from EOL.

**Systems/Data.** PLM/project management, product master, planning system (for ramp curves & cannibalization).

**Common Pitfalls.** NPIs missing from the demand plan, no run-down plan leaving dead stock, optimistic ramp curves, treating this as a status meeting rather than a planning decision.

---

### Step 2 — Demand Review

**Objective.** Produce the **unconstrained, consensus demand plan** — the best view of what the market will want, independent of whether supply can meet it. "Unconstrained" is critical: do not let capacity limits suppress the demand signal here.

**Owner & Participants.** Demand Planner / Demand Manager (owner); Sales; Marketing; Product Management; Finance (for value validation).

**Inputs.**
- Statistical baseline forecast (from Step 0)
- Sales intelligence: pipeline, opportunities, customer plans, lost/won deals
- Marketing inputs: promotions, campaigns, pricing actions
- Product changes (from Step 1): launches, EOL, cannibalization
- Market/economic signals, seasonality, known events
- Prior forecast accuracy & bias (to correct systematic error)

**Activities.**
1. Start from the statistical baseline.
2. Layer in market intelligence, promotions, and product-change effects (consensus adjustments).
3. Reconcile bottom-up (sales/account) with top-down (statistical/financial) views.
4. Validate the plan in **both units and value** (volume × price = revenue).
5. Document assumptions behind every material override.
6. Run demand scenarios (base / upside / downside) where relevant.

**Outputs.**
- Consensus **unconstrained demand plan** (units and value), by family, over the horizon
- Documented assumptions register
- Demand scenarios (optimistic/pessimistic/base)
- Identified demand risks and opportunities

**Key Decisions.** Final consensus number per family; which overrides to accept; assumptions to commit to; scenario selection.

**KPIs.** Forecast accuracy (MAPE/WMAPE), forecast bias, forecast value-add (does human override beat the statistical baseline?), consensus achievement.

**Systems/Data.** Demand planning/forecasting tool, CRM (pipeline), promotion calendar, pricing data.

**Common Pitfalls.** Self-censoring the forecast to match capacity (constraining too early), sandbagging/optimism bias from Sales, no documented assumptions, ignoring measured bias, planning only in units and never validating revenue.

---

### Step 3 — Supply Review

**Objective.** Determine whether and how the unconstrained demand can be met, given **capacity, materials, labor, and inventory** — and produce a **constrained supply plan** plus the trade-offs and options where it can't.

**Owner & Participants.** Supply Planner / Operations Manager (owner); Manufacturing; Procurement; Logistics; Capacity/Inventory planners.

**Inputs.**
- Consensus demand plan (from Step 2)
- Capacity model: lines, shifts, equipment, run rates, planned downtime
- Material availability and supplier lead times/constraints
- Labor availability
- Current inventory and target inventory/safety-stock policy
- Production and distribution lead times

**Activities.**
1. Translate demand (in families) into a required supply/production plan.
2. Run a **rough-cut capacity check (RCCP)** against critical resources and material constraints.
3. Identify constraints/bottlenecks and quantify the gap (demand > supply or supply > demand).
4. Develop options to close gaps: overtime, added shifts, alternate sourcing, pre-build, outsourcing, capex, demand re-timing.
5. Model resulting **inventory and backlog** projections and service implications.
6. Cost each option for the reconciliation step.

**Outputs.**
- **Constrained supply plan** by family over the horizon
- Capacity/material utilization and bottleneck map
- Projected inventory and backlog/lead-time positions
- Gap list with costed resolution options/scenarios
- Items requiring escalation (gaps needing investment or executive trade-offs)

**Key Decisions.** Which gap-closing options to recommend; inventory build/draw strategy; what to escalate vs. resolve operationally; make-vs-buy/outsource recommendations.

**KPIs.** Capacity utilization, supply plan attainment/adherence, inventory days/turns, projected service level (OTIF/fill rate), production schedule adherence.

**Systems/Data.** ERP/MRP, capacity (RCCP) model, inventory optimization, supplier/procurement data.

**Common Pitfalls.** Silently constraining demand without surfacing the gap, ignoring material (not just machine) constraints, no costed options (only "we can't"), inventory targets disconnected from service goals.

---

### Step 4 — Integrated Reconciliation (Pre-S&OP)

**Objective.** Bring demand, supply, inventory, and **finance** together; reconcile the operational plan to the **financial plan/budget**; resolve what can be resolved at the management level; and prepare a clean **decision agenda and scenarios** for the executive meeting.

**Owner & Participants.** S&OP Manager / Process Owner (owner); senior managers from Demand, Supply, Finance, Product. This is the management working session **before** the executive meeting.

**Inputs.**
- Consensus demand plan (units + value)
- Constrained supply plan + gap options (costed)
- Financial budget / business plan / annual operating plan (AOP)
- Inventory and working-capital targets
- Risk and opportunity registers from earlier steps

**Activities.**
1. Combine all plans into an **integrated business view** (volume, mix, revenue, margin, cash/inventory).
2. Compare the bottom-up operational plan against the **financial plan**; quantify the gap to budget.
3. Resolve issues within management authority; document what's resolved.
4. Build **scenarios / what-ifs** for the unresolved trade-offs (e.g., invest in capacity vs. lose revenue; build inventory vs. risk service).
5. For each scenario, attach financial impact and a recommendation.
6. Prepare the **executive decision agenda** — only the gaps and choices needing leadership.

**Outputs.**
- Single integrated business plan (operational + financial)
- Gap-to-plan analysis (vs. budget/AOP)
- Decision package: scenarios + recommendations + financial impact
- Pre-resolved issues log (so the exec meeting isn't cluttered)
- Clear executive agenda with framed decisions

**Key Decisions.** Resolve all decisions within management authority; decide **what to escalate** and how each escalated choice is framed; agree the recommended scenario.

**KPIs.** Plan-to-budget gap %, % of issues resolved pre-executive (vs. escalated), scenario quality/completeness, on-time agenda delivery.

**Systems/Data.** Integrated S&OP/IBP platform, financial planning (FP&A) system, scenario modeling.

**Common Pitfalls.** No finance integration (operational plan never tied to money), escalating everything (overloading the exec meeting), presenting problems without recommendations, scenarios without financial impact.

---

### Step 5 — Executive S&OP / Management Business Review (MBR)

**Objective.** Leadership reviews the integrated plan and the escalated decisions, **chooses scenarios, authorizes resources, resolves the remaining gaps, and commits** to a single plan that becomes the company's operating plan for the horizon.

**Owner & Participants.** Executive sponsor (GM/MD/President) chairs; VPs/Directors of Sales, Operations, Finance, Product; S&OP Process Owner facilitates.

**Inputs.**
- Integrated business plan and gap-to-budget analysis (from Step 4)
- Decision package with scenarios, recommendations, financial impact
- KPI scorecard / process-performance review
- Strategic context (market shifts, corporate targets)

**Activities.**
1. Review performance vs. last cycle's plan and KPI trends (accountability).
2. Review the integrated plan: demand, supply, inventory, financials, risks.
3. Decide on escalated gaps and **select scenarios**.
4. **Authorize** resources: capacity, capex, inventory build, hiring, etc.
5. Resolve cross-functional conflicts and align on priorities/trade-offs.
6. **Commit** to the agreed plan; assign owners and actions.

**Outputs.**
- **Authorized, committed S&OP plan** (the official forward plan for execution)
- Approved scenario(s) and resource authorizations
- Decision and action log with owners and due dates
- Updated targets/policy (inventory, service, mix) if changed
- Communicated plan cascaded to execution (MPS/scheduling/procurement)

**Key Decisions.** Final plan sign-off; capex/resource authorization; demand-shaping or pricing actions; risk acceptance; strategic priority trade-offs.

**KPIs.** Decisions made vs. deferred, meeting effectiveness, plan commitment/adherence next cycle, overall business plan attainment (revenue/margin/service/inventory).

**Systems/Data.** Executive S&OP dashboard, the integrated plan of record, action tracker.

**Common Pitfalls.** Re-litigating data instead of deciding, no decisions made (review-only meeting), decisions not authorized with resources, plan not cascaded to execution, no accountability for prior commitments.

---

## 4. Cross-Cutting Design Elements

These apply across all steps and matter most when building a solution.

### 4.1 Planning hierarchy & aggregation

S&OP operates at an aggregate level and disaggregates downstream. Model this explicitly:

```
Total Business
   └── Product Family / Group        ← S&OP plans HERE (volume & value)
         └── Sub-family / Brand
               └── SKU                ← MPS / detailed scheduling
                     └── SKU-Location  ← deployment / replenishment
```

The solution needs **roll-up (aggregate)** and **drill-down (disaggregate)** logic, with consistent units of measure and a value conversion (price/cost) at every level.

### 4.2 Planning horizon & time fences

- **Horizon:** rolling, typically 18–36 months; must exceed cumulative lead time.
- **Frozen zone (near term):** locked, no changes — execution territory.
- **Slushy / trade zone (mid term):** changes allowed with rules/approval.
- **Free zone (far term):** fully open to planning.

The tool should support configurable time fences and treat near vs. far horizon differently.

### 4.3 Demand vs. supply: unconstrained then constrained

Always capture **both**: the unconstrained demand plan (Step 2) *and* the constrained supply plan (Step 3). The **difference between them is the gap** that drives every decision. A common design error is storing only one number — store both and the delta.

### 4.4 Units AND value

Every plan must exist in **units (volume)** and **money (value = volume × price/cost)**. Finance reconciliation (Step 4) is impossible otherwise. Build the unit↔value bridge into the data model.

### 4.5 Scenario / what-if modeling

Steps 3–5 depend on comparing scenarios (base/upside/downside, invest vs. don't, build vs. don't) each with financial impact. The solution should let users branch a plan, vary assumptions, and compare outcomes side by side.

### 4.6 Assumptions register

Every override and plan number should carry a documented assumption. This is what makes the plan auditable and the next cycle's accuracy review meaningful.

---

## 5. Roles & Responsibilities (RACI summary)

| Activity | Demand Planning | Supply Planning | Finance | Product Mgmt | Sales | Exec Sponsor | S&OP Owner |
|---|---|---|---|---|---|---|---|
| Data preparation | C | C | C | C | C | I | **A/R** |
| Product/portfolio review | C | C | C | **A/R** | C | I | C |
| Demand plan | **A/R** | C | C | C | R | I | C |
| Supply plan | C | **A/R** | C | I | I | I | C |
| Reconciliation (pre-S&OP) | R | R | R | R | C | I | **A/R** |
| Executive S&OP / commit | C | C | C | C | C | **A/R** | R (facilitate) |

*A = Accountable, R = Responsible, C = Consulted, I = Informed.*

---

## 6. KPI Master List

Group KPIs into process health vs. business outcome so a dashboard can separate them.

**Demand-side**
- Forecast accuracy (MAPE / WMAPE)
- Forecast bias (consistent over/under)
- Forecast value-add (human vs. statistical)

**Supply-side**
- Capacity utilization
- Supply / production plan adherence
- Schedule attainment

**Inventory & service**
- Inventory days of supply / turns
- On-time-in-full (OTIF) / fill rate / service level
- Backlog / lead time

**Financial**
- Plan-to-budget gap %
- Revenue / margin attainment
- Working capital vs. target

**Process**
- Data readiness on-time %
- % decisions made (vs. deferred) at executive S&OP
- Plan stability / nervousness (how much the plan churns cycle-to-cycle)
- % issues resolved pre-executive

---

## 7. Maturity Stages (for phasing a build)

| Stage | Description | Build implication |
|---|---|---|
| 1 — Reactive | Siloed forecasts, no formal cycle | Start with data consolidation + a single demand plan |
| 2 — Standard | Defined monthly cycle, demand+supply balanced | Add supply/capacity check and gap reporting |
| 3 — Integrated | Finance integrated, scenarios, exec decisions | Add value bridge, scenario modeling, exec dashboard |
| 4 — Advanced (IBP) | Strategy-linked, probabilistic, what-if, continuous | Add optimization, simulation, real-time re-planning |

Sequence the solution to match — don't build Stage 4 capability on Stage 1 data discipline.

---

## 8. Data Model Starter (entities for a solution)

Core entities a build will likely need:

- **Product** (id, family, sub-family, SKU, status, lifecycle dates, UoM)
- **Location** (plant, DC, channel/region)
- **Time bucket** (period, horizon position, time-fence zone)
- **Demand plan** (product-family × period: statistical, consensus/unconstrained, units, value, assumptions, scenario)
- **Supply plan** (product-family × period × resource: constrained quantity, capacity used, units, value)
- **Gap** (demand − supply, by family × period, with options/cost)
- **Capacity / resource** (resource, available capacity, run rate, downtime)
- **Inventory / backlog projection** (product × location × period)
- **Financial plan / budget** (family × period: revenue, margin, target)
- **Scenario** (name, assumptions, linked plans, financial impact)
- **Decision / action log** (item, owner, status, due date, cycle)
- **KPI snapshot** (metric, value, period, target)

---

## 9. Glossary

- **AOP** — Annual Operating Plan (the financial budget S&OP reconciles to).
- **Constrained / Unconstrained plan** — supply-limited vs. pure-demand plan.
- **IBP** — Integrated Business Planning; mature, strategy-linked evolution of S&OP.
- **MPS** — Master Production Schedule; SKU-level execution plan downstream of S&OP.
- **MRP** — Material Requirements Planning.
- **OTIF** — On-Time-In-Full delivery performance.
- **RCCP** — Rough-Cut Capacity Planning; aggregate capacity check used in the supply step.
- **NPI / EOL** — New Product Introduction / End of Life.
- **One set of numbers** — the single reconciled plan all functions commit to.

---

*Use Sections 3 (per-step detail), 4 (cross-cutting design), and 8 (data model) as the primary specification inputs when designing the solution.*
