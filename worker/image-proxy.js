// Cloudflare Worker — image-generation proxy for Boardmarkie.
//
// Why this exists: Boardmarkie's frontend is a static site (GitHub Pages) and
// image providers can't be called directly from the browser (no CORS). This
// Worker is the thin server piece — it adds CORS and forwards prompts to
// Google's Imagen (Gemini) image API.
//
// Keys: by default the teacher's own key is sent per request (bring-your-own).
// To host a SHARED key instead, run `wrangler secret put GEMINI_API_KEY` and
// leave the per-request key blank in the app's Settings.
//
// Deploy: see worker/README.md.

const DEFAULT_MODEL = "imagen-4.0-fast-generate-001"; // fast + cheapest text-to-image
const ALLOWED_ASPECTS = new Set(["1:1", "3:4", "4:3", "9:16", "16:9"]);

// Lock this to your site's origin in production, e.g.
// "https://brandonabaki-design.github.io". "*" allows any origin.
const ALLOW_ORIGIN = "*";

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    ...extra,
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors({ "Content-Type": "application/json" }),
  });
}

const worker = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }
    if (request.method !== "POST") {
      return json({ error: "Use POST." }, 405);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid JSON body." }, 400);
    }

    const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
    if (!prompt) return json({ error: "Missing 'prompt'." }, 400);

    // Bring-your-own key (sent per request) takes precedence; fall back to a
    // shared key set as a Worker secret.
    const apiKey = String(payload.apiKey || env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      return json(
        {
          error:
            "No image API key. Add a Gemini key in Settings, or set GEMINI_API_KEY on the Worker.",
        },
        401,
      );
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
      return json({ error: "Could not reach the image service." }, 502);
    }

    if (!upstream.ok) {
      const detail = await upstream.text();
      return json(
        { error: `Image service error (${upstream.status}).`, detail: detail.slice(0, 500) },
        upstream.status,
      );
    }

    const data = await upstream.json();
    const pred = data && data.predictions && data.predictions[0];
    const b64 = pred && pred.bytesBase64Encoded;
    if (!b64) return json({ error: "No image returned." }, 502);

    const mime = pred.mimeType || "image/png";
    return json({ image: `data:${mime};base64,${b64}` });
  },
};

export default worker;
