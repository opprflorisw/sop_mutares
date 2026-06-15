import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// Users + simple email/password auth (demo-grade).
// ============================================================

const role = v.union(v.literal("Admin"), v.literal("Planner"), v.literal("Viewer"));

function toPublic(u: {
  _id: string;
  name: string;
  email: string;
  role: "Admin" | "Planner" | "Viewer";
  createdAt: number;
}) {
  return { id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(toPublic);
  },
});

/** Returns the public user if email+password match, else null. */
export const authenticate = query({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!user) return null;
    if (user.passwordHash !== password) return null;
    return toPublic(user);
  },
});

export const create = mutation({
  args: { name: v.string(), email: v.string(), role, password: v.string() },
  handler: async (ctx, { name, email, role: r, password }) => {
    const normalized = email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();
    if (existing) throw new Error("Email already in use.");
    return ctx.db.insert("users", {
      name: name.trim(),
      email: normalized,
      role: r,
      passwordHash: password,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
