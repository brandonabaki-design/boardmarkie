// Vercel serverless function — image proxy for Boardmarkie.
//
// Same job as ../worker/image-proxy.js (forward image prompts to Google's
// Imagen API + add CORS), but on Vercel — whose serverless functions run in a
// US region (see ../vercel.json -> regions). Google geo-restricts the Gemini
// API ("User location is not supported"); Cloudflare Workers run near the user
// and can egress from a blocked country, whereas a US Vercel function does not.
//
// Keys: the teacher's own key is sent per request (bring-your-own). To host a
// SHARED key instead, set a GEMINI_API_KEY env var on the Vercel project and
// leave the key field blank in the app's Settings.

// Standard Imagen 4 is the fallback; the app sends an explicit tier per request
// (fast / standard / ultra). NB: the imagen-4.0-* endpoints are slated for
// shutdown on 2026-08-17 — swap to the successor model when it lands.
const DEFAULT_MODEL = "imagen-4.0-generate-001";
const ALLOWED_ASPECTS = new Set(["1:1", "3:4", "4:3", "9:16", "16:9"]);

// Lock this to your site's origin in production, e.g.
// "https://brandonabaki-design.github.io". "*" allows any origin.
const ALLOW_ORIGIN = "*";

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

  // Vercel auto-parses JSON bodies, but guard for string / empty just in case.
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

  // Bring-your-own key (sent per request) takes precedence; fall back to a
  // shared key set as a project env var.
  const apiKey = String(payload.apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return res.status(401).json({
      error: "No image API key. Add a Gemini key in Settings, or set GEMINI_API_KEY on the project.",
    });
  }

  const model =
    typeof payload.model === "string" && payload.model.trim() ? payload.model.trim() : DEFAULT_MODEL;
  const aspectRatio = ALLOWED_ASPECTS.has(payload.aspectRatio) ? payload.aspectRatio : "16:9";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;

  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio },
      }),
    });
  } catch {
    return res.status(502).json({ error: "Could not reach the image service." });
  }

  if (!upstream.ok) {
    const detail = await upstream.text();
    return res.status(upstream.status).json({
      error: `Image service error (${upstream.status}).`,
      detail: detail.slice(0, 500),
    });
  }

  const data = await upstream.json();
  const pred = data && data.predictions && data.predictions[0];
  const b64 = pred && pred.bytesBase64Encoded;
  if (!b64) return res.status(502).json({ error: "No image returned." });

  const mime = (pred && pred.mimeType) || "image/png";
  return res.status(200).json({ image: `data:${mime};base64,${b64}` });
}
