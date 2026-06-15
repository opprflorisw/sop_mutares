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

  const prompt = `You are a supply-chain data-quality assistant for a Sales & Operations Planning tool.
Given the automated data-check results below, write a short, friendly, non-technical summary for a portfolio-company manager.
Lead with whether the data is ready to plan, then list the most important fixes as concise bullets (required files and time gaps first). Keep it under 130 words. Do not invent issues that aren't in the results.

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
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
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
