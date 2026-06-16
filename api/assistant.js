// Vercel serverless function — the S&OP chat assistant, grounded on
// a short data context, answered by Gemini. Key stays server-side.

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = body.context || "";
  // Only Gemini models are wired to this endpoint; ignore anything else.
  const MODEL = typeof body.model === "string" && /^gemini[\w.\-]*$/.test(body.model) ? body.model : DEFAULT_MODEL;
  const persona = typeof body.profilePrompt === "string" && body.profilePrompt.trim()
    ? `\n\nAdopt this persona for your reply: ${body.profilePrompt.trim()}`
    : "";

  const system = `You are the S&OP Assistant inside a Sales & Operations Planning tool for Mutares portfolio companies.
Answer in plain language a non-expert manager understands. Be focused and complete — don't ramble, but don't cut a useful answer short.

Format every reply in GitHub-flavored markdown:
- Use **bold** for the key numbers and names.
- Use numbered lists for sequences/steps and "- " bullets for options.
- Be specific with numbers whenever the context provides them.

When a point relates to a screen in the app, add ONE markdown link to the most relevant page so the user can go see it (use the page name as the label):
- Executive snapshot & board packs: /tool/overview
- Demand, forecast & accuracy: /tool/demand
- Supply, the gap, inventory & SLOB: /tool/supply
- Capacity / RCCP load & bottleneck: /tool/capacity
Only link when it genuinely helps.${persona}

Ground your answer ONLY in this project context:
${context}
If asked something the context can't answer, say so briefly and suggest what data would help.`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.5, maxOutputTokens: 1200 },
        }),
      }
    );
    if (!r.ok) {
      res.status(502).json({ error: `Gemini ${r.status}` });
      return;
    }
    const data = await r.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    res.status(200).json({ text });
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
}
