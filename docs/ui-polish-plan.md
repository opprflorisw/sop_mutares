# UI/UX Polish Plan — S&OP Planner

Grounded in a full screenshot pass of every page (`screenshots/ui-audit/`): login, workspace,
Dashboard model, Overview, Demand, Supply, Capacity, Settings, Data Manager.

**Verdict:** the information architecture and content are strong; the *skin* is flat and
utilitarian. The fix is **not a redesign** — it's a token + primitive layer that lifts every
surface at once. Keep the navy/Recharts/Tabler stack. No IA changes.

---

## 1. Diagnosis — at component level

| # | Component | What's holding it back |
|---|---|---|
| 1 | **Tokens** | Pixel-literal sizes everywhere (`text-[12.5px]`, `p-3.5`, `py-2.5`) → no rhythm; no type scale, elevation scale, or spacing scale. Every fix is bespoke. |
| 2 | **KPI tile** | The most-viewed element is the flattest: plain number + tiny delta. No trend sparkline, no target/RAG bar, weak number emphasis. |
| 3 | **Card** | One hairline border on grey, no elevation, no header treatment, no hover. Everything reads at the same weight → no hierarchy. |
| 4 | **Section header** (`CardTitle`) | Just bold 13px text; the gear/tag cluster is ad-hoc per page. No consistent eyebrow/title/action pattern. |
| 5 | **Tables** | Dense, no zebra/hover rhythm, inconsistent cell padding, right-align not always tabular-nums. Status pills are good. |
| 6 | **Charts** | Recharts near-defaults: faint axes, no value labels, default tooltips, inconsistent heights, bars not consistently rounded. No shared theme. |
| 7 | **Buttons / pills** | Several ad-hoc pill/segmented implementations (filter chips, tabs, scenario tags) instead of one variant set. |
| 8 | **States** | Empty = plain grey text ("No items logged"); loading = "Loading…"/spinner only. No skeletons, no illustrative empty states. |
| 9 | **Motion / affordance** | Minimal hover, focus rings, and transitions → feels static, not "premium". |
| 10 | **Consistency** | Workspace uses a bold gradient hero; tool pages are flat. Spacing/radius vary card to card. |

---

## 2. Approach (principles)

1. **Token-first.** Define a type / spacing / elevation / radius scale once in `index.css @theme`; refactor pixel-literals to it. Highest leverage, lowest risk.
2. **Primitive-driven.** A tight set in `components/ui.tsx` is the single source of truth; pages compose, never restyle.
3. **Variants over forks.** Manage component variants with `cva` + `clsx`/`tailwind-merge` (one tiny dep) instead of string soup.
4. **Polish the data-viz as a system**, not chart-by-chart (shared `ChartCard` + Recharts theme).
5. **Ship per phase** — each phase is independently mergeable and visible.

---

## 3. Component inventory & target

| Component | Target treatment | How |
|---|---|---|
| **Design tokens** | `--text-{xs..2xl}`, `--space-*`, `--shadow-{sm,md}`, `--radius-*`; one neutral ramp | `@theme` in `index.css`; replace `[12.5px]` literals |
| **Card** | Subtle elevation (`shadow-sm` + lighter border), optional `tone`/`pad`/`hover` props, header slot | extend existing `Card` |
| **SectionHeader** | eyebrow + title + right-actions slot; replaces `CardTitle` | new primitive; back-compat alias |
| **KpiTile** ⭐ | big tabular number, RAG dot, **mini-sparkline**, target-vs-actual micro-bar, delta with arrow | rebuild `KpiTile`; sparkline via tiny Recharts `<Line>` or inline SVG |
| **Tag / Pill / Segmented** | one `cva` variant set (tone × size); used by filter chips, tabs, scenario tags | consolidate into `ui.tsx` |
| **Button** | refined sizes, focus ring, loading state, icon spacing | extend existing `Button` |
| **Table** | `Table`/`Row`/`Cell` primitives: zebra option, hover, tabular-nums, sticky header | new lightweight primitives |
| **ChartCard + chart theme** | shared wrapper (title/actions/height) + Recharts defaults (axis, grid, tooltip, rounded bars, value labels) | new `ChartCard`; central `chartTheme.ts` (extends `colors.ts`) |
| **EmptyState** | icon + headline + hint + optional action | new primitive |
| **Skeleton** | shimmer blocks for KPI/table/chart while Convex loads | new primitive |
| **Tabs / Segmented control** | the dashboard chips + module/layer tabs unified | one primitive |
| **Modal** | already solid (CsvModal) — align radius/elevation to tokens | minor |

---

## 4. Phased plan

**Phase 1 — Foundation (tokens).** Type/space/elevation/radius scale in `@theme`; refactor
pixel-literals on the shared primitives. *No visible regression; sets the rhythm.* ½–1 day.

**Phase 2 — Core primitives.** Rebuild `Card`, `SectionHeader`, `KpiTile` (★ sparkline + RAG +
target bar), consolidated `Tag`/`Pill`/`Segmented`, `Button`, `Table`. *This is where the lift shows.* 1–2 days.

**Phase 3 — Data-viz system.** `ChartCard` wrapper + central Recharts theme (axes, grid, tooltip,
rounded bars, value labels, consistent heights, legend style). Apply to all charts. 1 day.

**Phase 4 — States & motion.** `EmptyState`, `Skeleton` loaders (Convex cold-load), hover/focus
rings, transitions, optional toast. ½–1 day.

**Phase 5 — Surface pass.** Apply primitives across Overview, Demand, Supply, Capacity, Data
Manager, Workspace, Dashboard model; density + responsive audit; align the workspace hero with the
tool pages. 1–2 days.

> Sequence matters: 1→2 unlock everything; 3–5 are then mostly mechanical.

---

## 5. Stack / dependencies

- **Keep:** Tailwind v4 tokens, Tabler icons, Recharts, hand-rolled primitives.
- **Add (small, optional):** `class-variance-authority` + `clsx` + `tailwind-merge` for clean variant
  management. ~3 tiny deps, no runtime weight.
- **Consider (only if a11y matters):** Radix primitives for Tabs/Tooltip/Popover/Dialog — defer
  unless needed; current hand-rolled versions are fine for a demo.

## 6. Highest-ROI quick wins (if we want one visible win first)

1. **KpiTile** rebuild (sparkline + RAG + target bar) — every page opens on these.
2. **ChartCard + Recharts theme** — instantly makes the dashboards look designed.
3. **Card elevation + SectionHeader** — adds the missing hierarchy everywhere at once.
