// Vercel serverless function — turns a data-check summary into
// plain-language guidance using Gemini. The API key stays server-side
// (GEMINI_API_KEY env var); never shipped to the browser.

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const SYSTEM = `You are a data-quality assistant inside a Sales & Operations Planning tool for Mutares portfolio companies.
You receive automated data-check results and reply with a short markdown briefing for a non-technical operations manager.
Output ONLY the briefing — no preamble, no restating the instructions, no notes.

Structure:
**Verdict:** one sentence on whether the data is ready to plan and the headline reason.

## What to fix first
- one bullet per blocker (missing required file / invalid file) with its plain-language business impact

## Worth tightening
- one bullet per warning (time gap / cross-file mismatch) with why it matters

## Recommended next step
- one or two concrete actions

Omit a section that has no items. Keep bullets short. Only discuss issues present in the results; never invent any.`;

function clean(text) {
  let t = text.trim();
  const i = t.indexOf("**Verdict:**");
  if (i > 0) t = t.slice(i); // drop any preamble before the verdict
  return t.trim();
}

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

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: `Data-check results:\n\n${summary}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
        }),
      }
    );
    if (!r.ok) {
      res.status(502).json({ error: `Gemini ${r.status}` });
      return;
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    res.status(200).json({ text: clean(text) });
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
}
