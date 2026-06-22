"use client";

// In-app image search via Openverse (https://openverse.org) — openly-licensed
// and public-domain images, which are ideal for classroom use. No API key, no
// cloud project: the API is public and CORS-friendly, so it works straight from
// the browser. Click a result to swap it into a slide.

export interface ImageResult {
  title: string;
  url: string; // full-size image URL
  thumb: string; // thumbnail URL
}

export async function searchImages(query: string): Promise<ImageResult[]> {
  const u = new URL("https://api.openverse.org/v1/images/");
  u.searchParams.set("q", query);
  u.searchParams.set("page_size", "12");
  u.searchParams.set("mature", "false"); // keep results classroom-safe

  let res: Response;
  try {
    res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Couldn't reach the image search service.");
  }

  if (!res.ok) {
    throw new Error(`Image search failed (${res.status}). Please try again.`);
  }

  const data = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; thumbnail?: string }>;
  };
  return (data.results ?? [])
    .map((r) => ({ title: r.title ?? "", url: r.url ?? "", thumb: r.thumbnail || r.url || "" }))
    .filter((r) => r.url);
}

/** Fallback link when a search fails: open Google Images in a new tab. */
export function googleImagesUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
