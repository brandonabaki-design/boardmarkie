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

const KEY_UNSPLASH = "boardmarkie.unsplashKey";

// Bring-your-own Unsplash Access Key (free from unsplash.com/developers).
// Combined with Openverse + Pixabay in image search.
export function getUnsplashKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_UNSPLASH) ?? "";
}

export function setUnsplashKey(value: string): void {
  if (typeof window === "undefined") return;
  if (value.trim()) window.localStorage.setItem(KEY_UNSPLASH, value.trim());
  else window.localStorage.removeItem(KEY_UNSPLASH);
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

const KEY_IMG_STYLE = "boardmarkie.imageStyle";
export type ImageStyle = "line" | "color";

// Illustration look for AI-generated images. Black-and-white line art is the
// default — clean, fast to load, printer-friendly (a Chalkie-style look).
export function getImageStyle(): ImageStyle {
  if (typeof window === "undefined") return "line";
  return window.localStorage.getItem(KEY_IMG_STYLE) === "color" ? "color" : "line";
}

export function setImageStyle(value: ImageStyle): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_IMG_STYLE, value);
}

const KEY_IMG_QUALITY = "boardmarkie.imageQuality";
export type ImageQuality = "fast" | "standard" | "ultra";

// AI illustration quality (maps to an Imagen tier). Standard balances accuracy
// and speed; Ultra is the most accurate (slowest/priciest); Fast is quickest.
export function getImageQuality(): ImageQuality {
  if (typeof window === "undefined") return "standard";
  const v = window.localStorage.getItem(KEY_IMG_QUALITY);
  return v === "fast" || v === "ultra" ? v : "standard";
}

export function setImageQuality(value: ImageQuality): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_IMG_QUALITY, value);
}

const KEY_IMG_PROVIDER = "boardmarkie.imageProvider";
export type ImageProvider = "imagen" | "dalle";

// Which engine generates AI illustrations: Google Imagen (default, via the
// proxy) or OpenAI's gpt-image-1 (also via the proxy, using the OpenAI key below).
export function getImageProvider(): ImageProvider {
  if (typeof window === "undefined") return "imagen";
  return window.localStorage.getItem(KEY_IMG_PROVIDER) === "dalle" ? "dalle" : "imagen";
}

export function setImageProvider(value: ImageProvider): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_IMG_PROVIDER, value);
}

const KEY_AUTO_MEDIA = "boardmarkie.autoMedia";
export type AutoMediaSource = "generate" | "search" | "gif";

// How "Add images while creating" fills slides: AI generation (costs per image),
// free web image search, or GIFs. Defaults to free web search.
export function getAutoMediaSource(): AutoMediaSource {
  if (typeof window === "undefined") return "search";
  const v = window.localStorage.getItem(KEY_AUTO_MEDIA);
  return v === "generate" || v === "gif" ? v : "search";
}

export function setAutoMediaSource(value: AutoMediaSource): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_AUTO_MEDIA, value);
}

const KEY_OPENAI = "boardmarkie.openaiKey";

// Bring-your-own OpenAI key. Powers Ask Boardmarkie (GPT-4o) and gpt-image-1 image
// generation. Stored only in this browser; sent per request to the user's proxy.
export function getOpenAIKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_OPENAI) ?? "";
}

export function setOpenAIKey(value: string): void {
  if (typeof window === "undefined") return;
  if (value.trim()) window.localStorage.setItem(KEY_OPENAI, value.trim());
  else window.localStorage.removeItem(KEY_OPENAI);
}

const KEY_GIPHY = "boardmarkie.giphyKey";

// Bring-your-own Giphy key for in-app GIF search (free from developers.giphy.com).
export function getGiphyKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_GIPHY) ?? "";
}

export function setGiphyKey(value: string): void {
  if (typeof window === "undefined") return;
  if (value.trim()) window.localStorage.setItem(KEY_GIPHY, value.trim());
  else window.localStorage.removeItem(KEY_GIPHY);
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
    // localStorage caps at ~5MB; persist text/layout there and let IndexedDB
    // (below) keep the heavy images.
    try {
      window.localStorage.setItem(KEY_LIB, JSON.stringify(dropRasterImages(trimmed)));
    } catch {
      /* localStorage full; IndexedDB still holds the full copy. */
    }
  }
  // Durable copy WITH images, so they survive a revisit.
  idbPutDebounced(artifact);
}

export function deleteArtifact(id: string): void {
  if (typeof window === "undefined") return;
  const lib = getLibrary().filter((a) => a.id !== id);
  window.localStorage.setItem(KEY_LIB, JSON.stringify(lib));
  void idbDelete(id);
}

export function getArtifact(id: string): Artifact | undefined {
  return getLibrary().find((a) => a.id === id);
}

/**
 * Full artifact including images. Prefers the IndexedDB copy (which keeps the
 * heavy base64 images); falls back to the localStorage copy (text/layout only).
 */
export async function getArtifactFull(id: string): Promise<Artifact | undefined> {
  const full = await idbGet(id);
  return full ?? getArtifact(id);
}

// ---- IndexedDB: durable store for full artifacts (incl. images) ----
// localStorage tops out around 5MB; a deck of generated images blows past that,
// so the full artifact (with image data URLs) lives here instead.

const DB_NAME = "boardmarkie";
const DB_STORE = "artifacts";
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

function getDb(): Promise<IDBDatabase | null> {
  return (dbPromise ??= openDb());
}

async function idbPut(artifact: Artifact): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(artifact);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbGet(id: string): Promise<Artifact | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  return new Promise<Artifact | undefined>((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readonly");
      const r = tx.objectStore(DB_STORE).get(id);
      r.onsuccess = () => resolve(r.result as Artifact | undefined);
      r.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// Coalesce rapid saves (drags, auto-image bursts) into one write per artifact.
const idbTimers: Record<string, ReturnType<typeof setTimeout>> = {};
function idbPutDebounced(artifact: Artifact): void {
  const id = artifact.id;
  if (idbTimers[id]) clearTimeout(idbTimers[id]);
  idbTimers[id] = setTimeout(() => {
    delete idbTimers[id];
    void idbPut(artifact);
  }, 600);
}
