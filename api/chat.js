// Vercel Edge Function — Mira AI Backend
// Replaces Railway. Deploy by pushing to GitHub.

export const config = { runtime: "edge" };

export default async function handler(req) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const { messages, system, plan, usage_count } = await req.json();
    const FREE_LIMIT = 50;

    if (plan !== "pro" && (usage_count || 0) >= FREE_LIMIT) {
      return new Response(
        JSON.stringify({ content: JSON.stringify({ explanation: "Daily free limit reached. Come back tomorrow!" }) }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const GROQ_KEY   = process.env.GROQ_KEY   || "";
    const OPENAI_KEY = process.env.OPENAI_KEY || "";
    const isPro      = plan === "pro" && OPENAI_KEY;

    const url   = isPro
      ? "https://api.openai.com/v1/chat/completions"
      : "https://api.groq.com/openai/v1/chat/completions";
    const key   = isPro ? OPENAI_KEY : GROQ_KEY;
    const model = isPro ? "gpt-4o-mini" : "llama-3.3-70b-versatile";

    if (!key) {
      return new Response(
        JSON.stringify({ error: "API key not set in Vercel Environment Variables" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        temperature: 0.7,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    return new Response(
      JSON.stringify({ content }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
}
