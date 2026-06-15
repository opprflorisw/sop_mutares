// Vercel serverless function — turns a data-check summary into
// plain-language guidance using Gemini. The API key stays server-side
// (GEMINI_API_KEY env var); never shipped to the browser.

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

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
  const summary = body.summary || "";

  const prompt = `You are a supply-chain data-quality assistant for a Sales & Operations Planning tool used by Mutares portfolio companies.
From the automated data-check results below, write a short briefing for a non-technical operations manager.

Begin your reply with this exact line and nothing before it:
**Verdict:** <one sentence: is the data ready to plan, and the headline reason>

Then include these sections (omit a section if it has no items):
## What to fix first
- one bullet per blocker (missing required file / invalid file), each stating the plain-language business impact.
## Worth tightening
- one bullet per warning (time pocket / gap / cross-file mismatch), each saying why it matters.
## Recommended next step
- one or two concrete actions.

Style rules:
- Keep it brief and skimmable.
- Use plain prose; do NOT annotate with word counts or meta commentary.
- Do NOT put ** around plain numbers or dates.
- Only discuss issues that appear in the results; do not invent any.

DATA-CHECK RESULTS:
${summary}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
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
