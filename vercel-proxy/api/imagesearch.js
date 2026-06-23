// Vercel serverless function — image search for Boardmarkie, backed by
// Openverse (openverse.org): ~800M openly-licensed images aggregated from
// Flickr, Wikimedia Commons, museums and more. No API key and no setup needed.
//
// (Google's Custom Search JSON API is closed to new Google Cloud projects and
// shuts down entirely on 2027-01-01, so it can no longer be used as a backend.)
//
// Debug in a browser: https://<your-proxy>.vercel.app/api/imagesearch?q=tiger
//
// Anonymous use is rate-limited (~1 request/second per IP). For higher limits
// you can register a free Openverse application and send a Bearer token — see
// https://docs.openverse.org/api/reference/authentication_and_throttling.html

const ALLOW_ORIGIN = "*";
const OPENVERSE = "https://api.openverse.org/v1/images/";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  let q = "";
  if (req.method === "GET") {
    q = String((req.query && req.query.q) || "").trim();
  } else if (req.method === "POST") {
    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body." });
      }
    }
    q = String((payload || {}).q || "").trim();
  } else {
    return res.status(405).json({ error: "Use GET ?q= or POST {q}." });
  }

  if (!q) return res.status(400).json({ error: "Missing 'q'." });

  const url = OPENVERSE + "?page_size=20&mature=false&q=" + encodeURIComponent(q);

  let upstream;
  try {
    upstream = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    return res.status(502).json({ results: [], error: "Could not reach image search." });
  }
  if (upstream.status === 429) {
    return res
      .status(429)
      .json({ results: [], error: "Image search rate limit — try again in a moment." });
  }
  if (!upstream.ok) {
    const detail = await upstream.text();
    return res.status(upstream.status).json({
      results: [],
      error: `Image search error (${upstream.status}).`,
      detail: detail.slice(0, 400),
    });
  }

  const data = await upstream.json();
  const results = (Array.isArray(data.results) ? data.results : [])
    .map((it) => ({
      title: it.title || "",
      url: it.url || it.thumbnail || "",
      thumb: it.thumbnail || it.url || "",
    }))
    .filter((r) => r.url);

  return res.status(200).json({ results });
}
