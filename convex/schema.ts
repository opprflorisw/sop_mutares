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
