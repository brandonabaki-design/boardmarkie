// Vercel serverless function — resolve a search query to a YouTube video.
//
// Boardmarkie's generator suggests a video per relevant slide (a title + search
// query). This endpoint turns that query into a real, embeddable video id using
// the YouTube Data API, so the lesson can embed it automatically. Set the env
// var YOUTUBE_API_KEY in the Vercel project.
//
// Debug: you can hit this directly in a browser, e.g.
//   https://<your-proxy>.vercel.app/api/youtube?q=photosynthesis
// The JSON response tells you exactly what's wrong (missing key, restricted
// key, API not enabled, etc.). If the key is missing it returns videoId:null
// with a note; if YouTube rejects the key it returns the upstream error detail.

import { setCors, verifyAuth, authEnabled } from "./_auth.js";

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (authEnabled()) {
    const auth = await verifyAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  }

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

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return res.status(200).json({
      videoId: null,
      note: "YOUTUBE_API_KEY is not set on this Vercel project (check the variable NAME is exactly YOUTUBE_API_KEY, then redeploy).",
    });
  }

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
    return res.status(502).json({ videoId: null, error: "Could not reach YouTube." });
  }

  if (!upstream.ok) {
    const detail = await upstream.text();
    // Surface YouTube's reason (e.g. referer-restricted key, API not enabled).
    return res.status(upstream.status).json({
      videoId: null,
      error: `YouTube error (${upstream.status}).`,
      detail: detail.slice(0, 400),
    });
  }

  const data = await upstream.json();
  const item = Array.isArray(data.items) ? data.items[0] : null;
  const videoId = item?.id?.videoId || null;
  const title = item?.snippet?.title || undefined;
  return res.status(200).json({ videoId, title });
}
