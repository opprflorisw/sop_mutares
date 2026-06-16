// Client helpers that call the Gemini-backed serverless functions
// (api/ai-check, api/assistant). When the functions aren't reachable
// (e.g. `vite dev` without `vercel dev`), they fall back to a local
// deterministic response so the UI always works.

export type AiSource = "gemini" | "local";

async function postJson(path: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}

/** Turn a data-check summary into plain-language guidance. */
export async function aiDataNarrative(
  summary: string
): Promise<{ text: string; source: AiSource }> {
  const text = await postJson("/api/ai-check", { summary });
  if (text) return { text, source: "gemini" };
  return { text: localNarrative(summary), source: "local" };
}

/** Conversational assistant grounded on a short data context. */
export async function aiChat(
  messages: { role: "user" | "assistant"; text: string }[],
  context: string,
  opts: { model?: string; profilePrompt?: string } = {}
): Promise<{ text: string; source: AiSource }> {
  const text = await postJson("/api/assistant", { messages, context, ...opts });
  if (text) return { text, source: "gemini" };
  return { text: localChat(messages), source: "local" };
}

function localNarrative(summary: string): string {
  const lines = summary.split("\n");
  const errs = lines.filter((l) => l.includes("[error]"));
  const warns = lines.filter((l) => l.includes("[warning]"));
  const parts: string[] = [];
  if (errs.length) {
    parts.push(
      `🔴 ${errs.length} blocking issue(s) before the tool can run:\n` +
        errs.map((l) => "• " + l.replace(/.*\[error\]\s*/, "")).join("\n")
    );
  }
  if (warns.length) {
    parts.push(
      `🟡 ${warns.length} item(s) to tighten up:\n` +
        warns.map((l) => "• " + l.replace(/.*\[warning\]\s*/, "")).join("\n")
    );
  }
  if (!errs.length && !warns.length) {
    parts.push("✅ Data looks complete and consistent — you're ready to plan.");
  } else {
    parts.push(
      "Fix the required-file and time-gap items first; the recommended files can follow."
    );
  }
  parts.push("\n(Local check — deploy with the Gemini key for AI-written guidance.)");
  return parts.join("\n\n");
}

function localChat(messages: { role: string; text: string }[]): string {
  const last = messages.filter((m) => m.role === "user").pop()?.text.toLowerCase() ?? "";
  const canned: Record<string, string> = {
    gap: "The biggest demand–supply gap is on **Profile extrusions** — **25% short** (~₹149k at risk), constrained by Bawal Extrusion-2 capacity.\n\nTo close it:\n1. Add a Saturday shift on Extrusion-2.\n2. Re-route ~14k units to Sanand (76% utilised).\n\nSee the full picture in [Supply & gap](/tool/supply).",
    epdm: "**EPDM-12 rubber** is short from **Wk 23**, constraining GlassRun and Profile families (~₹122k at risk).\n\n- Expedite the open PO or qualify a second supplier.\n- Review the exposure in [Supply & gap](/tool/supply).",
    capacity: "**Bawal Extrusion-2** is overloaded at **111%** (Nov–Dec).\n\nOptions:\n1. Saturday shift.\n2. Re-route to Sanand (76% utilised).\n\nDetail in [Capacity / RCCP](/tool/capacity).",
    bias: "Forecast **bias is −4.8%** (systematic over-forecast). Recalibrate **DE-4421** and **FR-0912** before consensus.\n\nReview accuracy in [Demand](/tool/demand).",
  };
  for (const [k, v] of Object.entries(canned)) if (last.includes(k)) return v;
  return "Deploy with the Gemini key to chat over live data. Meanwhile try: **biggest gap**, **EPDM**, **capacity** or **bias** — and I'll point you to the right [dashboard](/tool/overview).";
}
