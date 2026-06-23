"use client";

// In-app image search backed by Openverse (openverse.org) — ~800M openly
// licensed images aggregated from Flickr, Wikimedia Commons, museums and more,
// with no API key and no setup. Tries the Vercel proxy first (avoids any CORS
// surprises), then a direct browser call, then an optional Pixabay key.
//
// (Google's Custom Search JSON API is closed to new Google Cloud projects and
// is being shut down on 2027-01-01, so it's no longer a usable backend.)

import { getSearchKey, getImageConfig } from "./storage";

export interface ImageResult {
  title: string;
  url: string; // best-quality image URL
  thumb: string; // smaller URL for the results grid
}

const OPENVERSE = "https://api.openverse.org/v1/images/";

export const NO_SEARCH_KEY =
  "Image search is temporarily unavailable — check your connection, or add a free Pixabay API key in Settings as a backup.";

interface OpenverseItem {
  title?: string;
  url?: string;
  thumbnail?: string;
}

function mapOpenverse(items: OpenverseItem[] | undefined): ImageResult[] {
  return (items ?? [])
    .map((it) => ({
      title: it.title ?? "",
      url: it.url || it.thumbnail || "",
      thumb: it.thumbnail || it.url || "",
    }))
    .filter((r) => r.url);
}

export async function searchImages(query: string): Promise<ImageResult[]> {
  const q = query.trim();
  if (!q) return [];

  // 1) Openverse via the proxy (no key needed; sidesteps any CORS issues).
  const { proxyUrl } = getImageConfig();
  if (proxyUrl) {
    try {
      const url = proxyUrl.replace(/\/image\/?$/, "/imagesearch");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          results?: ImageResult[];
          error?: string;
          detail?: string;
        };
        if (data.results && data.results.length) return data.results;
        if (data.error) console.warn("[imagesearch] proxy:", data.error, data.detail || "");
      }
    } catch (e) {
      console.warn("[imagesearch] proxy request failed:", e);
    }
  }

  // 2) Openverse directly from the browser (CORS-friendly, no key, no proxy).
  try {
    const u = new URL(OPENVERSE);
    u.searchParams.set("q", q);
    u.searchParams.set("page_size", "20");
    u.searchParams.set("mature", "false");
    const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = (await res.json()) as { results?: OpenverseItem[] };
      const mapped = mapOpenverse(data.results);
      if (mapped.length) return mapped;
    }
  } catch (e) {
    console.warn("[imagesearch] Openverse direct request failed:", e);
  }

  // 3) Pixabay fallback (bring-your-own key).
  const key = getSearchKey();
  if (key) return pixabaySearch(q, key);

  const e = new Error(NO_SEARCH_KEY) as Error & { status?: number };
  e.status = 401;
  throw e;
}

async function pixabaySearch(query: string, key: string): Promise<ImageResult[]> {
  const u = new URL("https://pixabay.com/api/");
  u.searchParams.set("key", key);
  u.searchParams.set("q", query);
  u.searchParams.set("per_page", "15");
  u.searchParams.set("safesearch", "true");
  u.searchParams.set("image_type", "all");

  let res: Response;
  try {
    res = await fetch(u.toString());
  } catch {
    throw new Error("Couldn't reach the image search service.");
  }
  if (!res.ok) {
    if (res.status === 400) throw new Error("Pixabay rejected the request — double-check your API key in Settings.");
    if (res.status === 429) throw new Error("Pixabay rate limit hit — wait a moment and try again.");
    throw new Error(`Image search failed (${res.status}).`);
  }

  const data = (await res.json()) as {
    hits?: Array<{ tags?: string; webformatURL?: string; largeImageURL?: string; previewURL?: string }>;
  };
  return (data.hits ?? [])
    .map((h) => ({
      title: h.tags ?? "",
      url: h.largeImageURL || h.webformatURL || "",
      thumb: h.webformatURL || h.previewURL || "",
    }))
    .filter((r) => r.url);
}

/** Fallback link when a search fails: open Google Images in a new tab. */
export function googleImagesUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
