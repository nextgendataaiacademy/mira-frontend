// Vercel Serverless Function — replaces Railway backend
// Deploy: push to GitHub → Vercel auto-deploys (free, no expiry)

export const config = { runtime: "edge" };

const GROQ_KEY   = process.env.GROQ_KEY   || "";
const OPENAI_KEY = process.env.OPENAI_KEY || "";
const FREE_LIMIT = 50;

export default async function handler(req) {
  // CORS headers
  const cors = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  try {
    const { messages, system, plan, usage_count } = await req.json();

    // Free limit check
    if (plan !== "pro" && (usage_count || 0) >= FREE_LIMIT) {
      return new Response(
        JSON.stringify({ error: "Daily free limit reached. Upgrade to Pro!" }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const isPro = plan === "pro" && OPENAI_KEY;
    const url   = isPro
      ? "https://api.openai.com/v1/chat/completions"
      : "https://api.groq.com/openai/v1/chat/completions";
    const key   = isPro ? OPENAI_KEY : GROQ_KEY;
    const model = isPro ? "gpt-4o-mini" : "llama-3.3-70b-versatile";

    if (!key) {
      return new Response(
        JSON.stringify({ error: "API key not configured on server" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        temperature: 0.7,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("API error:", data);
      return new Response(
        JSON.stringify({ error: data.error?.message || "API error" }),
        { status: resp.status, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const content = data.choices?.[0]?.message?.content || "{}";
    return new Response(
      JSON.stringify({ content }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("Server error:", e);
    return new Response(
      JSON.stringify({ error: "Server error: " + e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
}
