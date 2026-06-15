import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================
// Convex schema — persistent backend for the S&OP Planner.
// Mirrors the client types in src/lib so the data layer moved off
// localStorage cleanly. CSV content is stored inline (demo files are
// small); large-file storage can move to ctx.storage later.
// ============================================================

const fileStatus = v.union(
  v.literal("valid"),
  v.literal("warning"),
  v.literal("error")
);

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("Admin"), v.literal("Planner"), v.literal("Viewer")),
    // Demo-grade: stores the password directly. Swap for a real hash later.
    passwordHash: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  projects: defineTable({
    name: v.string(),
    industry: v.string(),
    factory: v.string(),
    description: v.string(),
    currency: v.string(),
    createdAt: v.number(),
  }),

  // One row per uploaded file VERSION. Versions for the same
  // (project, template) are grouped client-side; the active one is
  // what the tool reads.
  // Governed demand overrides — consensus adjustments on top of the
  // baseline forecast, with a reason code and auto-expiry (for audit + FVA).
  overrides: defineTable({
    projectId: v.id("projects"),
    family: v.string(),
    pct: v.number(), // +/- % applied to the family's baseline demand
    reason: v.string(),
    expires: v.string(), // free text period, e.g. "Wk 26" / "Dec'23"
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // VulOps — Vulnerabilities & Opportunities register. An output of
  // every S&OP/IBP meeting: risks to the plan and upside levers, each
  // sized by value impact, with an owner and status.
  vulops: defineTable({
    projectId: v.id("projects"),
    kind: v.union(v.literal("vulnerability"), v.literal("opportunity")),
    title: v.string(),
    impact: v.number(), // value impact (currency); risk = downside, opp = upside
    likelihood: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    owner: v.string(),
    status: v.union(v.literal("open"), v.literal("mitigating"), v.literal("closed")),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // S&OP decision & action log — the artifact that turns the review
  // into committed actions (owner, status, due date) per project.
  decisions: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    owner: v.string(),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("done")),
    due: v.string(),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  projectFiles: defineTable({
    projectId: v.id("projects"),
    templateId: v.string(),
    version: v.number(),
    fileName: v.string(),
    rows: v.number(),
    status: fileStatus,
    issues: v.array(v.string()),
    coverage: v.optional(
      v.object({
        start: v.string(),
        end: v.string(),
        missing: v.array(v.string()),
      })
    ),
    content: v.string(),
    active: v.boolean(),
    uploadedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_template", ["projectId", "templateId"]),
});
