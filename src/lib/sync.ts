"use client";

// Cross-device sync of the per-user library to Supabase (`lessons` table), scoped
// to the signed-in user via RLS (author_id = auth.uid()). Each artifact is one
// row: `data` holds the full artifact JSON, plus denormalised metadata columns.
// is_published distinguishes a private row (your library only) from one shared to
// the /lessons catalogue — so sync writes deliberately OMIT is_published, never
// un-publishing a lesson on a routine save.
//
// Flow: on sign-in, CreateApp installs the storage hooks (so every save/delete
// mirrors to the cloud), runs syncOnce() to reconcile both sides, then subscribes
// for live updates from other devices.

import { supabase } from "./supabase";
import { getCurrentUser } from "./auth";
import {
  getLibrary,
  putArtifactLocal,
  removeArtifactLocal,
  setStorageSyncHooks,
  stripHeavyImages,
} from "./storage";
import type { Artifact } from "./types";

// Effective edit time for last-write-wins conflict resolution.
function stamp(a: Artifact): number {
  return a.updatedAt ?? a.createdAt ?? 0;
}

// Build the row for an artifact. Heavy base64 images are stripped (kept small +
// portable across accounts); text/layout/SVG/URL media all sync. is_published is
// intentionally omitted so a save preserves a row's published state.
function rowFor(a: Artifact, uid: string, name: string): Record<string, unknown> {
  const stripped = stripHeavyImages([a])[0] as Artifact;
  const m = a.meta as unknown as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    id: a.id,
    author_id: uid,
    author_name: name,
    kind: a.kind,
    title: str(m.title) ?? "Untitled",
    subject: str(m.subject),
    grade_level: str(m.yearGroup),
    topic: str(m.topic),
    description: str(m.summary),
    standards: Array.isArray(m.standards) ? (m.standards as string[]) : [],
    data: stripped,
    updated_at: new Date().toISOString(),
  };
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

// Apply a remote artifact to local storage if it's strictly newer.
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
  if (!user) return;
  const id = a.id;
  if (pushTimers[id]) clearTimeout(pushTimers[id]);
  pushTimers[id] = setTimeout(() => {
    delete pushTimers[id];
    void supabase
      .from("lessons")
      .upsert(rowFor(a, user.uid, user.name), { onConflict: "id" })
      .then(({ error }) => {
        if (error) console.warn("[sync] push failed", error.message);
      });
  }, 700);
}

export function deleteRemoteArtifact(id: string): void {
  const user = getCurrentUser();
  if (!user) return;
  if (pushTimers[id]) {
    clearTimeout(pushTimers[id]);
    delete pushTimers[id];
  }
  void supabase
    .from("lessons")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.warn("[sync] delete failed", error.message);
    });
}

export async function pullAllArtifacts(): Promise<Artifact[]> {
  const user = getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase.from("lessons").select("data").eq("author_id", user.uid);
  if (error) return [];
  return ((data ?? []) as unknown as { data: Artifact }[]).map((r) => r.data).filter(isArtifact);
}

// Two-way reconcile on sign-in: pull the cloud, push anything newer/local-only,
// pull down anything newer/remote-only. Newest (updatedAt||createdAt) wins.
export async function syncOnce(): Promise<void> {
  const user = getCurrentUser();
  if (!user) return;
  const remote = await pullAllArtifacts();
  const remoteById = new Map(remote.map((a) => [a.id, a]));
  const local = getLibrary();
  const localById = new Map(local.map((a) => [a.id, a]));

  for (const r of remote) {
    const l = localById.get(r.id);
    if (!l || stamp(r) > stamp(l)) putArtifactLocal(restoreImages(r, l));
  }
  const upserts = local
    .filter((l) => {
      const r = remoteById.get(l.id);
      return !r || stamp(l) > stamp(r);
    })
    .map((l) => rowFor(l, user.uid, user.name));
  if (upserts.length) {
    const { error } = await supabase.from("lessons").upsert(upserts, { onConflict: "id" });
    if (error) console.warn("[sync] initial push failed", error.message);
  }
}

// Live updates from other devices via Supabase Realtime (requires the table to be
// in the supabase_realtime publication — see supabase/schema.sql). Mirrors remote
// changes into local storage and calls onChange() so the UI refreshes. No-ops
// gracefully if realtime isn't enabled.
export function subscribeArtifacts(onChange: () => void): () => void {
  const user = getCurrentUser();
  if (!user) return () => {};
  const channel = supabase
    .channel(`lessons:${user.uid}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "lessons", filter: `author_id=eq.${user.uid}` },
      (payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
        let changed = false;
        if (payload.eventType === "DELETE") {
          const id = (payload.old?.id as string) || "";
          if (id && getLibrary().some((a) => a.id === id)) {
            removeArtifactLocal(id);
            changed = true;
          }
        } else {
          const remote = payload.new?.data;
          if (isArtifact(remote) && applyRemote(remote)) changed = true;
        }
        if (changed) onChange();
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export function installSyncHooks(): void {
  setStorageSyncHooks({ onSave: pushArtifact, onDelete: deleteRemoteArtifact });
}

export function removeSyncHooks(): void {
  setStorageSyncHooks({ onSave: null, onDelete: null });
}
