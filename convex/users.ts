import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// Users (staged — Phase 1).
// NOTE: passwords are hashed before reaching the DB in production.
// This MVP stores a placeholder hash; swap in a real hash (e.g. via
// a Convex action using bcrypt/scrypt) when wiring real auth.
// ============================================================

export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(({ passwordHash: _h, ...u }) => u);
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const seeds = [
      { name: "Floris", email: "floris@oppr.ai" },
      { name: "Sanchay", email: "sanchay@oppr.ai" },
    ];
    for (const s of seeds) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", s.email))
        .first();
      if (!existing) {
        await ctx.db.insert("users", {
          name: s.name,
          email: s.email,
          role: "Admin",
          passwordHash: "seed:12345678", // replace with real hash
          createdAt: Date.now(),
        });
      }
    }
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("Admin"), v.literal("Planner"), v.literal("Viewer")),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) throw new Error("Email already in use.");
    return ctx.db.insert("users", { ...args, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
