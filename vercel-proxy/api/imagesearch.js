// Vercel serverless function — Google image search (Programmable Search) for
// Boardmarkie. Returns the top image results for a query via the Custom Search
// JSON API.
//
// Requires two env vars on the Vercel project:
//   GOOGLE_CSE_KEY — a Google API key with the "Custom Search API" enabled
//   GOOGLE_CSE_CX  — a Programmable Search Engine ID, with Image search ON and
//                    "Search the entire web" ON
//
// Debug in a browser: https://<your-proxy>.vercel.app/api/imagesearch?q=tiger
// If the keys aren't set it returns { results: [], note: ... }; if Google
// rejects the request it returns the upstream error detail.

const ALLOW_ORIGIN = "*";

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

  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) {
    return res.status(200).json({
      results: [],
      note: "GOOGLE_CSE_KEY and/or GOOGLE_CSE_CX are not set on this Vercel project.",
    });
  }

  const url =
    "https://www.googleapis.com/customsearch/v1?searchType=image&num=10&safe=active" +
    "&key=" +
    encodeURIComponent(key) +
    "&cx=" +
    encodeURIComponent(cx) +
    "&q=" +
    encodeURIComponent(q);

  let upstream;
  try {
    upstream = await fetch(url);
  } catch {
    return res.status(502).json({ results: [], error: "Could not reach Google search." });
  }
  if (!upstream.ok) {
    const detail = await upstream.text();
    return res.status(upstream.status).json({
      results: [],
      error: `Google search error (${upstream.status}).`,
      detail: detail.slice(0, 400),
    });
  }

  const data = await upstream.json();
  const results = (Array.isArray(data.items) ? data.items : [])
    .map((it) => ({
      title: it.title || "",
      url: it.link || "",
      thumb: (it.image && it.image.thumbnailLink) || it.link || "",
    }))
    .filter((r) => r.url);

  return res.status(200).json({ results });
}
