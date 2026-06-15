import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================
// Convex schema (staged — Phase 1).
// Mirrors the client-side contexts (auth, projects, templates) so
// the storage layer can move from localStorage to Convex with a
// localised change. Activate with `npx convex dev`.
// ============================================================

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("Admin"), v.literal("Planner"), v.literal("Viewer")),
    // For the MVP, store a salted hash here (not plain text) once auth moves
    // server-side. Kept as a string field for now.
    passwordHash: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  projects: defineTable({
    name: v.string(),
    industry: v.string(),
    factory: v.string(),
    description: v.string(),
    currency: v.string(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  }),

  // A file uploaded into a project, validated against a template.
  projectFiles: defineTable({
    projectId: v.id("projects"),
    templateId: v.string(), // matches src/lib/templates.ts ids
    fileName: v.string(),
    rows: v.number(),
    status: v.union(v.literal("valid"), v.literal("pending"), v.literal("error")),
    // Convex file storage handle for the raw upload.
    storageId: v.optional(v.id("_storage")),
    uploadedAt: v.number(),
  }).index("by_project", ["projectId"]),

  // Parsed/normalised rows. One row per CSV line, typed by template.
  // Generic JSON payload keeps Phase 1 flexible; later phases can split
  // into typed tables per module if needed.
  dataRows: defineTable({
    projectId: v.id("projects"),
    templateId: v.string(),
    payload: v.any(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_template", ["projectId", "templateId"]),
});
