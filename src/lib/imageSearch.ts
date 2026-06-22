"use client";

// In-app image search via Pixabay — large catalog of high-quality, license-free
// photos, illustrations and vectors (good across all year groups). Needs a free
// Pixabay API key (simple email signup, no cloud project / billing), stored in
// Settings. The API is CORS-friendly, so search runs straight from the browser.

import { getSearchKey } from "./storage";

export interface ImageResult {
  title: string;
  url: string; // best-quality image URL
  thumb: string; // smaller URL for the results grid
}

export const NO_SEARCH_KEY = "Add your free Pixabay API key in Settings to search images.";

export async function searchImages(query: string): Promise<ImageResult[]> {
  const key = getSearchKey();
  if (!key) {
    const e = new Error(NO_SEARCH_KEY) as Error & { status?: number };
    e.status = 401;
    throw e;
  }

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
