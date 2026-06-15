import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// S&OP decision & action log (per project).

const status = v.union(v.literal("open"), v.literal("in_progress"), v.literal("done"));

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const rows = await ctx.db
      .query("decisions")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({ id: r._id as string, title: r.title, owner: r.owner, status: r.status, due: r.due, createdAt: r.createdAt }));
  },
});

export const create = mutation({
  args: { projectId: v.id("projects"), title: v.string(), owner: v.string(), due: v.string() },
  handler: async (ctx, args) =>
    ctx.db.insert("decisions", { ...args, status: "open", createdAt: Date.now() }),
});

export const setStatus = mutation({
  args: { id: v.id("decisions"), status },
  handler: async (ctx, { id, status: s }) => {
    await ctx.db.patch(id, { status: s });
  },
});

export const remove = mutation({
  args: { id: v.id("decisions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
