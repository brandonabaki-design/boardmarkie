// Vercel serverless function — image fetch proxy for Boardmarkie.
//
// Fetches an external image URL server-side and returns it as a data URL, so
// the browser can embed web/stock-search images even when the source host
// doesn't send CORS headers. Used by the editor's "Swap → Search" so picked
// images render instantly and embed cleanly into PowerPoint.

const ALLOW_ORIGIN = "*";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB cap

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

  const url = String(payload.url || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: "Missing or invalid 'url'." });
  }

  let upstream;
  try {
    upstream = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Boardmarkie" } });
  } catch {
    return res.status(502).json({ error: "Could not fetch the image." });
  }
  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: `Fetch failed (${upstream.status}).` });
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return res.status(415).json({ error: "That URL is not an image." });
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return res.status(413).json({ error: "Image is too large." });
  }

  return res.status(200).json({ image: `data:${contentType};base64,${buf.toString("base64")}` });
}
