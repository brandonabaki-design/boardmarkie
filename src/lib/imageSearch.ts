"use client";

// Embedded image search via Google's Programmable Search (Custom Search JSON
// API). Bring-your-own key + engine ID, stored in Settings. Returns image
// results we render inline so the user can click one to swap a slide's image.

import { getSearchConfig } from "./storage";

export interface ImageResult {
  title: string;
  url: string; // full-size image URL
  thumb: string; // thumbnail URL
}

export const NO_SEARCH_CONFIG =
  "Add a Google image-search API key and engine ID in Settings to search images in-app.";

export function searchConfigured(): boolean {
  const { apiKey, cx } = getSearchConfig();
  return Boolean(apiKey && cx);
}

export async function searchImages(query: string): Promise<ImageResult[]> {
  const { apiKey, cx } = getSearchConfig();
  if (!apiKey || !cx) {
    const e = new Error(NO_SEARCH_CONFIG) as Error & { status?: number };
    e.status = 401;
    throw e;
  }

  const u = new URL("https://www.googleapis.com/customsearch/v1");
  u.searchParams.set("key", apiKey);
  u.searchParams.set("cx", cx);
  u.searchParams.set("q", query);
  u.searchParams.set("searchType", "image");
  u.searchParams.set("num", "9");
  u.searchParams.set("safe", "active");

  let res: Response;
  try {
    res = await fetch(u.toString());
  } catch {
    throw new Error("Couldn't reach Google image search.");
  }

  if (!res.ok) {
    let message = `Image search failed (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }

  const data = (await res.json()) as {
    items?: Array<{ title?: string; link?: string; image?: { thumbnailLink?: string } }>;
  };
  return (data.items ?? [])
    .map((it) => ({
      title: it.title ?? "",
      url: it.link ?? "",
      thumb: it.image?.thumbnailLink || it.link || "",
    }))
    .filter((r) => r.url);
}

/** Fallback when in-app search isn't configured: open Google Images in a tab. */
export function googleImagesUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
