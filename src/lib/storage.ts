"use client";

import type { Artifact } from "./types";
import { DEFAULT_MODEL } from "./anthropic";

const KEY_API = "boardmarkie.apiKey";
const KEY_LIB = "boardmarkie.library";
const KEY_IMG_PROXY = "boardmarkie.imageProxy";
const KEY_IMG_KEY = "boardmarkie.imageKey";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_API) ?? "";
}

export function setApiKey(value: string): void {
  if (typeof window === "undefined") return;
  if (value.trim()) window.localStorage.setItem(KEY_API, value.trim());
  else window.localStorage.removeItem(KEY_API);
}

export interface ImageConfig {
  proxyUrl: string; // Cloudflare Worker URL (see worker/)
  apiKey: string; // Gemini key, sent per request (bring-your-own); blank = shared key on the Worker
}

export function getImageConfig(): ImageConfig {
  if (typeof window === "undefined") return { proxyUrl: "", apiKey: "" };
  return {
    proxyUrl: window.localStorage.getItem(KEY_IMG_PROXY) ?? "",
    apiKey: window.localStorage.getItem(KEY_IMG_KEY) ?? "",
  };
}

export function setImageConfig(cfg: ImageConfig): void {
  if (typeof window === "undefined") return;
  const set = (k: string, v: string) =>
    v.trim() ? window.localStorage.setItem(k, v.trim()) : window.localStorage.removeItem(k);
  set(KEY_IMG_PROXY, cfg.proxyUrl);
  set(KEY_IMG_KEY, cfg.apiKey);
}

const KEY_SEARCH_KEY = "boardmarkie.searchKey";

export function getSearchKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_SEARCH_KEY) ?? "";
}

export function setSearchKey(value: string): void {
  if (typeof window === "undefined") return;
  if (value.trim()) window.localStorage.setItem(KEY_SEARCH_KEY, value.trim());
  else window.localStorage.removeItem(KEY_SEARCH_KEY);
}

const KEY_MODEL = "boardmarkie.model";

// Which Claude model generates lessons (speed vs. quality). Defaults to the
// fast tier; changeable in Settings.
export function getModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  return window.localStorage.getItem(KEY_MODEL) || DEFAULT_MODEL;
}

export function setModel(value: string): void {
  if (typeof window === "undefined") return;
  if (value.trim()) window.localStorage.setItem(KEY_MODEL, value.trim());
  else window.localStorage.removeItem(KEY_MODEL);
}

export function getLibrary(): Artifact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_LIB);
    if (!raw) return [];
    const items = JSON.parse(raw) as Artifact[];
    return Array.isArray(items) ? items.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

// Generated raster images (data: URLs) are large; localStorage caps at ~5MB.
// Drop them from the persisted copy as a last resort so text + SVG diagrams
// (which are small) still survive a quota error.
function dropRasterImages(items: Artifact[]): Artifact[] {
  return items.map((a) =>
    a.kind === "lesson"
      ? {
          ...a,
          slides: a.slides.map((s) => ({
            ...s,
            imageUrl: s.imageUrl?.startsWith("data:") ? undefined : s.imageUrl,
            // Heavy base64 image elements are the usual quota culprit; drop their
            // data only (keep text, shapes, SVG diagrams, YouTube, and layout).
            elements: s.elements?.map((el) =>
              el.type === "image" && el.src?.startsWith("data:") ? { ...el, src: undefined } : el,
            ),
          })),
        }
      : a,
  );
}

export function saveArtifact(artifact: Artifact): void {
  if (typeof window === "undefined") return;
  const lib = getLibrary().filter((a) => a.id !== artifact.id);
  lib.unshift(artifact);
  const trimmed = lib.slice(0, 100);
  try {
    window.localStorage.setItem(KEY_LIB, JSON.stringify(trimmed));
  } catch {
    // Most likely a quota error from generated images. Persist everything
    // except the heavy raster images rather than losing the whole library.
    try {
      window.localStorage.setItem(KEY_LIB, JSON.stringify(dropRasterImages(trimmed)));
    } catch {
      /* Give up persisting; the in-memory copy keeps images for this session. */
    }
  }
}

export function deleteArtifact(id: string): void {
  if (typeof window === "undefined") return;
  const lib = getLibrary().filter((a) => a.id !== id);
  window.localStorage.setItem(KEY_LIB, JSON.stringify(lib));
}

export function getArtifact(id: string): Artifact | undefined {
  return getLibrary().find((a) => a.id === id);
}
