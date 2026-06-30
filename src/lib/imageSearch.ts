"use client";

// In-app image search across several free libraries at once and merged into one
// result set: Openverse (no key needed), plus Pixabay and Unsplash when their
// keys are set in Settings. Each source runs concurrently; results are round-
// robin interleaved and de-duplicated so you get a broad, high-quality mix.

import { getSearchKey, getUnsplashKey, getImageConfig } from "./storage";
import { isHostedMode, getBackendBase, authHeader } from "./backend";

export interface ImageResult {
  title: string;
  url: string; // best-quality image URL
  thumb: string; // smaller URL for the results grid
  source?: string; // "openverse" | "pixabay" | "unsplash"
}

const OPENVERSE = "https://api.openverse.org/v1/images/";

export const NO_SEARCH_KEY =
  "No images found — try a different search, or add a free Unsplash / Pixabay key in Settings for more sources.";

// ---- relevance ranking -----------------------------------------------------
// Search APIs return loosely-sorted results; for AUTO-embed we want the single
// most on-topic image, not just the first one that loads. We score each result's
// title/tags against the query (and optional lesson context) and sort, so the
// best match is tried first.

const STOP_WORDS = new Set([
  "a", "an", "the", "of", "and", "or", "for", "to", "in", "on", "at", "with", "this",
  "that", "its", "your", "you", "slide", "image", "photo", "picture", "illustration",
  "showing", "show", "about", "students", "student", "class", "classroom", "lesson",
  "concept", "topic", "diagram", "background",
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (t) => t.length > 2 && !STOP_WORDS.has(t),
  );
}

// Stock sources are far more reliable/relevant than Openverse, so they win ties.
const SOURCE_WEIGHT: Record<string, number> = { unsplash: 0.4, pixabay: 0.3, openverse: 0 };

function relevanceScore(title: string, queryTokens: string[], contextTokens: string[]): number {
  const titleTokens = tokenize(title);
  if (!titleTokens.length) return 0;
  const titleSet = new Set(titleTokens);
  let score = 0;
  for (const q of queryTokens) {
    if (titleSet.has(q)) score += 2; // exact keyword hit
    else if (titleTokens.some((t) => t.includes(q) || q.includes(t))) score += 1; // partial/compound
  }
  // On-topic bonus: lesson subject/topic words that show up are a tie-breaker, not
  // a primary signal (so "water cycle" still beats a generic "science" photo).
  for (const c of contextTokens) if (titleSet.has(c)) score += 0.5;
  return score;
}

/**
 * Re-order search results by how well each title matches the query, then the
 * optional lesson context, with a small stock-source tie-break. Stable for ties,
 * so when nothing matches (abstract queries) the original ordering is preserved.
 */
export function rankByRelevance<T extends { title?: string; source?: string }>(
  results: T[],
  query: string,
  context = "",
): T[] {
  const queryTokens = tokenize(query);
  const contextTokens = tokenize(context);
  if (!queryTokens.length && !contextTokens.length) return results;
  return results
    .map((r, i) => ({
      r,
      i,
      score: relevanceScore(r.title ?? "", queryTokens, contextTokens) + (SOURCE_WEIGHT[r.source ?? ""] ?? 0),
    }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.r);
}

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

// Resolve to the first URL whose image actually loads, so auto-embed never
// drops a dead / hotlink-blocked URL onto a slide as a broken image.
export async function firstLoadableImage(urls: string[], timeoutMs = 5000): Promise<string | undefined> {
  for (const url of urls) {
    if (!url) continue;
    const ok = await new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") return resolve(true);
      const img = new Image();
      const finish = (v: boolean) => {
        img.onload = null;
        img.onerror = null;
        resolve(v);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      img.onload = () => {
        clearTimeout(timer);
        finish(true);
      };
      img.onerror = () => {
        clearTimeout(timer);
        finish(false);
      };
      img.src = url;
    });
    if (ok) return url;
  }
  return undefined;
}

// Hosted mode: one authed call to the proxy, which aggregates Openverse +
// Pixabay + Unsplash (and Giphy for kind="gif") using the server-held keys.
export async function proxySearch(q: string, kind: "image" | "gif"): Promise<ImageResult[]> {
  try {
    const res = await fetch(`${getBackendBase()}/imagesearch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ q, kind }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: ImageResult[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

// `context` is optional lesson context (e.g. subject + topic) used only to
// break ties toward on-topic images during auto-embed; the manual picker omits it.
export async function searchImages(query: string, context = ""): Promise<ImageResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (isHostedMode()) {
    const results = await proxySearch(q, "image");
    if (!results.length) throw new Error(NO_SEARCH_KEY);
    return rankByRelevance(results, q, context).slice(0, 36);
  }

  const [openverse, pixabay, unsplash] = await Promise.all([
    openverseSearch(q),
    pixabaySearch(q),
    unsplashSearch(q),
  ]);

  // Curated stock first — Unsplash then Pixabay are far more relevant and
  // reliable than Openverse, which only fills in behind them.
  const seen = new Set<string>();
  const merged = [...unsplash, ...pixabay, ...openverse].filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  if (!merged.length) throw new Error(NO_SEARCH_KEY);
  // Rank by relevance so auto-embed picks the most on-topic image, not just the
  // first that loads. Source weight keeps the existing stock-first ordering on ties.
  return rankByRelevance(merged, q, context).slice(0, 36);
}

/** Fallback link when a search fails: open Google Images in a new tab. */
export function googleImagesUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}
