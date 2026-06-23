"use client";

// In-app image search. Uses Google Programmable Search (Custom Search JSON API)
// via the Vercel proxy when configured — broad, high-quality web images — and
// falls back to Pixabay (a free bring-your-own key in Settings).

import { getSearchKey, getImageConfig } from "./storage";

export interface ImageResult {
  title: string;
  url: string; // best-quality image URL
  thumb: string; // smaller URL for the results grid
}

export const NO_SEARCH_KEY =
  "Set up Google image search on your proxy (GOOGLE_CSE_KEY + GOOGLE_CSE_CX), or add a Pixabay API key in Settings.";

export async function searchImages(query: string): Promise<ImageResult[]> {
  const q = query.trim();
  if (!q) return [];

  // 1) Google image search via the proxy (best quality).
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
          note?: string;
          error?: string;
          detail?: string;
        };
        if (data.results && data.results.length) return data.results;
        if (data.error) console.warn("[imagesearch] Google:", data.error, data.detail || "");
        else if (data.note) console.warn("[imagesearch]", data.note);
      }
    } catch (e) {
      console.warn("[imagesearch] proxy request failed:", e);
    }
  }

  // 2) Pixabay fallback (bring-your-own key).
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
