import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// Projects + linked files (staged — Phase 1).
// ============================================================

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("projects").collect(),
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return null;
    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    return { ...project, files };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    industry: v.string(),
    factory: v.string(),
    description: v.string(),
    currency: v.string(),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("projects", { ...args, createdAt: Date.now() }),
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const f of files) await ctx.db.delete(f._id);
    await ctx.db.delete(args.id);
  },
});

// Generate a short-lived upload URL for a CSV file (Convex file storage).
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const attachFile = mutation({
  args: {
    projectId: v.id("projects"),
    templateId: v.string(),
    fileName: v.string(),
    rows: v.number(),
    status: v.union(v.literal("valid"), v.literal("pending"), v.literal("error")),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("projectFiles", { ...args, uploadedAt: Date.now() }),
});
