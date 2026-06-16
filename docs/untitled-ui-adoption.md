# Untitled UI Adoption Plan

Goal: adopt **Untitled UI React** components across the S&OP tool for one coherent, polished
look. This is the *implementation vehicle* for `docs/ui-polish-plan.md` — Untitled UI supplies the
primitives (Metrics, Buttons, Tables, Badges…) and design tokens that plan called for.

## How Untitled UI works (and fit with our stack)
- **Copy-paste source, no lock-in** — components land as source files in our repo (CLI `npx untitledui@latest …` or copy from site/GitHub). Fits our "own the code" pattern; open-source components are MIT (some advanced/PRO ones need a licence — flag per component).
- Built on **Tailwind CSS v4.2** (we're on v4 ✓), **React Aria** (accessibility engine — a new dependency), **React 19.2**.
- **Compatibility flags (decisions in §5):** we're on **React 18.3** (their target is 19) and already standardised on **Tabler icons**; their charts are Recharts-based (we use Recharts ✓).

---

## 1. Component map — surface → Untitled UI component

### Foundation
| Our need | Untitled UI |
|---|---|
| Design tokens (the missing type/space/color/radius scale) | **Theme variables** (their Tailwind v4 token set + dark-mode vars) |
| Section/Card headers (replace `CardTitle`) | **Card headers**, **Section headers** |
| Page titles | **Page headers** |
| Dividers | **Content dividers**, **Featured icons** |

### Base primitives (the `components/ui.tsx` layer)
| Our element | Untitled UI |
|---|---|
| Buttons (primary/default/ghost/danger), icon buttons | **Buttons**, **Utility buttons** |
| Dashboard tab chips, segmented controls (Revenue/Volume/CM), Explore/Matrix | **Button groups**, **Tabs** |
| Status pills (valid/warning/error), RAG chips, module/live-planned tags | **Badges**, **Badge groups**, **Tags** |
| User avatar (topbar) | **Avatars** |
| Kebab row menu, filter "gear" popover | **Dropdowns** |
| Hints on metrics / icon buttons | **Tooltips** |
| Login email/password, settings fields, new-project form | **Inputs**, **Textareas**, **Select** |
| Widget filters (hide families/plants/severity) | **Multi select**, **Checkboxes** |
| What-if lever, planning-level | **Sliders** |
| Version "active" picker | **Radio groups** |
| Module/layer toggles, settings switches | **Toggles** |

### Application UI (the dashboards)
| Our element | Untitled UI |
|---|---|
| KPI tiles ⭐ (number + delta + RAG + sparkline + target) | **Metrics**, **Activity gauges** |
| Gap / inventory / utilisation charts | **Line & bar charts**, **Pie charts** (Recharts-based) |
| All data tables (gap, SKU accuracy, schedule, files, decisions, matrix) | **Tables**, **Pagination** |
| Tool sidebar | **Sidebar navigations** |
| Workspace top nav | **Header navigations** |
| Tool breadcrumb | **Breadcrumbs** |
| AI data-check findings, smart-upload result, data issues | **Alerts**, **Notifications** |
| AI assistant drawer | **Slideout menus**, **Messaging** |
| "No decisions / No SLOB / No supplier risk" | **Empty states** |
| AI spinner, Convex cold-load | **Loading indicators**, **Progress indicators** |
| Readiness completeness bars | **Progress indicators**, **Progress steps** |
| Page-level filter + reset, widget gear | **Filter bars** |
| CSV viewer, Report builder, New project | **Modals**, **Slideout menus** |
| Smart upload / data manager upload | **File uploaders** |
| Toasts / confirmations | **Notifications** |
| (Optional) global jump-to | **Command menus** |
| (Future) horizon / period selection | **Date pickers**, **Calendars** |

### Reference / examples to lift layouts from
- **Dashboards 01 / 02** → Overview & module pages structure
- **Settings pages 01 / 02** → Settings & Accounts
- **Log in pages** → Login polish

---

## 2. Master list of components we'll adopt
**Base:** Buttons · Button groups · Utility buttons · Badges · Badge groups · Tags · Avatars ·
Dropdowns · Tooltips · Inputs · Textareas · Select · Multi select · Checkboxes · Radio groups ·
Toggles · Sliders · Featured icons.

**Application UI:** Metrics · Activity gauges · Tables · Tabs · Sidebar navigations · Header
navigations · Breadcrumbs · Page headers · Section headers · Card headers · Alerts · Notifications ·
Empty states · Loading indicators · Progress indicators · Progress steps · Filter bars · Modals ·
Slideout menus · File uploaders · Line & bar charts · Pie charts · Content dividers · (optional)
Command menus.

---

## 3. Rollout phases (each shippable)
1. **Theme + tokens** ✅ *(done — `src/index.css`)* — Untitled UI gray ramp + success/warning/error ramps, radius/shadow/type scales; Mutares navy kept; neutral aliases re-pointed onto the gray ramp so the UI shifts coherently with zero call-site churn. Build verified.
2. **Base primitives** ✅ *(done — `components/ui.tsx`)* — `Card` (elevation), `CardTitle`, new `SectionHeader`, `KpiTile` (Untitled UI "Metrics": big tabular number + up/down delta arrow), `Tag` (soft semantic-ramp pill badges with rings + optional dot), `Button` (variants + sizes + focus ring), plus new `EmptyState` & `Skeleton`. Same export names → every page upgraded with zero churn. Build + screenshots verified.
3. **App shell** ✅ *(done — `ToolLayout`, `WorkspaceLayout`)* — sidebar + header nav restyled to Untitled UI (brand-50 active, gray-100 hover, focus rings, rounded-lg), topbar pill on the gray ramp, header elevation. *(Remaining: dedicated Breadcrumb/Slideout components — optional.)*
4. **Metrics & data-viz** — Metrics cards (the KPI rebuild) + chart theme (Line/Bar/Pie) + Tables.
5. **States & inputs** — Empty states, Loading/Progress, Alerts/Notifications, Filter bars, Sliders, File uploader, Modals.
6. **Surface pass** — apply across Overview, Demand, Supply, Capacity, Data Manager, Workspace, Dashboard model, Login, Settings; density + responsive audit.

---

## 4. How code lands
- Per component: copy source into `src/components/untitled/` (or via their CLI), re-export through our `ui.tsx` so pages import from one place.
- Adopt their token variables once; our `colors.ts` semantic palette layers on top for charts.

---

## 5. Decisions to confirm before building
1. **React 18 → 19 bump?** Untitled UI targets React 19.2 + React Aria. Recommend bumping (low risk on Vite) for clean compatibility; alternative is cherry-picking components that run on 18.
2. **Icons:** keep **Tabler** (already standardised) or switch to **Untitled UI Icons** for full coherence? Recommend keep Tabler, skin everything else with Untitled UI.
3. **React Aria dependency** — OK to add as the accessibility engine?
4. **PRO vs free** — confirm any advanced component we use is in the open-source set (most base/Application UI are); avoid paid-only pieces unless licensed.
5. **Coordinate** — the other session is editing tool pages; start in tokens + `ui.tsx` (low collision), do the surface pass last.

> Sources: untitledui.com/react, untitledui.com/react/components, github.com/untitleduico/react.
