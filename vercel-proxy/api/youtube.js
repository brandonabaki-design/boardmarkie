// Vercel serverless function — resolve a search query to a YouTube video.
//
// Boardmarkie's generator suggests a video per relevant slide (a title + search
// query). This endpoint turns that query into a real, embeddable video id using
// the YouTube Data API, so the lesson can embed it automatically. Set the env
// var YOUTUBE_API_KEY in the Vercel project. If it's missing, the endpoint
// returns { videoId: null } so the app simply skips auto-embedding.

const ALLOW_ORIGIN = "*";

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

  const q = String(payload.q || "").trim();
  if (!q) return res.status(400).json({ error: "Missing 'q'." });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(200).json({ videoId: null }); // not configured — degrade gracefully

  const url =
    "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1" +
    "&safeSearch=strict&videoEmbeddable=true&q=" +
    encodeURIComponent(q) +
    "&key=" +
    encodeURIComponent(key);

  let upstream;
  try {
    upstream = await fetch(url);
  } catch {
    return res.status(502).json({ error: "Could not reach YouTube." });
  }
  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: `YouTube search failed (${upstream.status}).` });
  }

  const data = await upstream.json();
  const item = Array.isArray(data.items) ? data.items[0] : null;
  const videoId = item?.id?.videoId || null;
  const title = item?.snippet?.title || undefined;
  return res.status(200).json({ videoId, title });
}
