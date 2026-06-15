import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SEALINGS_CSV } from "../lib/sampleSealings";
import { getTemplate } from "../lib/templates";
import { analyzeCsv } from "../lib/projects";

// Idempotently seeds the demo accounts and the Sealings project +
// files into Convex on first run. ensureSeed only inserts what's
// missing, so running it on every load (or twice in StrictMode) is safe.

export default function SeedGate() {
  const ensureSeed = useMutation(api.projects.ensureSeed);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const users = [
      { name: "Floris", email: "floris@oppr.ai", role: "Admin" as const, password: "12345678" },
      { name: "Sanchay", email: "sanchay@oppr.ai", role: "Admin" as const, password: "12345678" },
    ];
    const project = {
      name: "SFC India — Sealings",
      industry: "Automotive (Sealings)",
      factory: "5 plants · Bawal, Manesar, Chennai, Sanand, Sahibabad",
      description:
        "Automotive sealing systems for Indian OEMs (TML, Maruti, Tata, M&M, Nissan, VW). Dec'22 ICP baseline ₹35.56 Cr across 5 plants.",
      currency: "INR",
    };
    const files = Object.entries(SEALINGS_CSV).map(([templateId, content]) => {
      const t = getTemplate(templateId)!;
      const a = analyzeCsv(t, content);
      return {
        templateId,
        fileName: `${templateId}.csv`,
        content,
        rows: a.rows,
        status: a.status,
        issues: a.issues,
        coverage: a.coverage,
      };
    });

    ensureSeed({ users, project, files }).catch((e) =>
      console.error("Seed failed", e)
    );
  }, [ensureSeed]);

  return null;
}
