// ============================================================
// Dashboard generator (Phase C) — "Create my dashboards from scratch".
//
// Given a DataProfile + chosen industry, this picks the most-interesting
// READY widgets for each of the four pages and lays them out into a
// starter dashboard per page. Deterministic: same data + industry →
// same dashboards (the property that lets a Blueprint reconstruct
// elsewhere). The user then customises from there.
// ============================================================

import type { DataProfile } from "./dataProfile";
import type { IndustryKey, ModuleKey } from "./dashboardModel";
import type { DashboardDef, DashboardPage, PlacedWidget } from "./dashboards";
import { WIDGET_CATALOG, readinessFor, type CatalogEntry } from "./widgetCatalog";
import { getWidget } from "../components/widgets/registry";

const PAGES: { page: DashboardPage; module: ModuleKey; name: string; icon: string; description: string }[] = [
  { page: "overview", module: "overview", name: "Generated overview", icon: "dashboard", description: "Auto-built from your data: the headline KPIs, the gap, exceptions and governance." },
  { page: "demand", module: "demand", name: "Generated demand", icon: "chart", description: "Auto-built: consensus plan, accuracy and the demand mix your data supports." },
  { page: "supply", module: "supply", name: "Generated supply", icon: "factory", description: "Auto-built: the constrained gap, inventory and material risk your data supports." },
  { page: "capacity", module: "capacity", name: "Generated capacity", icon: "box", description: "Auto-built: line utilisation and the production schedule your data supports." },
];

const isKpi = (e: CatalogEntry) => e.widgetId === "stat";

/** A placed widget from a catalog entry, sized from the registry default. */
export function placeFromCatalog(entry: CatalogEntry): PlacedWidget {
  const def = getWidget(entry.widgetId);
  return {
    widgetId: entry.widgetId,
    w: def?.defaultSize.w ?? 6,
    h: def?.defaultSize.h ?? 3,
    config: entry.config,
  };
}

/**
 * Build the four starter dashboards. KPI stats lead each page (highlighted
 * first, capped at 6), then highlighted panels, then any remaining ready
 * panels — so the page opens on the numbers and the most decision-relevant
 * visuals without becoming a wall.
 */
export function generateStarterDashboards(
  profile: DataProfile,
  industry?: IndustryKey,
  opts: { maxPanelsPerPage?: number } = {}
): { page: DashboardPage; def: DashboardDef }[] {
  const maxPanels = opts.maxPanelsPerPage ?? 6;

  return PAGES.map(({ page, module, name, icon, description }) => {
    const ready = WIDGET_CATALOG.filter(
      (e) => e.module === module && readinessFor(e, profile, industry).state === "ready"
    );

    const kpis = ready.filter(isKpi);
    const panels = ready.filter((e) => !isKpi(e));

    // KPIs: highlighted first, cap 6.
    const kpiOrder = [...kpis].sort((a, b) => Number(!!b.highlight) - Number(!!a.highlight)).slice(0, 6);
    // Panels: highlighted first, then the rest, cap maxPanels.
    const panelOrder = [...panels].sort((a, b) => Number(!!b.highlight) - Number(!!a.highlight)).slice(0, maxPanels);

    const widgets: PlacedWidget[] = [
      ...kpiOrder.map((e) => ({ ...placeFromCatalog(e), w: 2, h: 1 })),
      ...panelOrder.map(placeFromCatalog),
    ];

    const def: DashboardDef = {
      id: `gen-${page}`,
      name,
      icon,
      page,
      description,
      widgets,
    };
    return { page, def };
  });
}

/** Count how many widgets the generator would produce per page (for preview UI). */
export function previewGeneration(profile: DataProfile, industry?: IndustryKey) {
  return generateStarterDashboards(profile, industry).map(({ page, def }) => ({
    page,
    count: def.widgets.length,
  }));
}
