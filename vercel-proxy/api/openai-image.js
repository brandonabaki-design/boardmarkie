// Vercel serverless function — OpenAI image proxy (DALL·E 3) for Boardmarkie.
//
// OpenAI's API does not send CORS headers, so the browser can't call it
// directly; image generation goes through this proxy instead. Same key model as
// the chat/image proxies: bring-your-own per request, or a shared OPENAI_API_KEY
// env var on the project.
//
// Debug: POST { prompt, apiKey?, size?, quality? } -> { image: dataUrl }

export const config = { maxDuration: 60 };

const ALLOW_ORIGIN = "*";
const DEFAULT_MODEL = "dall-e-3";
const ALLOWED_SIZES = new Set(["1024x1024", "1792x1024", "1024x1792"]);

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }
  payload = payload || {};

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt'." });

  const apiKey = String(payload.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return res
      .status(401)
      .json({ error: "No OpenAI API key. Add one in Settings, or set OPENAI_API_KEY on the project." });
  }

  const size = ALLOWED_SIZES.has(payload.size) ? payload.size : "1792x1024";
  const quality = payload.quality === "hd" ? "hd" : "standard";
  // "natural" is less stylised than the default "vivid" — better for clean,
  // accurate educational illustrations.
  const style = payload.style === "vivid" ? "vivid" : "natural";

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        n: 1,
        size,
        quality,
        style,
        response_format: "b64_json",
      }),
    });
  } catch {
    return res.status(502).json({ error: "Could not reach OpenAI." });
  }

  if (!upstream.ok) {
    const detail = await upstream.text();
    return res.status(upstream.status).json({
      error: `Image generation error (${upstream.status}).`,
      detail: detail.slice(0, 500),
    });
  }

  const data = await upstream.json();
  const b64 = data && data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) return res.status(502).json({ error: "No image returned." });
  return res.status(200).json({ image: `data:image/png;base64,${b64}` });
}
