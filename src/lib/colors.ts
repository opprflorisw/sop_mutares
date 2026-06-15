// ============================================================
// Single source of truth for chart / widget colours. Keeping every
// chart on the same blue-led, on-brand palette is what makes the
// modules read as one coherent product (vs. scattered ad-hoc hex).
// ============================================================

// Semantic roles used across the S&OP charts.
export const C = {
  demand: "#85B7EB", // unconstrained demand / actuals (light blue)
  supply: "#185FA5", // constrained supply (brand navy)
  forecast: "#378ADD", // forecast / consensus (mid blue)
  good: "#1D9E75", // met / on-target (green)
  warn: "#E08A1E", // tight / watch (amber)
  bad: "#E24B4A", // gap / overload (red)
  accent: "#7F77DD", // tertiary (purple)
  grid: "#EEF0F3",
  axis: "#8A929E",
  line: "#E7EAEE",
  rm: "#185FA5", // raw material
  wip: "#E08A1E", // work in progress
  fg: "#1D9E75", // finished goods
} as const;

// Categorical series palette (families, plants, customers, lines).
// Blue-anchored, then green/amber/purple/red — coherent, high-contrast.
export const PALETTE = [
  "#185FA5", "#1D9E75", "#E08A1E", "#7F77DD", "#E24B4A",
  "#378ADD", "#0F6E56", "#B26A12", "#533AAB", "#A32D2D",
];

// Shared Recharts tooltip styling.
export const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: `1px solid ${C.line}`,
} as const;
