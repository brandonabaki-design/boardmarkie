"use client";

// Resolve a YouTube search query to a real, embeddable video via the Vercel
// proxy (which holds the YouTube Data API key). Returns null when the proxy or
// its key isn't configured, so callers degrade gracefully.

import { getImageConfig } from "./storage";
import { isHostedMode, getBackendBase, authHeader } from "./backend";

export async function resolveYoutube(query: string): Promise<{ videoId: string; title?: string } | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const hosted = isHostedMode();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    let url: string;
    if (hosted) {
      url = `${getBackendBase()}/youtube`;
      Object.assign(headers, await authHeader());
    } else {
      const { proxyUrl } = getImageConfig();
      if (!proxyUrl) return null;
      url = proxyUrl.replace(/\/image\/?$/, "/youtube");
    }

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ q }) });
    if (!res.ok) {
      console.warn("[youtube] proxy returned", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { videoId?: string | null; title?: string; note?: string; error?: string };
    if (!data?.videoId) {
      console.warn("[youtube] no video for query:", q, "— proxy said:", data?.note || data?.error || data);
      return null;
    }
    return { videoId: data.videoId, title: data.title };
  } catch (e) {
    console.warn("[youtube] request failed:", e);
    return null;
  }
}
