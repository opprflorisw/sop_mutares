// Vercel serverless function — the S&OP chat assistant, grounded on
// a short data context, answered by Gemini. Key stays server-side.

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
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const context = body.context || "";

  const system = `You are the S&OP Assistant inside a Sales & Operations Planning tool for Mutares portfolio companies.
Answer concisely (2-4 sentences), in plain language a non-expert manager understands, grounded ONLY in this project context:
${context}
If asked something the context can't answer, say so briefly and suggest what data would help. Be specific with numbers when the context provides them.`;

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
          generationConfig: { temperature: 0.5, maxOutputTokens: 500 },
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
