"use client";

// In-app image search across several free libraries at once and merged into one
// result set: Openverse (no key needed), plus Pixabay and Unsplash when their
// keys are set in Settings. Each source runs concurrently; results are round-
// robin interleaved and de-duplicated so you get a broad, high-quality mix.

import { getSearchKey, getUnsplashKey, getImageConfig } from "./storage";

export interface ImageResult {
  title: string;
  url: string; // best-quality image URL
  thumb: string; // smaller URL for the results grid
  source?: string; // "openverse" | "pixabay" | "unsplash"
}

const OPENVERSE = "https://api.openverse.org/v1/images/";

export const NO_SEARCH_KEY =
  "No images found — try a different search, or add a free Unsplash / Pixabay key in Settings for more sources.";

interface OpenverseItem {
  title?: string;
  url?: string;
  thumbnail?: string;
}

// ---- per-source searches: each resolves to [] on failure, never throws ----

async function openverseSearch(q: string): Promise<ImageResult[]> {
  // Prefer the proxy (sidesteps any CORS surprises); fall back to a direct call.
  const { proxyUrl } = getImageConfig();
  if (proxyUrl) {
    try {
      const res = await fetch(proxyUrl.replace(/\/image\/?$/, "/imagesearch"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });
      if (res.ok) {
        const data = (await res.json()) as { results?: ImageResult[] };
        if (data.results?.length) return data.results.map((r) => ({ ...r, source: "openverse" }));
      }
    } catch {
      /* fall through to direct */
    }
  }
  try {
    const u = new URL(OPENVERSE);
    u.searchParams.set("q", q);
    u.searchParams.set("page_size", "20");
    u.searchParams.set("mature", "false");
    const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: OpenverseItem[] };
    return (data.results ?? [])
      .map((it) => ({
        title: it.title ?? "",
        url: it.url || it.thumbnail || "",
        thumb: it.thumbnail || it.url || "",
        source: "openverse",
      }))
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

async function pixabaySearch(q: string): Promise<ImageResult[]> {
  const key = getSearchKey();
  if (!key) return [];
  try {
    const u = new URL("https://pixabay.com/api/");
    u.searchParams.set("key", key);
    u.searchParams.set("q", q);
    u.searchParams.set("per_page", "15");
    u.searchParams.set("safesearch", "true");
    u.searchParams.set("image_type", "all");
    const res = await fetch(u.toString());
    if (!res.ok) return [];
    const data = (await res.json()) as {
      hits?: Array<{ tags?: string; webformatURL?: string; largeImageURL?: string; previewURL?: string }>;
    };
    return (data.hits ?? [])
      .map((h) => ({
        title: h.tags ?? "",
        url: h.largeImageURL || h.webformatURL || "",
        thumb: h.webformatURL || h.previewURL || "",
        source: "pixabay",
      }))
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

async function unsplashSearch(q: string): Promise<ImageResult[]> {
  const key = getUnsplashKey();
  if (!key) return [];
  try {
    const u = new URL("https://api.unsplash.com/search/photos");
    u.searchParams.set("query", q);
    u.searchParams.set("per_page", "12");
    u.searchParams.set("content_filter", "high");
    const res = await fetch(u.toString(), {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        description?: string;
        alt_description?: string;
        urls?: { full?: string; regular?: string; small?: string; thumb?: string };
      }>;
    };
    return (data.results ?? [])
      .map((p) => ({
        title: p.alt_description || p.description || "",
        url: p.urls?.regular || p.urls?.full || "",
        thumb: p.urls?.small || p.urls?.thumb || "",
        source: "unsplash",
      }))
      .filter((r) => r.url);
  } catch {
    return [];
  }
}

// Round-robin merge so every source contributes near the top of the results.
function interleave(lists: ImageResult[][]): ImageResult[] {
  const out: ImageResult[] = [];
  const max = lists.reduce((m, l) => Math.max(m, l.length), 0);
  for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

export async function searchImages(query: string): Promise<ImageResult[]> {
  const q = query.trim();
  if (!q) return [];

  const lists = await Promise.all([openverseSearch(q), pixabaySearch(q), unsplashSearch(q)]);

  const seen = new Set<string>();
  const merged = interleave(lists).filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  if (!merged.length) throw new Error(NO_SEARCH_KEY);
  return merged.slice(0, 36);
}

/** Fallback link when a search fails: open Google Images in a new tab. */
export function googleImagesUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
