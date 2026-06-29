// Shared lesson-presentation library on Supabase. Additive: the per-user private
// library + cross-device sync still run on Firebase/localStorage unchanged. This
// lets any teacher PUBLISH a lesson to a world-readable catalogue and OPEN any
// other teacher's published lesson. Heavy base64 raster images are stripped
// before upload (Firestore/Supabase doc-size + cross-account portability); text,
// layout, SVG diagrams and URL-based media travel fine.

import { supabase } from "./supabase";
import { stripHeavyImages } from "./storage";
import type { Lesson } from "./types";

export interface SharedLessonMeta {
  id: string;
  author_id: string;
  author_name: string | null;
  title: string;
  subject: string | null;
  grade_level: string | null;
  topic: string | null;
  description: string | null;
  standards: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface SharedLessonFilters {
  search?: string;
  grade?: string;
  subject?: string;
}

const META_COLUMNS =
  "id, author_id, author_name, title, subject, grade_level, topic, description, standards, is_published, created_at, updated_at";

/** Publish (or re-publish) a lesson to the shared library. Upserts by lesson id. */
export async function publishLesson(
  lesson: Lesson,
  author: { id: string; name: string },
): Promise<void> {
  const stripped = stripHeavyImages([lesson])[0] as Lesson;
  const row = {
    id: lesson.id,
    author_id: author.id,
    author_name: author.name,
    kind: "lesson",
    title: lesson.meta.title,
    subject: lesson.meta.subject || null,
    grade_level: lesson.meta.yearGroup || null,
    topic: lesson.meta.topic || null,
    description: lesson.meta.summary || null,
    standards: lesson.meta.standards ?? [],
    data: stripped,
    is_published: true,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("lessons").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

/** Remove a lesson from the shared library (author only). */
export async function unpublishLesson(id: string): Promise<void> {
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw error;
}

/** Browse the shared library (lightweight metadata rows; no `data` blob). */
export async function listSharedLessons(filters: SharedLessonFilters = {}): Promise<SharedLessonMeta[]> {
  const { search, grade, subject } = filters;
  let q = supabase.from("lessons").select(META_COLUMNS).eq("is_published", true).eq("kind", "lesson");
  if (grade) q = q.eq("grade_level", grade);
  if (subject) q = q.eq("subject", subject);
  if (search && search.trim()) {
    const term = search.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    if (term) q = q.or(`title.ilike.%${term}%,topic.ilike.%${term}%,description.ilike.%${term}%`);
  }
  const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as SharedLessonMeta[];
}

/** Fetch one shared lesson's full artifact (the `data` jsonb), as a Lesson. */
export async function getSharedLesson(id: string): Promise<Lesson> {
  const { data, error } = await supabase.from("lessons").select("data").eq("id", id).single();
  if (error) throw error;
  return (data as unknown as { data: Lesson }).data;
}

/** Ids of the signed-in user's own published lessons (to badge "Shared" in the UI). */
export async function getMyPublishedIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("lessons")
    .select("id")
    .eq("author_id", userId)
    .eq("is_published", true);
  if (error) return new Set();
  return new Set((data ?? []).map((r) => (r as unknown as { id: string }).id));
}
