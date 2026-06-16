# Data-driven dashboards & the Mutares Blueprint

> The rethink: stop *showcasing* a fixed wall of KPIs. Instead — **inspect the uploaded
> data, let the data decide which widgets make sense, guide the user to assemble a
> dashboard, then keep it consistent on every new upload, and make the whole thing a
> portable asset Mutares owns and shares across its portfolio.**

## Decisions locked (2026-06-16)
1. **Hybrid AI.** Widgets are a **deterministic, versioned registry**; each widget declares
   the data it needs. AI is the **guide** — it reads the data, ranks/explains which widgets
   fit, narrates findings, recommends a starter set. AI does *not* invent un-backed widgets
   (that's parked as a later, clearly-labelled, non-portable extra). Only a deterministic
   registry makes "share a blueprint → it reconstructs on another company's data" true.
2. **Versioned / append + drift check.** Every upload is a **cycle** (we already keep
   `FileVersion` history). Widgets show the latest *and* cycle-over-cycle trend. On re-upload
   we **fingerprint** the file against the template and report drift (missing / renamed /
   extra columns) before committing; affected widgets degrade gracefully instead of crashing.
3. **Full S&OP Blueprint (playbook).** The unit of sharing is one portable artifact: the
   **data contract** (which CSVs + which fields) + the **selected widgets & layouts across all
   four pages** + **KPI targets / RAG thresholds** + the **industry layer**. Never the data.
   A portco imports it, gets blank CSV templates to fill, uploads, and the *identical*
   dashboard lights up. Versioned, so Mutares can push updates.
4. **Industry chosen at setup; gallery uses both axes.** The user picks an archetype
   (discrete / process / cpg / pharma / electronics — `Project.industry` already exists).
   The gallery sorts widgets by **readiness × industry**; the generator seeds
   *relevant-to-industry ∧ data-ready ∧ interesting*.

## What already exists (we are extending, not rebuilding)
| Capability the vision needs | Already in the codebase |
|---|---|
| Widgets gated on data | `WidgetDef.available(d)` in `widgets/registry.tsx` |
| "This is interesting right now" | `WidgetDef.flagged(d)` |
| Auto-built dashboard | `resolveDashboard()` (the dynamic "Exceptions first" board) |
| Values refresh, layout intact on re-upload | Saved dashboards reference widgets by id; `projectData` re-derives |
| Schema match an upload to a template | `detectTemplate(headers)` in `templates.ts` |
| Versioned uploads + basic drift | `FileVersion[]` history + `analyzeCsv()` (missing cols, time gaps) |
| Core / industry / specialized brain | `dashboardModel.ts` (per-element data deps + KPI) |
| Industry on the project | `Project.industry` |

## The four real gaps
1. **No data *profile*.** `available()` reads *derived* data, not "what columns/values did
   you actually upload, with what coverage." → new `DataProfile` (Phase A, this commit).
2. **No declarative widget contract.** `available()` is opaque, so we can't show the gallery
   tiers or the upsell ("upload `supplier.csv` to unlock MRP risk"). → new **widget catalog**
   with explicit `requires` / `industries` / `layer` (Phase A, this commit).
3. **No guided gallery + one-click generator** (Phases B–C).
4. **No Blueprint export/import** — the actual business model (Phase E).

## The pipeline (state machine)
```
Upload ──▶ Profile ──▶ Catalog (guided pick) ──▶ Generate ──▶ Customize ──▶ Maintain ──▶ Export / Share
 DataMgr   NEW          NEW gallery               NEW          existing      NEW drift     NEW Blueprint
 (exists)  (Phase A)    (Phase B)                 (Phase C)    builder       (Phase D)     (Phase E)
```

### New concepts
- **`DataProfile`** — per template: uploaded? rows, date coverage/gaps, and per-field
  `{ present, nonNullPct, distinct, sample }`, plus a **fingerprint** (stable hash of present
  columns) for the "same format?" check, and a `quality` verdict.
- **Widget catalog entry** — for every registry widget (and each KPI stat): `requires`
  (templateId + fields + minRows), `industries` (undefined = core/all), `layer`, `module`,
  human `blurb` ("what it shows"), `highlight` (generator seeds it first).
- **`readinessFor(entry, profile, industry)`** → `ready` | `locked {missing[]}` |
  `not-relevant {industry}`. This single function powers the gallery tiers, the upsell, the
  generator's eligibility test, and the blueprint's "can this company run it?" check.
- **`Blueprint`** — `{ version, industry, dataContract[], pages[ {page, dashboards[]} ],
  targets }`. Export = serialise the project's dashboards + chosen templates + targets to
  JSON. Import = install dashboards into a new project + surface the blank CSV templates.

## Phases (each shippable, gated for review)
- **A · Contract & Profile** *(this commit — additive, no UX, compiles clean)* —
  `lib/dataProfile.ts` + `lib/widgetCatalog.ts` (+ `readinessFor`). Nothing rendered yet.
- **B · Guided catalog/gallery** — the tutorial-esque widget gallery: Ready / Locked-needs-data
  / Industry, each card a preview + "what it shows" + "needs X", multi-select to build.
- **C · One-click generator** — "Create my dashboards" seeds the most-interesting ready
  widgets across all four pages from the profile + industry.
- **D · Maintain** — fingerprint drift check on re-upload + cycle-over-cycle trend
  ("what changed since last cycle").
- **E · Blueprint export/import** — the portable Mutares playbook (Convex `blueprints` table
  + JSON download/upload), versioned.
- **F · AI guide** — narrate the profile, recommend widgets, explain the gap (hybrid;
  AI-authored widgets stay parked).

## Watertight guarantees this buys
- A widget is offered **iff** the data backs it (deterministic, not vibes).
- Re-upload in the same format → **only values move**; drift is caught and reported, never silent.
- A Blueprint reconstructs the **same** dashboard on any company whose data satisfies the
  contract — the asset Mutares owns and distributes.
