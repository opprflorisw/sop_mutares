# S&OP Planner — Mutares

An intuitive **Sales & Operations Planning** tool. Three connected core modules —
**Demand → Supply → Production (MPS)** — plus review and control-tower layers,
wrapped around a data-onboarding **Workspace** where you select a scenario, upload
data in enforced template formats, group files into **Projects**, and enter the tool.

> "You shouldn't need a PhD in supply planning to use it."

See [`PLAN.md`](./PLAN.md) for the full product & delivery plan.

## Stack

- **Vite + React + TypeScript** (SPA, React Router)
- **Tailwind CSS v4** — Mutares navy/blue design system
- **Recharts** — charts
- **Convex** — backend (DB, functions, file storage, vector search) — *staged, see below*
- AI (Phase 5): Convex actions → Claude

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

### Demo accounts

| Email | Password |
|---|---|
| floris@oppr.ai | `12345678` |
| sanchay@oppr.ai | `12345678` |

Create more users in **Workspace → Accounts**. (Phase 0 auth is local/browser —
see `src/lib/auth.tsx`. It moves to Convex in Phase 1.)

## Project structure

```
src/
  components/      app shell, workspace layout, UI primitives, icons
  lib/             auth, projects, templates, seed data (Sealings)
  pages/           login, workspace, accounts
  pages/tool/      the 8 S&OP modules + settings
convex/            staged backend: schema + users/projects functions
```

## Activating Convex (Phase 1)

Convex code is staged in `convex/`. To provision a deployment and generate types:

```bash
npx convex dev      # interactive: logs in via browser, creates a dev deployment
```

This writes `VITE_CONVEX_URL` to `.env.local` and generates `convex/_generated/`.
Then we swap the localStorage contexts (`src/lib/auth.tsx`, `src/lib/projects.tsx`)
to Convex queries/mutations.

### Convex MCP server (for Claude Code)

Connect the Convex MCP server so the assistant can inspect tables, run functions
and read data during development:

```bash
claude mcp add convex -- npx -y convex@latest mcp start
```

Docs: https://docs.convex.dev/ai/convex-mcp-server

## Deploy

- Front end → **Vercel** (Vite preset, `npm run build`, output `dist/`).
- Backend → **Convex Cloud** (`npx convex deploy`).
