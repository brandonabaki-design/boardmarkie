"use client";

// Cross-device sync of the library to Firestore, scoped per signed-in user at
// `users/{uid}/artifacts/{id}`. Firestore security rules enforce that a user can
// only touch their own subtree (see Settings → Sync for the rules text).
//
// Flow: on sign-in, CreateApp installs the storage hooks (so every save/delete
// mirrors to the cloud), runs syncOnce() to reconcile both sides, then subscribes
// for live updates from other devices.

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Firestore,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { getCurrentUser } from "./auth";
import {
  getLibrary,
  putArtifactLocal,
  removeArtifactLocal,
  setStorageSyncHooks,
  stripHeavyImages,
} from "./storage";
import type { Artifact } from "./types";

function artifactsCol(db: Firestore, uid: string) {
  return collection(db, "users", uid, "artifacts");
}
function artifactDoc(db: Firestore, uid: string, id: string) {
  return doc(db, "users", uid, "artifacts", id);
}

// Effective edit time for last-write-wins conflict resolution.
function stamp(a: Artifact): number {
  return a.updatedAt ?? a.createdAt ?? 0;
}

// A single Firestore doc caps at ~1MB, so heavy base64 images can't be stored.
// Text, layout, SVG diagrams, and URL-based media (web search / GIF / YouTube)
// all sync fine; AI-generated raster images are dropped from the cloud copy.
function forCloud(a: Artifact): Record<string, unknown> {
  return stripHeavyImages([a])[0] as unknown as Record<string, unknown>;
}

function isArtifact(a: unknown): a is Artifact {
  const x = a as Partial<Artifact> | null;
  return !!x && typeof x.id === "string" && typeof x.kind === "string";
}

// When a remote (image-stripped) doc lands on a device that already has the
// images locally, carry the local image data over so a text edit made on another
// device doesn't wipe locally-generated illustrations.
function restoreImages(incoming: Artifact, local: Artifact | undefined): Artifact {
  if (!local || incoming.kind !== "lesson" || local.kind !== "lesson") return incoming;
  const prevById = new Map(local.slides.map((s) => [s.id, s]));
  return {
    ...incoming,
    slides: incoming.slides.map((s) => {
      const prev = prevById.get(s.id);
      if (!prev) return s;
      const merged = { ...s };
      if (!merged.imageUrl && prev.imageUrl) merged.imageUrl = prev.imageUrl;
      if (merged.elements && prev.elements) {
        const prevEl = new Map(prev.elements.map((e) => [e.id, e]));
        merged.elements = merged.elements.map((el) => {
          if (el.type !== "image" || el.src || el.svg) return el;
          const pe = prevEl.get(el.id);
          return pe && pe.type === "image" ? { ...el, src: pe.src, svg: pe.svg } : el;
        });
      }
      return merged;
    }),
  };
}

// Apply a remote doc to local storage if it's strictly newer (guards against
// overwriting local images with a stripped copy and against echoing our own
// pushes). Returns whether anything changed.
function applyRemote(remote: Artifact): boolean {
  const local = getLibrary().find((a) => a.id === remote.id);
  if (local && stamp(local) >= stamp(remote)) return false;
  putArtifactLocal(restoreImages(remote, local));
  return true;
}

// ---- Cloud writes (registered as storage hooks once signed in) ----

const pushTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// Debounced so rapid edits / drag-saves coalesce into one write per artifact.
export function pushArtifact(a: Artifact): void {
  const user = getCurrentUser();
  const db = getDb();
  if (!user || !db) return;
  const id = a.id;
  if (pushTimers[id]) clearTimeout(pushTimers[id]);
  pushTimers[id] = setTimeout(() => {
    delete pushTimers[id];
    void setDoc(artifactDoc(db, user.uid, id), forCloud(a)).catch((e) =>
      console.warn("[sync] push failed", e),
    );
  }, 700);
}

export function deleteRemoteArtifact(id: string): void {
  const user = getCurrentUser();
  const db = getDb();
  if (!user || !db) return;
  if (pushTimers[id]) {
    clearTimeout(pushTimers[id]);
    delete pushTimers[id];
  }
  void deleteDoc(artifactDoc(db, user.uid, id)).catch((e) => console.warn("[sync] delete failed", e));
}

export async function pullAllArtifacts(): Promise<Artifact[]> {
  const user = getCurrentUser();
  const db = getDb();
  if (!user || !db) return [];
  const snap = await getDocs(artifactsCol(db, user.uid));
  return snap.docs.map((d) => d.data()).filter(isArtifact);
}

// Two-way reconcile on sign-in: pull the cloud, push anything newer/local-only,
// pull down anything newer/remote-only. Newest (updatedAt||createdAt) wins.
export async function syncOnce(): Promise<void> {
  const user = getCurrentUser();
  const db = getDb();
  if (!user || !db) return;
  const remote = await pullAllArtifacts();
  const remoteById = new Map(remote.map((a) => [a.id, a]));
  const local = getLibrary();
  const localById = new Map(local.map((a) => [a.id, a]));

  for (const r of remote) {
    const l = localById.get(r.id);
    if (!l || stamp(r) > stamp(l)) putArtifactLocal(restoreImages(r, l));
  }
  for (const l of local) {
    const r = remoteById.get(l.id);
    if (!r || stamp(l) > stamp(r)) {
      void setDoc(artifactDoc(db, user.uid, l.id), forCloud(l)).catch((e) =>
        console.warn("[sync] initial push failed", e),
      );
    }
  }
}

// Live updates from other devices. Mirrors remote changes into local storage and
// calls onChange() so the UI refreshes.
export function subscribeArtifacts(onChange: () => void): () => void {
  const user = getCurrentUser();
  const db = getDb();
  if (!user || !db) return () => {};
  return onSnapshot(
    artifactsCol(db, user.uid),
    (snap) => {
      let changed = false;
      snap.docChanges().forEach((ch) => {
        if (ch.type === "removed") {
          const id = ch.doc.id;
          if (getLibrary().some((a) => a.id === id)) {
            removeArtifactLocal(id);
            changed = true;
          }
        } else {
          const remote = ch.doc.data();
          if (isArtifact(remote) && applyRemote(remote)) changed = true;
        }
      });
      if (changed) onChange();
    },
    (e) => console.warn("[sync] snapshot error", e),
  );
}

export function installSyncHooks(): void {
  setStorageSyncHooks({ onSave: pushArtifact, onDelete: deleteRemoteArtifact });
}

export function removeSyncHooks(): void {
  setStorageSyncHooks({ onSave: null, onDelete: null });
}
