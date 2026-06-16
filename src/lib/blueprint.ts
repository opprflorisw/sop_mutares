// ============================================================
// Blueprint (Phase E) — the portable S&OP playbook Mutares owns and
// shares across its portfolio companies.
//
// A Blueprint captures everything needed to RECONSTRUCT a dashboard set
// on another company's data — but never the data itself:
//   • dataContract — which CSV templates + fields the blueprint relies on
//   • pages        — the selected widgets & layouts across all four pages
//   • targets      — KPI targets / RAG thresholds
//   • industry     — the archetype it was designed for
//
// Export = serialise the project's dashboards + the data contract to JSON
// (downloadable). Import = install those dashboards into another project
// and surface the blank CSV templates to fill. Versioned via schemaVersion
// + version so Mutares can push updates.
// ============================================================

import type { DashboardPage, PlacedWidget } from "./dashboards";
import type { IndustryKey } from "./dashboardModel";
import { WIDGET_CATALOG, type CatalogEntry } from "./widgetCatalog";
import { getTemplate } from "./templates";

export const BLUEPRINT_SCHEMA_VERSION = 1;

export type BlueprintDashboard = {
  name: string;
  icon?: string;
  description?: string;
  widgets: PlacedWidget[];
};

export type BlueprintPage = {
  page: DashboardPage;
  dashboards: BlueprintDashboard[];
};

export type DataContractEntry = {
  templateId: string;
  title: string;
  required: boolean; // a hard dependency of at least one widget
  fields: string[]; // the columns the widgets actually use
};

export type Blueprint = {
  schemaVersion: number;
  kind: "sop-blueprint";
  name: string;
  version: number;
  industry?: IndustryKey;
  createdBy: string;
  createdAt: number;
  notes?: string;
  dataContract: DataContractEntry[];
  pages: BlueprintPage[];
  targets: Record<string, number>;
};

// Map a placed widget back to its catalog entry (KPI stats key on the metric).
function catalogEntryFor(w: PlacedWidget): CatalogEntry | undefined {
  if (w.widgetId === "stat") {
    const metric = (w.config?.metric as string) ?? "revenue";
    return WIDGET_CATALOG.find((e) => e.key === `stat:${metric}`);
  }
  return WIDGET_CATALOG.find((e) => e.key === w.widgetId);
}

/** Derive the data contract: the union of templates/fields the chosen widgets need. */
export function deriveDataContract(pages: BlueprintPage[]): DataContractEntry[] {
  const byTemplate = new Map<string, { required: boolean; fields: Set<string> }>();
  for (const p of pages) {
    for (const dash of p.dashboards) {
      for (const w of dash.widgets) {
        const entry = catalogEntryFor(w);
        if (!entry) continue;
        for (const req of entry.requires) {
          const tpl = getTemplate(req.templateId);
          const slot = byTemplate.get(req.templateId) ?? { required: false, fields: new Set<string>() };
          slot.required = true;
          const fields = req.fields ?? tpl?.fields.filter((f) => f.required).map((f) => f.name) ?? [];
          fields.forEach((f) => slot.fields.add(f));
          byTemplate.set(req.templateId, slot);
        }
      }
    }
  }
  return [...byTemplate.entries()].map(([templateId, slot]) => ({
    templateId,
    title: getTemplate(templateId)?.title ?? templateId,
    required: slot.required,
    fields: [...slot.fields],
  }));
}

/** Build a Blueprint from a project's saved dashboards (grouped by page). */
export function buildBlueprint(input: {
  name: string;
  version?: number;
  industry?: IndustryKey;
  createdBy: string;
  createdAt: number;
  notes?: string;
  dashboardsByPage: Record<DashboardPage, BlueprintDashboard[]>;
  targets?: Record<string, number>;
}): Blueprint {
  const pages: BlueprintPage[] = (Object.keys(input.dashboardsByPage) as DashboardPage[])
    .map((page) => ({ page, dashboards: input.dashboardsByPage[page] ?? [] }))
    .filter((p) => p.dashboards.length > 0);

  return {
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    kind: "sop-blueprint",
    name: input.name,
    version: input.version ?? 1,
    industry: input.industry,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    notes: input.notes,
    dataContract: deriveDataContract(pages),
    pages,
    targets: input.targets ?? DEFAULT_TARGETS,
  };
}

// Sensible default targets/RAG thresholds carried with a blueprint.
export const DEFAULT_TARGETS: Record<string, number> = {
  forecastAccuracy: 85,
  inventoryDays: 40,
  capacityUtil: 90,
};

export function serializeBlueprint(bp: Blueprint): string {
  return JSON.stringify(bp, null, 2);
}

export type ParseResult = { ok: true; blueprint: Blueprint } | { ok: false; error: string };

export function parseBlueprint(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "Not valid JSON." };
  }
  const bp = raw as Partial<Blueprint>;
  if (!bp || bp.kind !== "sop-blueprint") return { ok: false, error: "Not an S&OP blueprint file." };
  if (typeof bp.schemaVersion !== "number" || bp.schemaVersion > BLUEPRINT_SCHEMA_VERSION)
    return { ok: false, error: `Unsupported blueprint version (${bp.schemaVersion}). Update the app.` };
  if (!Array.isArray(bp.pages)) return { ok: false, error: "Blueprint has no pages." };
  return { ok: true, blueprint: bp as Blueprint };
}

/** Trigger a JSON download of a blueprint. */
export function downloadBlueprint(bp: Blueprint) {
  const safe = bp.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const blob = new Blob([serializeBlueprint(bp)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe || "blueprint"}.sop.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Given the importing project's uploaded template ids, report which parts
 * of a blueprint's data contract are satisfied vs still need data. Lets the
 * importer show "you'll need to upload X, Y" before applying.
 */
export function contractGaps(bp: Blueprint, uploadedTemplateIds: Set<string>) {
  const satisfied = bp.dataContract.filter((c) => uploadedTemplateIds.has(c.templateId));
  const missing = bp.dataContract.filter((c) => !uploadedTemplateIds.has(c.templateId));
  return { satisfied, missing };
}
