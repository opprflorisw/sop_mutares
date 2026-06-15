import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

// ============================================================
// Projects + versioned files.
// ============================================================

const fileStatus = v.union(
  v.literal("valid"),
  v.literal("warning"),
  v.literal("error")
);
const coverage = v.object({
  start: v.string(),
  end: v.string(),
  missing: v.array(v.string()),
});

function mapVersion(f: Doc<"projectFiles">) {
  return {
    id: f._id,
    version: f.version,
    fileName: f.fileName,
    rows: f.rows,
    status: f.status,
    uploadedAt: f.uploadedAt,
    content: f.content,
    issues: f.issues,
    coverage: f.coverage,
  };
}

/** All projects, each with files grouped per template into versions. */
export const listWithFiles = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    const out = [];
    for (const p of projects) {
      const files = await ctx.db
        .query("projectFiles")
        .withIndex("by_project", (q) => q.eq("projectId", p._id))
        .collect();

      const byTemplate = new Map<string, Doc<"projectFiles">[]>();
      for (const f of files) {
        const arr = byTemplate.get(f.templateId) ?? [];
        arr.push(f);
        byTemplate.set(f.templateId, arr);
      }

      const grouped = [...byTemplate.entries()].map(([templateId, versions]) => {
        versions.sort((a, b) => a.version - b.version);
        const active = versions.find((vv) => vv.active) ?? versions[versions.length - 1];
        return {
          templateId,
          activeVersionId: active._id as string,
          versions: versions.map(mapVersion),
        };
      });

      out.push({
        id: p._id as string,
        name: p.name,
        industry: p.industry,
        factory: p.factory,
        description: p.description,
        background: p.background ?? "",
        currency: p.currency,
        createdAt: p.createdAt,
        files: grouped,
      });
    }
    return out;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    industry: v.string(),
    factory: v.string(),
    description: v.string(),
    background: v.optional(v.string()),
    currency: v.string(),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("projects", { ...args, createdAt: Date.now() }),
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const files = await ctx.db
      .query("projectFiles")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    for (const f of files) await ctx.db.delete(f._id);
    await ctx.db.delete(id);
  },
});

export const addFileVersion = mutation({
  args: {
    projectId: v.id("projects"),
    templateId: v.string(),
    fileName: v.string(),
    content: v.string(),
    rows: v.number(),
    status: fileStatus,
    issues: v.array(v.string()),
    coverage: v.optional(coverage),
  },
  handler: async (ctx, args) => {
    const siblings = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_template", (q) =>
        q.eq("projectId", args.projectId).eq("templateId", args.templateId)
      )
      .collect();
    const nextVersion =
      siblings.reduce((max, s) => Math.max(max, s.version), 0) + 1;
    for (const s of siblings) {
      if (s.active) await ctx.db.patch(s._id, { active: false });
    }
    return ctx.db.insert("projectFiles", {
      projectId: args.projectId,
      templateId: args.templateId,
      version: nextVersion,
      fileName: args.fileName,
      rows: args.rows,
      status: args.status,
      issues: args.issues,
      coverage: args.coverage,
      content: args.content,
      active: true,
      uploadedAt: Date.now(),
    });
  },
});

export const setActiveVersion = mutation({
  args: { fileId: v.id("projectFiles") },
  handler: async (ctx, { fileId }) => {
    const row = await ctx.db.get(fileId);
    if (!row) return;
    const siblings = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_template", (q) =>
        q.eq("projectId", row.projectId).eq("templateId", row.templateId)
      )
      .collect();
    for (const s of siblings) {
      await ctx.db.patch(s._id, { active: s._id === fileId });
    }
  },
});

export const deleteVersion = mutation({
  args: { fileId: v.id("projectFiles") },
  handler: async (ctx, { fileId }) => {
    const row = await ctx.db.get(fileId);
    if (!row) return;
    const wasActive = row.active;
    await ctx.db.delete(fileId);
    if (!wasActive) return;
    const remaining = await ctx.db
      .query("projectFiles")
      .withIndex("by_project_template", (q) =>
        q.eq("projectId", row.projectId).eq("templateId", row.templateId)
      )
      .collect();
    if (remaining.length === 0) return;
    remaining.sort((a, b) => a.version - b.version);
    await ctx.db.patch(remaining[remaining.length - 1]._id, { active: true });
  },
});

// ---- seed (idempotent) ----
type SeedFile = {
  templateId: string;
  fileName: string;
  content: string;
  rows: number;
  status: "valid" | "warning" | "error";
  issues: string[];
  coverage?: { start: string; end: string; missing: string[] };
};

const seedFile = v.object({
  templateId: v.string(),
  fileName: v.string(),
  content: v.string(),
  rows: v.number(),
  status: fileStatus,
  issues: v.array(v.string()),
  coverage: v.optional(coverage),
});

export const ensureSeed = mutation({
  args: {
    users: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        role: v.union(v.literal("Admin"), v.literal("Planner"), v.literal("Viewer")),
        password: v.string(),
      })
    ),
    projects: v.array(
      v.object({
        name: v.string(),
        industry: v.string(),
        factory: v.string(),
        description: v.string(),
        background: v.optional(v.string()),
        currency: v.string(),
        files: v.array(seedFile),
      })
    ),
  },
  handler: async (ctx, { users, projects }) => {
    // users — insert any missing by email
    for (const u of users) {
      const email = u.email.trim().toLowerCase();
      const exists = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (!exists) {
        await ctx.db.insert("users", {
          name: u.name, email, role: u.role, passwordHash: u.password, createdAt: 0,
        });
      }
    }

    // each project — insert (with files) only if none with that name exists.
    // For projects that already exist, refresh the narrative (description +
    // background) in place without touching their files or related data.
    const existing = await ctx.db.query("projects").collect();
    const byName = new Map(existing.map((p) => [p.name, p]));
    for (const proj of projects) {
      const found = byName.get(proj.name);
      if (found) {
        if (found.description !== proj.description || found.background !== proj.background) {
          await ctx.db.patch(found._id, { description: proj.description, background: proj.background });
        }
        continue;
      }
      const projectId: Id<"projects"> = await ctx.db.insert("projects", {
        name: proj.name, industry: proj.industry, factory: proj.factory,
        description: proj.description, background: proj.background, currency: proj.currency, createdAt: 0,
      });
      for (const f of proj.files as SeedFile[]) {
        await ctx.db.insert("projectFiles", {
          projectId, templateId: f.templateId, version: 1, fileName: f.fileName,
          rows: f.rows, status: f.status, issues: f.issues, coverage: f.coverage,
          content: f.content, active: true, uploadedAt: 0,
        });
      }
    }
  },
});
