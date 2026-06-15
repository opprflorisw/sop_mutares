import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// VulOps register (per project) — Vulnerabilities & Opportunities.
// The risk/upside list that every S&OP meeting reviews and decides on.

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const rows = await ctx.db
      .query("vulops")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    return rows
      .sort((a, b) => b.impact - a.impact)
      .map((r) => ({
        id: r._id as string,
        kind: r.kind,
        title: r.title,
        impact: r.impact,
        likelihood: r.likelihood,
        owner: r.owner,
        status: r.status,
        createdAt: r.createdAt,
      }));
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    kind: v.union(v.literal("vulnerability"), v.literal("opportunity")),
    title: v.string(),
    impact: v.number(),
    likelihood: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    owner: v.string(),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("vulops", { ...args, status: "open", createdAt: Date.now() }),
});

export const setStatus = mutation({
  args: {
    id: v.id("vulops"),
    status: v.union(v.literal("open"), v.literal("mitigating"), v.literal("closed")),
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status });
  },
});

export const remove = mutation({
  args: { id: v.id("vulops") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
