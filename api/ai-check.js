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

  const prompt = `You summarize automated data-quality check results for a non-technical operations manager using a Sales & Operations Planning tool. Reply with ONLY the briefing (no preamble, no notes about your instructions), following this format exactly:

**Verdict:** The data is ready to plan, with two minor data-quality items to tidy up.

## What to fix first
- A missing month of sales history would distort year-over-year accuracy — but no blockers here.

## Worth tightening
- Sales history is missing March 2023, which weakens trend and seasonality reads for that period.

## Recommended next step
- Upload the missing March 2023 sales rows, then re-run the check.

Now write the briefing for these results. Only mention issues that appear below; if there are no blockers, say so and omit empty sections. Keep bullets short and concrete.

RESULTS:
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
