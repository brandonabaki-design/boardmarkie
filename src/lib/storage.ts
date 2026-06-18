"use client";

import type { Artifact } from "./types";

const KEY_API = "boardmarkie.apiKey";
const KEY_LIB = "boardmarkie.library";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(KEY_API) ?? "";
}

export function setApiKey(value: string): void {
  if (typeof window === "undefined") return;
  if (value.trim()) window.localStorage.setItem(KEY_API, value.trim());
  else window.localStorage.removeItem(KEY_API);
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

export function saveArtifact(artifact: Artifact): void {
  if (typeof window === "undefined") return;
  const lib = getLibrary().filter((a) => a.id !== artifact.id);
  lib.unshift(artifact);
  window.localStorage.setItem(KEY_LIB, JSON.stringify(lib.slice(0, 100)));
}

export function deleteArtifact(id: string): void {
  if (typeof window === "undefined") return;
  const lib = getLibrary().filter((a) => a.id !== id);
  window.localStorage.setItem(KEY_LIB, JSON.stringify(lib));
}

export function getArtifact(id: string): Artifact | undefined {
  return getLibrary().find((a) => a.id === id);
}
