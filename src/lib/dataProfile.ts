// ============================================================
// DataProfile — the "what did you actually upload, and is it usable"
// layer. Sits BETWEEN raw uploaded CSVs and widget availability.
//
// Unlike projectData (which derives module numbers), this inspects the
// data itself: which templates are present, row counts, date coverage,
// and per-field value quality (present? % filled? distinct? samples?).
// A stable `fingerprint` of the present columns powers the "same format?"
// check used for re-upload drift detection.
//
// Pure + cheap; safe to memoise per project. No rendering, no Convex.
// ============================================================

import { parseCsv } from "./csv";
import { TEMPLATES, type DataTemplate, type TemplateField } from "./templates";
import { activeVersion, findFile, type Project } from "./projects";

export type FieldProfile = {
  name: string;
  expectedType: TemplateField["type"];
  required: boolean;
  present: boolean; // column exists in the uploaded header
  nonNullPct: number; // 0–1 fraction of rows with a non-empty value
  distinct: number; // distinct non-empty values seen
  sample: string[]; // up to 5 example values (for the gallery / AI guide)
};

export type TemplateProfile = {
  templateId: string;
  title: string;
  module: DataTemplate["module"];
  requirement: DataTemplate["requirement"];
  uploaded: boolean;
  rows: number;
  /** present required columns / total required columns (0–1). */
  requiredCoverage: number;
  /** missing required column names (the headline drift signal). */
  missingRequired: string[];
  /** columns in the upload that the template doesn't define. */
  extraColumns: string[];
  dateCoverage?: { start: string; end: string; periods: number; gaps: number };
  fields: FieldProfile[];
  /** stable hash of the present columns — "same format" iff equal. */
  fingerprint: string;
  quality: "good" | "warning" | "error" | "missing";
};

export type DataProfile = {
  projectId: string;
  industry: string;
  templates: TemplateProfile[];
  /** quick lookups */
  uploadedIds: Set<string>;
  byId: Map<string, TemplateProfile>;
};

// A stable, dependency-free fingerprint of a column set: sorted, joined.
// Same set of present columns → identical string → "same format".
function fingerprintColumns(present: string[]): string {
  return [...present].map((c) => c.trim().toLowerCase()).sort().join("|");
}

function profileTemplate(
  template: DataTemplate,
  project: Project
): TemplateProfile {
  const file = findFile(project, template.id);
  const version = file ? activeVersion(file) : undefined;

  if (!version) {
    return {
      templateId: template.id,
      title: template.title,
      module: template.module,
      requirement: template.requirement,
      uploaded: false,
      rows: 0,
      requiredCoverage: 0,
      missingRequired: template.fields.filter((f) => f.required).map((f) => f.name),
      extraColumns: [],
      fields: template.fields.map((f) => ({
        name: f.name,
        expectedType: f.type,
        required: f.required,
        present: false,
        nonNullPct: 0,
        distinct: 0,
        sample: [],
      })),
      fingerprint: "",
      quality: "missing",
    };
  }

  const { headers, rows } = parseCsv(version.content);
  const headerSet = new Set(headers.map((h) => h.trim().toLowerCase()));
  const known = new Set(template.fields.map((f) => f.name.toLowerCase()));

  const fields: FieldProfile[] = template.fields.map((f) => {
    const present = headerSet.has(f.name.toLowerCase());
    if (!present) {
      return { name: f.name, expectedType: f.type, required: f.required, present: false, nonNullPct: 0, distinct: 0, sample: [] };
    }
    let filled = 0;
    const seen = new Set<string>();
    const sample: string[] = [];
    for (const row of rows) {
      const v = (row[f.name] ?? "").trim();
      if (v !== "") {
        filled++;
        if (!seen.has(v)) {
          seen.add(v);
          if (sample.length < 5) sample.push(v);
        }
      }
    }
    return {
      name: f.name,
      expectedType: f.type,
      required: f.required,
      present: true,
      nonNullPct: rows.length ? filled / rows.length : 0,
      distinct: seen.size,
      sample,
    };
  });

  const requiredFields = template.fields.filter((f) => f.required);
  const presentRequired = requiredFields.filter((f) => headerSet.has(f.name.toLowerCase()));
  const missingRequired = requiredFields.filter((f) => !headerSet.has(f.name.toLowerCase())).map((f) => f.name);
  const extraColumns = headers.filter((h) => !known.has(h.trim().toLowerCase()));

  let dateCoverage: TemplateProfile["dateCoverage"];
  if (template.timeSeries && version.coverage) {
    dateCoverage = {
      start: version.coverage.start,
      end: version.coverage.end,
      periods: 0, // filled by caller-side derivations if needed; missing count below is the signal
      gaps: version.coverage.missing.length,
    };
  }

  const quality: TemplateProfile["quality"] =
    missingRequired.length || rows.length === 0
      ? "error"
      : dateCoverage && dateCoverage.gaps > 0
        ? "warning"
        : "good";

  return {
    templateId: template.id,
    title: template.title,
    module: template.module,
    requirement: template.requirement,
    uploaded: true,
    rows: rows.length,
    requiredCoverage: requiredFields.length ? presentRequired.length / requiredFields.length : 1,
    missingRequired,
    extraColumns,
    dateCoverage,
    fields,
    fingerprint: fingerprintColumns(headers),
    quality,
  };
}

/** Profile every template for a project from its ACTIVE uploaded versions. */
export function profileProject(project: Project): DataProfile {
  const templates = TEMPLATES.map((t) => profileTemplate(t, project));
  return {
    projectId: project.id,
    industry: project.industry,
    templates,
    uploadedIds: new Set(templates.filter((t) => t.uploaded).map((t) => t.templateId)),
    byId: new Map(templates.map((t) => [t.templateId, t])),
  };
}

/**
 * Drift check for a candidate re-upload: compare a new CSV's header against
 * the template (and, if given, the fingerprint the dashboard was built on).
 * Returns whether the format still matches and what changed.
 */
export function checkDrift(
  template: DataTemplate,
  newHeaders: string[],
  expectedFingerprint?: string
): {
  sameFormat: boolean;
  missingRequired: string[];
  missingOptional: string[];
  extraColumns: string[];
} {
  const headerSet = new Set(newHeaders.map((h) => h.trim().toLowerCase()));
  const known = new Set(template.fields.map((f) => f.name.toLowerCase()));
  const missingRequired = template.fields.filter((f) => f.required && !headerSet.has(f.name.toLowerCase())).map((f) => f.name);
  const missingOptional = template.fields.filter((f) => !f.required && !headerSet.has(f.name.toLowerCase())).map((f) => f.name);
  const extraColumns = newHeaders.filter((h) => !known.has(h.trim().toLowerCase()));
  const fp = fingerprintColumns(newHeaders);
  const sameFormat = expectedFingerprint ? fp === expectedFingerprint : missingRequired.length === 0;
  return { sameFormat, missingRequired, missingOptional, extraColumns };
}
