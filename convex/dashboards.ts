import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Saved dashboards (per project) — customised layouts on top of the
// built-in templates. A dashboard is just an ordered list of placed
// widgets. Shared across users of a project for the demo.

const placedWidget = v.object({
  widgetId: v.string(),
  w: v.number(),
  h: v.number(),
  x: v.optional(v.number()),
  y: v.optional(v.number()),
  config: v.optional(v.any()),
});

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const rows = await ctx.db
      .query("dashboards")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    return rows
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((r) => ({
        id: r._id as string,
        name: r.name,
        icon: r.icon,
        description: r.description,
        owner: r.owner,
        widgets: r.widgets,
        updatedAt: r.updatedAt,
      }));
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    owner: v.string(),
    widgets: v.array(placedWidget),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("dashboards", { ...args, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: {
    id: v.id("dashboards"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    widgets: v.optional(v.array(placedWidget)),
  },
  handler: async (ctx, { id, ...patch }) => {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v2]) => v2 !== undefined));
    await ctx.db.patch(id, { ...clean, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("dashboards") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
