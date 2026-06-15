# S&OP Tool — Build Plan (Mutares)

> A visually appealing, intuitive Sales & Operations Planning tool. Three connected
> core modules (Demand → Supply → Production/MPS) plus review & control-tower layers,
> wrapped around a data-onboarding front door where users select a scenario/industry,
> upload data in **enforced template formats**, group files into **Projects**, and then
> enter the tool. "You shouldn't need a PhD in supply planning to use it."

---

## 0. Revised scope — 2026-06-15 team alignment (SOP + AI)

After reviewing the team meeting notes (`background/`) and the `SOP_Process_Reference.md`,
the plan is refined:

- **Purpose:** an **AI-enabled S&OP mockup for the Mutares COO to pitch portfolio-company
  CEOs** — win executive buy-in first. The differentiators vs. throwaway AI prototypes are
  a **persistent backend, user login, and file management** (all in place).
- **Scope restricted to THREE core modules — Demand, Supply, Capacity** (no extraneous
  dashboards). In-tool nav trimmed to **4 buttons**: **Overview (Exec S&OP), Demand,
  Supply, Capacity**. The **AI assistant is a persistent chat drawer**, not a tab.
  Workflow / Inventory / Summary / Control-Tower content folded into those four.
- **"Not just fancy but explainable"** for non-experts — keep it simple and impactful.
- **Build outputs + rigid templates first** (backwards approach); ~5 key monthly KPIs.
- **Core S&OP principles baked in** (from the process reference): plan at **product-family**
  level; store **unconstrained demand AND constrained supply — the GAP drives decisions**;
  carry **units AND value** everywhere; Capacity (RCCP/overload) as its own module.

Sections below are the original detail; where they say "8 modules" read the 4-button
structure above.

---

## 1. Product vision & positioning

- **MVP for sale:** beautiful, simple front end; serious planning logic underneath.
- **Standardisation is the moat:** companies deliver data in **our templates**, so the
  system reads it consistently — minimal parsing/guessing. Garbage-in is prevented at
  the door by validation, not fixed after import.
- **Outputs are shareable:** standardised reports/exports every factory can send to
  Mutares directors in a consistent format → portfolio-level comparability.
- **Layered complexity:** a clean "standard S&OP" core, with optional **advanced
  modules** (demand sensing, capacity solver, BOM pegging, multi-echelon inventory)
  that stay out of the way until needed.

---

## 2. Two-level navigation (the key UX idea)

```
┌─ WORKSPACE (the "front door") ───────────────────────────────┐
│  • Scenario / Industry gallery (sample datasets you can try) │
│  • File Explorer: upload CSVs, download templates, validate  │
│  • Projects: group selected files into a named project       │
│  • Factory / company background info                         │
│            └─ select a Project ──► enter the tool            │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─ S&OP TOOL (scoped to one Project) ──────────────────────────┐
│  Overview · Workflow · Demand · Supply&MPS · Inventory ·     │
│  S&OP Summary · Control Tower · AI Assistant                 │
│            └─ "Back to Workspace" to switch industry/project │
└──────────────────────────────────────────────────────────────┘
```

The Workspace is the file-browser / project-selector you described. The Tool is the
dashboard from the provided `sop_dashboard_v2` reference, generalised to run on any
project's data.

---

## 3. Tech stack (recommended)

| Concern | Choice | Why |
|---|---|---|
| App | **Vite + React + TypeScript** (SPA, React Router) | App-like dashboard, no SEO need, fastest DX. (Next.js is the alternative — see questions.) |
| Backend / DB | **Convex** | Real-time DB, server functions, file storage, vector search & scheduled jobs in one. Wired to the **Convex MCP server** for dev. |
| Styling | **Tailwind CSS** + small shadcn-style component layer | Matches the clean card UI of the CRM screenshots; fast to theme with Mutares colors. |
| Charts | **Recharts** | React-native equivalent of the Chart.js visuals in the reference. |
| CSV | **PapaParse** + **Zod** schema validation | Enforce templates client-side before anything reaches Convex. |
| AI | **Convex actions → Claude (Anthropic)** + Convex vector search | Chat-with-data (RAG), NL forecast edits, report generation, anomaly detection. |
| Hosting | **Vercel** (front end) + **Convex Cloud** (backend) | Both deploy from the GitHub repo. |

---

## 4. Design system (Mutares identity)

Corporate **blue/navy** primary (Mutares), neutral card surfaces (CRM screenshots),
semantic status colors (the reference dashboard). Defined as CSS variables + Tailwind theme.

```
Brand        navy #0F3460 · primary #185FA5 · mid #2E73B8 · soft #85B7EB · wash #E6F1FB
Neutrals     bg #FFFFFF · surface #F7F8FA · border #E7EAEE · text #1A1D21 · muted #5B6470
Status       green #1D9E75 / #3B9B3B · amber #EF9F27 · red #E24B4A · purple #7F77DD
Tags         success/amber/red/blue/purple pill styles (from reference)
```

UI language: 0.5px hairline borders, rounded cards, compact 11–13px data tables,
KPI tiles with up/down/warn deltas, pill tags, left sidebar + topbar shell.

---

## 5. Canonical data model = the enforced templates

Each is a downloadable `.csv` template with a fixed header, an example row, a data
dictionary, and a Zod validator. Upload that isn't valid is rejected with a clear,
cell-level error report (never silently "fixed").

| Template | Key columns | Feeds |
|---|---|---|
| `sku_master.csv` | sku, description, family, uom, plant, std_cost, price | all modules |
| `customer_master.csv` | customer, region, channel, segment | demand mix |
| `plant_master.csv` | plant, location, capacity_minutes, target_inv_days | supply, inventory |
| `sales_history.csv` | date, sku, customer, plant, qty, revenue | forecast accuracy |
| `demand_forecast.csv` | date, sku, customer, plant, baseline_qty | demand plan |
| `bom.csv` | parent_sku, component, qty_per, supplier, lead_time_days, unit_cost | MPS, pegging |
| `inventory.csv` | date, plant, sku, category(RM/WIP/FG), qty, value | inventory, control tower |
| `capacity.csv` | date, plant, resource, available_min, required_min | RCCP, capacity solver |
| `supplier.csv` | supplier, component, lead_time_days, reliability, moq | supplier risk |

A **Project** = a named workspace that owns a selected subset of these uploaded files
(one factory / scenario / industry). The tool runs entirely off the selected project's data.

---

## 6. Module scope (what the S&OP tool must do)

**Standard core (the three connected modules + review):**
1. **Overview** — KPI tiles + jump-off cards to each module.
2. **Workflow** — the monthly S&OP cycle: steps, owners, meeting sequence (D-4…D+2),
   role clarity (bow-tie). Educational + process-anchoring.
3. **Demand** — baseline vs actuals, scenario levers (growth/price/margin sliders),
   revenue/volume/CM views, **forecast accuracy (MAPE) & BIAS** by SKU/customer, demand mix.
4. **Supply & MPS** — RM/WIP/FG inventory split by plant, **RCCP capacity vs plan**,
   constrained vs unconstrained, utilisation.
5. **Inventory** — plant × category stock, days of supply, obsolescence, variance, observations.
6. **S&OP Summary** — full KPI **scorecard** (OTIF, forecast accuracy, inventory days,
   freight %, savings, cycle health) with green/amber/red.
7. **Control Tower** — all KPIs in one pulse view + **alerts/exceptions** + capacity.
8. **AI Assistant** — see §7.

**Advanced modules (gated, "more than standard"):**
- Demand sensing / bias auto-correction
- Capacity solution **solver** (Saturday/3rd-shift/holiday scenarios w/ cost-per-minute)
- BOM navigator + **pegging** (qty/date → required orders, lead times)
- Multi-echelon inventory / safety-stock optimisation
- Supplier & risk (lead-time, reliability, route mapping)
- Demand/supply **gap analysis** & decision log

---

## 7. AI features (where AI earns its place)

Grounded on the project's Convex data (RAG via vector search), powered by Claude:
- **Chat with your data** — "Why is Chennai inventory over target?" → grounded answer + chart.
- **Natural-language planning edits** — "increase B2C SKUs in November by 10%" → applies
  to the forecast and logs the change (for coaching/audit).
- **Auto S&OP narrative** — one-click executive summary / board-ready report from the cycle.
- **Anomaly & "areas to investigate"** — proactively surfaces KPI breaches, bias drift,
  capacity overloads, obsolescence risk, with suggested root causes.
- **Scenario narration** — explains trade-offs between what-if scenarios in plain language.
- **Capacity recommendations** — ranks overload solutions by cost/feasibility.

---

## 8. Standardised outputs (for Mutares directors)

One consistent export per project: **S&OP one-pager** (KPI scorecard + demand/supply/
inventory snapshot + top alerts + decisions) as PDF + Excel. Same shape for every
factory → directors compare portfolio companies apples-to-apples.

---

## 9. Delivery phases

- **Phase 0 — Scaffolding (this step):** repo wired to GitHub; Vite+React+TS+Tailwind+
  Convex; Mutares theme/design system; app shell (sidebar+topbar); Workspace front door
  (scenario gallery + file-explorer skeleton + project list); **placeholder pages for all
  8 tool modules**; Convex schema stub; Convex MCP server connected; deploy a preview.
- **Phase 1 — Data onboarding:** template downloads, CSV upload + Zod validation + error
  report, Convex storage, Project CRUD, file selection, 2–3 generated sample industries.
- **Phase 2 — Demand module** on real project data (charts, levers, MAPE/BIAS).
- **Phase 3 — Supply & MPS** (RM/WIP/FG, RCCP, capacity).
- **Phase 4 — Inventory + S&OP Summary scorecard + Control Tower.**
- **Phase 5 — AI Assistant** (RAG chat, NL edits, report gen, anomaly detection).
- **Phase 6 — Exports + advanced modules + polish.**

Each phase ends in something clickable you can react to; you drive scope with feedback.

---

## 10. Open decisions (confirm before Phase 0)

1. **Framework:** Vite + React (recommended, pure app) vs Next.js (Vercel-native).
2. **Auth / multi-tenant** in the MVP, or single-user/local for now (add auth later)?
3. **Sample data:** generate 2–3 hypothetical industries now, or start with the
   provided Sealings dataset only?
