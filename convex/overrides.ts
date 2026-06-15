import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Governed demand overrides (per project) — consensus adjustments
// with reason code + expiry, layered on the baseline forecast.

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const rows = await ctx.db
      .query("overrides")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({ id: r._id as string, family: r.family, pct: r.pct, reason: r.reason, expires: r.expires, createdAt: r.createdAt }));
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    family: v.string(),
    pct: v.number(),
    reason: v.string(),
    expires: v.string(),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("overrides", { ...args, createdAt: Date.now() }),
});

export const remove = mutation({
  args: { id: v.id("overrides") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
