// Upload lesson media (e.g. a NotebookLM audio overview) to Supabase Storage and
// return a public URL we can drop onto a slide as an <audio> element. Files live
// under the signed-in user's own folder (enforced by storage RLS — see
// supabase/schema.sql). Stays a static export: this only runs in the browser.

import { supabase } from "./supabase";

export const MEDIA_BUCKET = "lesson-media";
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50MB (Supabase default per-file cap)

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|webm|weba)$/i;

export function isLikelyAudio(file: File): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXT.test(file.name);
}

function sanitizeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(-60) || "audio";
}

/**
 * Upload an audio file and return its public URL. Throws with a friendly message
 * if the user is signed out, the file is too big, or the bucket is missing.
 */
export async function uploadLessonAudio(file: File): Promise<string> {
  if (!isLikelyAudio(file)) throw new Error("That doesn't look like an audio file (mp3, m4a, wav…).");
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error(`That file is ${(file.size / 1024 / 1024).toFixed(0)}MB — the limit is 50MB. Try the MP3 download.`);
  }

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sign in to upload audio to your lessons.");

  const path = `${uid}/${Date.now()}-${sanitizeName(file.name)}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type || "audio/mpeg" });
  if (error) {
    const msg = `${error.message || ""}`.toLowerCase();
    if (msg.includes("bucket") && msg.includes("not found")) {
      throw new Error("Audio storage isn't set up yet — run the latest supabase/schema.sql.");
    }
    throw new Error(error.message || "Upload failed. Please try again.");
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Upload succeeded but no URL was returned.");
  return data.publicUrl;
}
