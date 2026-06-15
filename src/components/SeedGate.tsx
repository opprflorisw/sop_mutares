import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SEALINGS_CSV } from "../lib/sampleSealings";
import { ELECTROTECH_CSV } from "../lib/sampleElectrotech";
import { getTemplate } from "../lib/templates";
import { analyzeCsv } from "../lib/projects";

// Idempotently seeds the demo accounts + both demo scenarios into
// Convex on first run. ensureSeed only inserts what's missing (users by
// email, projects by name), so running it repeatedly is safe.

function buildFiles(csvMap: Record<string, string>) {
  return Object.entries(csvMap).map(([templateId, content]) => {
    const t = getTemplate(templateId)!;
    const a = analyzeCsv(t, content);
    return { templateId, fileName: `${templateId}.csv`, content, rows: a.rows, status: a.status, issues: a.issues, coverage: a.coverage };
  });
}

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
    const projects = [
      {
        name: "SFC India — Sealings",
        industry: "Automotive (Sealings)",
        factory: "5 plants · Bawal, Manesar, Chennai, Sanand, Sahibabad",
        description: "Automotive sealing systems for Indian OEMs (TML, Maruti, Tata, M&M, Nissan, VW). Dec'22 ICP baseline ₹35.56 Cr across 5 plants.",
        currency: "INR",
        files: buildFiles(SEALINGS_CSV),
      },
      {
        name: "ElectroTech Industries — EU",
        industry: "Electronics manufacturing",
        factory: "3 plants · Lyon, Karlsruhe, Berlin",
        description: "Connected-device electronics maker (smart-home hubs, industrial controllers, power modules, sensors) for EU B2B/B2C customers. Capacitor supply from Shenzhen is a key risk.",
        currency: "EUR",
        files: buildFiles(ELECTROTECH_CSV),
      },
    ];

    ensureSeed({ users, projects }).catch((e) => console.error("Seed failed", e));
  }, [ensureSeed]);

  return null;
}
