"use client";

// In-app GIF search via Giphy (bring-your-own free key in Settings). Giphy's API
// supports CORS, so this runs straight from the browser — no proxy needed.
// Results share the ImageResult shape so the picker can reuse the same grid.

import { getGiphyKey } from "./storage";
import { isHostedMode } from "./backend";
import { proxySearch, rankByRelevance } from "./imageSearch";

export interface GifResult {
  title: string;
  url: string; // animated GIF URL
  thumb: string; // smaller animated preview for the grid
}

export const NO_GIPHY_KEY = "Add a free Giphy API key in Settings to search GIFs.";

interface GiphyImage {
  url?: string;
}
interface GiphyImages {
  original?: GiphyImage;
  downsized?: GiphyImage;
  downsized_medium?: GiphyImage;
  fixed_width?: GiphyImage;
  fixed_width_small?: GiphyImage;
  preview_gif?: GiphyImage;
}

// `context` is optional lesson context (subject + topic) used only to break ties
// toward on-topic GIFs during auto-embed; the manual picker omits it.
export async function searchGifs(query: string, context = ""): Promise<GifResult[]> {
  const q = query.trim();
  if (!q) return [];

  // Hosted mode: the proxy searches Giphy with the server-held key.
  if (isHostedMode()) return rankByRelevance(await proxySearch(q, "gif"), q, context);

  const key = getGiphyKey();
  if (!key) {
    const e = new Error(NO_GIPHY_KEY) as Error & { status?: number };
    e.status = 401;
    throw e;
  }

  const u = new URL("https://api.giphy.com/v1/gifs/search");
  u.searchParams.set("api_key", key);
  u.searchParams.set("q", q);
  u.searchParams.set("limit", "24");
  u.searchParams.set("rating", "g"); // classroom-safe
  u.searchParams.set("lang", "en");
  u.searchParams.set("bundle", "messaging_non_clips"); // renderable, non-video gifs

  let res: Response;
  try {
    res = await fetch(u.toString());
  } catch {
    throw new Error("Couldn't reach Giphy.");
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403)
      throw new Error("Giphy rejected the key — double-check it in Settings.");
    if (res.status === 429) throw new Error("Giphy rate limit hit — wait a moment and try again.");
    throw new Error(`GIF search failed (${res.status}).`);
  }

  const data = (await res.json()) as { data?: Array<{ title?: string; images?: GiphyImages }> };
  const gifs = (data.data ?? [])
    .map((g) => {
      const img = g.images ?? {};
      const url = img.downsized_medium?.url || img.original?.url || img.downsized?.url || "";
      const thumb = img.fixed_width_small?.url || img.fixed_width?.url || img.preview_gif?.url || url;
      return { title: g.title ?? "", url, thumb };
    })
    .filter((r) => r.url);
  // Prefer GIFs whose title actually matches the topic (Giphy titles are noisy).
  return rankByRelevance(gifs, q, context);
}
