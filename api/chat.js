// Mira AI Backend — Vercel Serverless Function
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { messages, system } = req.body;

    const GROQ_KEY = process.env.GROQ_KEY || "";
    if (!GROQ_KEY) {
      return res.status(500).json({ error: "GROQ_KEY not set in Vercel Environment Variables" });
    }

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model:       "openai/gpt-oss-120b",
        max_tokens:  1200,
        temperature: 0.7,
        messages:    [{ role: "system", content: system }, ...messages],
      }),
    });

    const data = await resp.json();

    if (!resp.ok || data.error) {
      console.error("Groq error:", data.error);
      return res.status(500).json({ error: data.error?.message || "Groq API error" });
    }

    const content = data.choices?.[0]?.message?.content || "{}";
    return res.json({ content });

  } catch(e) {
    console.error("Server error:", e.message);
    return res.status(500).json({ error: e.message });
  }
};
