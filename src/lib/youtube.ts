"use client";

// Resolve a YouTube search query to a real, embeddable video via the Vercel
// proxy (which holds the YouTube Data API key). Returns null when the proxy or
// its key isn't configured, so callers degrade gracefully.

import { getImageConfig } from "./storage";

export async function resolveYoutube(query: string): Promise<{ videoId: string; title?: string } | null> {
  const { proxyUrl } = getImageConfig();
  const q = query.trim();
  if (!proxyUrl || !q) return null;
  const url = proxyUrl.replace(/\/image\/?$/, "/youtube");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { videoId?: string | null; title?: string };
    return data?.videoId ? { videoId: data.videoId, title: data.title } : null;
  } catch {
    return null;
  }
}
