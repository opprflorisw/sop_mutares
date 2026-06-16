// ============================================================
// Dynamic dashboards — pure types shared by the widget registry, the
// grid renderer, the Convex store and the dashboard switcher.
//
// A dashboard is just an ordered list of placed widgets. Each widget
// references a registered widget id and carries its grid size (12-col
// width + row-height units) and optional per-widget config. This maps
// cleanly to react-grid-layout (Phase 4) and serialises to Convex.
// ============================================================

export type WidgetCategory =
  | "kpi" | "demand" | "supply" | "capacity" | "inventory" | "governance";

export type PlacedWidget = {
  widgetId: string;
  w: number; // grid columns (1–12)
  h: number; // row-height units (~110px each) — used by the grid for rhythm / RGL
  x?: number; // RGL column (Phase 4)
  y?: number; // RGL row (Phase 4)
  config?: Record<string, unknown>;
};

export type DashboardDef = {
  id: string;
  name: string;
  icon?: string; // icon key
  description?: string;
  system?: boolean; // built-in template (not user-deletable)
  dynamic?: boolean; // widgets computed from data (exceptions-first)
  widgets: PlacedWidget[];
};

// A saved dashboard from Convex (adds ownership / scope metadata).
export type StoredDashboard = DashboardDef & {
  scope: "template" | "project" | "user";
  owner?: string;
};
