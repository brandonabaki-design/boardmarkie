// Upload lesson media (e.g. a NotebookLM audio/video overview) to Supabase
// Storage and return a public URL we can drop onto a slide as an <audio>/<video>
// element. Files live under the signed-in user's own folder (enforced by storage
// RLS — see supabase/schema.sql). Stays a static export: browser-only.

import { supabase } from "./supabase";

export const MEDIA_BUCKET = "lesson-media";
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|webm|weba)$/i;
const VIDEO_EXT = /\.(mp4|m4v|mov|webm|ogv|mkv)$/i;

export function isLikelyAudio(file: File): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXT.test(file.name);
}

export function isLikelyVideo(file: File): boolean {
  return file.type.startsWith("video/") || VIDEO_EXT.test(file.name);
}

function sanitizeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(-60) || "media";
}

interface UploadOptions {
  kind: "audio" | "video";
  maxBytes: number;
}

async function uploadMedia(file: File, { kind, maxBytes }: UploadOptions): Promise<string> {
  const ok = kind === "audio" ? isLikelyAudio(file) : isLikelyVideo(file);
  if (!ok) {
    throw new Error(
      kind === "audio"
        ? "That doesn't look like an audio file (mp3, m4a, wav…)."
        : "That doesn't look like a video file (mp4, mov, webm…).",
    );
  }
  if (file.size > maxBytes) {
    throw new Error(
      `That file is ${(file.size / 1024 / 1024).toFixed(0)}MB — the limit is ${maxBytes / 1024 / 1024}MB.` +
        (kind === "video" ? " Try a shorter clip or a lower-resolution export." : " Try the MP3 download."),
    );
  }

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error(`Sign in to upload ${kind} to your lessons.`);

  const path = `${uid}/${Date.now()}-${sanitizeName(file.name)}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || (kind === "audio" ? "audio/mpeg" : "video/mp4"),
    });
  if (error) {
    const msg = `${error.message || ""}`.toLowerCase();
    if (msg.includes("bucket") && msg.includes("not found")) {
      throw new Error("Media storage isn't set up yet — run the latest supabase/schema.sql.");
    }
    if (msg.includes("exceeded") || msg.includes("maximum") || msg.includes("too large")) {
      throw new Error("The storage service rejected the file as too large. Try a smaller export.");
    }
    throw new Error(error.message || "Upload failed. Please try again.");
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Upload succeeded but no URL was returned.");
  return data.publicUrl;
}

/** Upload an audio file → public URL. */
export function uploadLessonAudio(file: File): Promise<string> {
  return uploadMedia(file, { kind: "audio", maxBytes: MAX_AUDIO_BYTES });
}

/** Upload a video file → public URL. */
export function uploadLessonVideo(file: File): Promise<string> {
  return uploadMedia(file, { kind: "video", maxBytes: MAX_VIDEO_BYTES });
}
