// Vercel serverless function — OpenAI image proxy for Boardmarkie.
//
// Uses gpt-image-1 (DALL·E 3 was retired in March 2026; its `style` /
// `response_format` params no longer exist). OpenAI's API has no CORS, so
// browser image generation goes through this proxy. Key model: bring-your-own
// per request, or a shared OPENAI_API_KEY env var on the project.
//
// gpt-image-1 always returns base64 (data[0].b64_json) — no response_format
// needed — and uses quality low|medium|high|auto and sizes 1024x1024,
// 1536x1024, 1024x1536, auto.
//
// Debug: GET -> capability marker; POST { prompt, apiKey?, size?, quality? } -> { image }

import { setCors, verifyAuth, authEnabled } from "../_auth.js";

export const config = { maxDuration: 60 };

const DEFAULT_MODEL = "gpt-image-1";
const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536", "auto"]);
const ALLOWED_QUALITY = new Set(["low", "medium", "high", "auto"]);

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, endpoint: "openai-image", model: DEFAULT_MODEL });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  if (authEnabled()) {
    const auth = await verifyAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  }

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

  const model =
    typeof payload.model === "string" && payload.model.trim() ? payload.model.trim() : DEFAULT_MODEL;
  const size = ALLOWED_SIZES.has(payload.size) ? payload.size : "1536x1024";
  const quality = ALLOWED_QUALITY.has(payload.quality) ? payload.quality : "medium";

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt, n: 1, size, quality }),
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
