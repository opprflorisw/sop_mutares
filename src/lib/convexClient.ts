import { ConvexReactClient } from "convex/react";

// Single Convex client for the app. URL is injected at build time
// from VITE_CONVEX_URL (set by `npx convex dev` / Vercel build).
const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!url) {
  // Surfaces a clear message instead of a cryptic crash if the env
  // var is missing (e.g. someone ran `vite` without provisioning).
  console.error(
    "VITE_CONVEX_URL is not set. Run `npx convex dev` (writes it to .env.local)."
  );
}

export const convex = new ConvexReactClient(url ?? "https://example.convex.cloud");
