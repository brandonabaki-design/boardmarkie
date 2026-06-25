// Vercel serverless function — image & GIF search for Boardmarkie.
//
// Aggregates several free libraries server-side so the app needs no per-user
// keys: Openverse (no key) + Pixabay + Unsplash for photos, Giphy for GIFs.
// In hosted ("school") mode the keys live here as env vars and requests require
// a valid Google sign-in token; in a bring-your-own deploy (no FIREBASE_PROJECT_ID)
// it still works keyless via Openverse.
//
// Env on the Vercel project (all optional except as noted):
//   PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY, GIPHY_API_KEY
//   FIREBASE_PROJECT_ID / ALLOWED_EMAIL_DOMAINS  (see _auth.js)
//
// Debug: GET ?q=tiger  or  ?q=cat&kind=gif   ->   { results: [{title,url,thumb,source}] }

import { setCors, verifyAuth, authEnabled } from "./_auth.js";

const OPENVERSE = "https://api.openverse.org/v1/images/";

async function openverse(q) {
  try {
    const url = `${OPENVERSE}?page_size=20&mature=false&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return [];
    const data = await r.json();
    return (Array.isArray(data.results) ? data.results : [])
      .map((it) => ({
        title: it.title || "",
        url: it.url || it.thumbnail || "",
        thumb: it.thumbnail || it.url || "",
        source: "openverse",
      }))
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

async function pixabay(q) {
  const key = (process.env.PIXABAY_API_KEY || "").trim();
  if (!key) return [];
  try {
    const u = new URL("https://pixabay.com/api/");
    u.searchParams.set("key", key);
    u.searchParams.set("q", q);
    u.searchParams.set("per_page", "15");
    u.searchParams.set("safesearch", "true");
    u.searchParams.set("image_type", "all");
    const r = await fetch(u.toString());
    if (!r.ok) return [];
    const data = await r.json();
    return (data.hits || [])
      .map((h) => ({
        title: h.tags || "",
        url: h.largeImageURL || h.webformatURL || "",
        thumb: h.webformatURL || h.previewURL || "",
        source: "pixabay",
      }))
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

async function unsplash(q) {
  const key = (process.env.UNSPLASH_ACCESS_KEY || "").trim();
  if (!key) return [];
  try {
    const u = new URL("https://api.unsplash.com/search/photos");
    u.searchParams.set("query", q);
    u.searchParams.set("per_page", "12");
    u.searchParams.set("content_filter", "high");
    const r = await fetch(u.toString(), {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.results || [])
      .map((p) => ({
        title: p.alt_description || p.description || "",
        url: (p.urls && (p.urls.regular || p.urls.full)) || "",
        thumb: (p.urls && (p.urls.small || p.urls.thumb)) || "",
        source: "unsplash",
      }))
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

async function giphy(q) {
  const key = (process.env.GIPHY_API_KEY || "").trim();
  if (!key) return [];
  try {
    const u = new URL("https://api.giphy.com/v1/gifs/search");
    u.searchParams.set("api_key", key);
    u.searchParams.set("q", q);
    u.searchParams.set("limit", "24");
    u.searchParams.set("rating", "g");
    u.searchParams.set("lang", "en");
    u.searchParams.set("bundle", "messaging_non_clips");
    const r = await fetch(u.toString());
    if (!r.ok) return [];
    const data = await r.json();
    return (data.data || [])
      .map((g) => {
        const img = g.images || {};
        const url =
          (img.downsized_medium && img.downsized_medium.url) ||
          (img.original && img.original.url) ||
          (img.downsized && img.downsized.url) ||
          "";
        const thumb =
          (img.fixed_width_small && img.fixed_width_small.url) ||
          (img.fixed_width && img.fixed_width.url) ||
          (img.preview_gif && img.preview_gif.url) ||
          url;
        return { title: g.title || "", url, thumb, source: "giphy" };
      })
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Use GET ?q= or POST {q}." });
  }

  if (authEnabled()) {
    const auth = await verifyAuth(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  }

  let q = "";
  let kind = "image";
  if (req.method === "GET") {
    q = String((req.query && req.query.q) || "").trim();
    kind = String((req.query && req.query.kind) || "image").trim();
  } else {
    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        return res.status(400).json({ error: "Invalid JSON body." });
      }
    }
    payload = payload || {};
    q = String(payload.q || "").trim();
    kind = String(payload.kind || "image").trim();
  }
  if (!q) return res.status(400).json({ error: "Missing 'q'." });

  if (kind === "gif") {
    const results = await giphy(q);
    return res.status(200).json({ results });
  }

  const [ov, px, us] = await Promise.all([openverse(q), pixabay(q), unsplash(q)]);
  const seen = new Set();
  // Curated stock first (Unsplash, then Pixabay) — far more relevant & reliable
  // than Openverse, which only fills in behind them.
  const results = [...us, ...px, ...ov]
    .filter((r) => r.url && !seen.has(r.url) && seen.add(r.url))
    .slice(0, 36);
  return res.status(200).json({ results });
}
