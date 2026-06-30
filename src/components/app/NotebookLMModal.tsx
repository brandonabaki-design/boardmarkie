"use client";

import { useState } from "react";
import { X, Download, Copy, Check, ExternalLink, NotebookText, Headphones, Video, Layers, QrCode, Upload } from "lucide-react";
import type { Lesson, Slide } from "@/lib/types";
import { exportLessonToPptx } from "@/lib/export";
import { cid, textElement, imageElement, audioElement, MUTED } from "@/lib/canvas";
import { qrToSvg } from "@/lib/qr";
import { uploadLessonAudio } from "@/lib/media";
import { useSupabaseUser } from "@/lib/supabaseAuth";
import {
  NOTEBOOK_ACTIVITIES,
  NOTEBOOKLM_URL,
  notebookLmPrompt,
  lessonDetailsPdf,
  type NotebookActivity,
} from "@/lib/notebooklm";
import { Spinner } from "./ui";

const ACTIVITY_ICON: Record<NotebookActivity, typeof Headphones> = {
  podcast: Headphones,
  video: Video,
  flashcards: Layers,
};

// Per-resource labels for the slide that carries the QR/link to the finished
// NotebookLM artifact.
const RESOURCE_SLIDE: Record<NotebookActivity, { verb: string; emoji: string; scan: string }> = {
  podcast: { verb: "Listen to the Podcast", emoji: "🎧", scan: "Scan to listen" },
  video: { verb: "Watch the Video", emoji: "🎬", scan: "Scan to watch" },
  flashcards: { verb: "Study the Flashcards", emoji: "🃏", scan: "Scan to study" },
};

function slugify(s: string): string {
  return (s || "lesson").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "lesson";
}

// A slide with an inline audio player (the uploaded NotebookLM overview).
function buildAudioSlide(title: string, src: string): Slide {
  return {
    id: cid("sl"),
    layout: "content",
    title,
    elements: [
      textElement({ text: `${title} 🎧`, x: 6, y: 8, w: 88, h: 12, fontSize: 7, bold: true, font: "display", align: "center", z: 1 }),
      audioElement({ src, title, x: 14, y: 34, w: 72, h: 34, z: 2 }),
    ],
  };
}

// A dedicated slide carrying a QR + link to a NotebookLM resource (mirrors the
// EduSim QR slide). Students scan to open the podcast/video/flashcards.
function buildResourceSlide(kind: NotebookActivity, url: string, qrSvg: string): Slide {
  const r = RESOURCE_SLIDE[kind];
  return {
    id: cid("sl"),
    layout: "content",
    title: r.verb,
    elements: [
      textElement({ text: `${r.verb} ${r.emoji}`, x: 6, y: 8, w: 88, h: 12, fontSize: 7, bold: true, font: "display", align: "center", z: 1 }),
      textElement({ text: `${r.scan}, or open the link below`, x: 12, y: 22, w: 76, h: 8, fontSize: 3.2, color: MUTED, align: "center", z: 2 }),
      imageElement({ svg: qrSvg, alt: `${r.verb} QR code`, x: 38, y: 32, w: 24, h: 43, z: 3 }),
      textElement({ text: url, x: 6, y: 80, w: 88, h: 6, fontSize: 2, color: MUTED, align: "center", z: 4 }),
    ],
  };
}

export function NotebookLMModal({
  lesson,
  onClose,
  onAddSlide,
}: {
  lesson: Lesson;
  onClose: () => void;
  onAddSlide?: (slide: Slide) => void;
}) {
  const { user } = useSupabaseUser();
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState<NotebookActivity | null>(null);

  // final step: paste a link to the finished resource → QR slide
  const [resourceKind, setResourceKind] = useState<NotebookActivity>("podcast");
  const [resourceUrl, setResourceUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");

  // podcast: upload the audio file → inline player slide
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  // Download the two NotebookLM sources: the slide deck (.pptx) + a clean
  // lesson-details PDF (objectives, standards, vocabulary, slide content).
  // NotebookLM can't ingest JSON, so the details ship as a PDF it reads natively.
  const downloadPack = async () => {
    setDownloading(true);
    try {
      const slug = slugify(lesson.meta.title);
      const blob = lessonDetailsPdf(lesson);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-details.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      await exportLessonToPptx(lesson); // triggers the .pptx download
      setDownloaded(true);
    } finally {
      setDownloading(false);
    }
  };

  const copyPrompt = async (activity: NotebookActivity) => {
    try {
      await navigator.clipboard.writeText(notebookLmPrompt(activity, lesson));
      setCopied(activity);
      setTimeout(() => setCopied((c) => (c === activity ? null : c)), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  // Paste a NotebookLM "Share" link to the finished resource → add a QR slide.
  const addResource = async () => {
    let url: string;
    try {
      const u = new URL(resourceUrl.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      url = u.toString();
    } catch {
      setAddErr("Paste a valid link (starting with https://).");
      return;
    }
    setAddErr("");
    setAdding(true);
    try {
      const qrSvg = await qrToSvg(url);
      onAddSlide?.(buildResourceSlide(resourceKind, url, qrSvg));
      onClose();
    } catch {
      setAddErr("Couldn't generate the QR code. Check the link and try again.");
      setAdding(false);
    }
  };

  // Upload the downloaded audio overview → a slide with an inline player.
  const uploadAudio = async () => {
    if (!file) return;
    setUploadErr("");
    setUploading(true);
    try {
      const src = await uploadLessonAudio(file);
      onAddSlide?.(buildAudioSlide(RESOURCE_SLIDE.podcast.verb, src));
      onClose();
    } catch (e) {
      setUploadErr((e as Error)?.message || "Upload failed.");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-line bg-white p-6 card-shadow">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <NotebookText size={20} className="text-brand-600" /> Create with NotebookLM
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          Turn this lesson into a podcast, video or flashcards with Google NotebookLM — grounded in your lesson and
          localised for AISA &amp; the UAE.
        </p>

        <ol className="mt-5 space-y-4 text-sm">
          <li>
            <p className="font-semibold text-ink">1. Download your lesson sources</p>
            <p className="mt-0.5 text-muted">
              The slide deck (.pptx) and a lesson-details PDF (objectives, standards, vocabulary, slide content) to
              upload into NotebookLM as sources.
            </p>
            <button
              onClick={downloadPack}
              disabled={downloading}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300 disabled:opacity-50"
            >
              {downloading ? <Spinner /> : downloaded ? <Check size={15} className="text-brand-600" /> : <Download size={15} />}
              {downloading ? "Preparing…" : downloaded ? "Downloaded — get more?" : "Download lesson pack (.pptx + .pdf)"}
            </button>
          </li>

          <li>
            <p className="font-semibold text-ink">2. Pick what to create &amp; copy its prompt</p>
            <p className="mt-0.5 text-muted">Copies a tailored brief to your clipboard for that output type.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {NOTEBOOK_ACTIVITIES.map((a) => {
                const Icon = ACTIVITY_ICON[a.id];
                const isCopied = copied === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => copyPrompt(a.id)}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                      isCopied ? "border-brand-400 bg-brand-50" : "border-line bg-white hover:border-brand-300"
                    }`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <Icon size={16} />
                    </span>
                    <span className="text-sm font-bold text-ink">{a.label}</span>
                    <span className="text-[11px] text-muted">{a.description}</span>
                    <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${isCopied ? "text-brand-700" : "text-muted"}`}>
                      {isCopied ? <Check size={12} /> : <Copy size={12} />} {isCopied ? "Copied!" : "Copy prompt"}
                    </span>
                  </button>
                );
              })}
            </div>
          </li>

          <li>
            <p className="font-semibold text-ink">3. Open NotebookLM</p>
            <p className="mt-0.5 text-muted">
              Create a notebook, upload the two files as sources, paste the prompt, and generate.
            </p>
            <a
              href={NOTEBOOKLM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <ExternalLink size={15} /> Open NotebookLM
            </a>
          </li>

          {onAddSlide && (
            <li>
              <p className="font-semibold text-ink">4. Add the finished resource to this lesson</p>
              <p className="mt-0.5 text-muted">
                Once your audio overview, video or flashcards are ready, hit{" "}
                <span className="font-semibold text-ink">Share</span> in NotebookLM, copy the link, and paste it here.
                We&apos;ll add a slide with a QR code students can scan to open it. (NotebookLM can&apos;t be played inside
                another site, so the QR/link is the way to share it.)
              </p>
              <div className="mt-2 flex gap-1 rounded-lg border border-line bg-paper p-1">
                {NOTEBOOK_ACTIVITIES.map((a) => {
                  const Icon = ACTIVITY_ICON[a.id];
                  const on = resourceKind === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setResourceKind(a.id)}
                      className={`inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        on ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"
                      }`}
                    >
                      <Icon size={13} /> {a.label}
                    </button>
                  );
                })}
              </div>

              {/* Podcasts can be uploaded and PLAYED inside the deck. */}
              {resourceKind === "podcast" && (
                <div className="mt-2 rounded-xl border border-line bg-paper/60 p-3">
                  <p className="text-xs font-semibold text-ink">Plays inside the deck (recommended)</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    In NotebookLM, download the audio overview, then upload the file here — it becomes a player you can
                    hit during the lesson.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300">
                      <Upload size={15} className="text-brand-600" />
                      {file ? "Choose a different file" : "Choose audio file"}
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          setFile(e.target.files?.[0] ?? null);
                          setUploadErr("");
                        }}
                      />
                    </label>
                    {file && <span className="max-w-[12rem] truncate text-xs text-muted">{file.name}</span>}
                  </div>
                  {uploadErr && <p className="mt-2 text-xs text-coral">{uploadErr}</p>}
                  {!user && <p className="mt-2 text-xs text-muted">Sign in to upload audio.</p>}
                  <button
                    onClick={uploadAudio}
                    disabled={!file || uploading || !user}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                  >
                    {uploading ? <Spinner /> : <Upload size={15} />} {uploading ? "Uploading…" : "Upload & add player slide"}
                  </button>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                    <span className="h-px flex-1 bg-line" /> or paste a link <span className="h-px flex-1 bg-line" />
                  </div>
                </div>
              )}

              <input
                value={resourceUrl}
                onChange={(e) => {
                  setResourceUrl(e.target.value);
                  setAddErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && !adding && addResource()}
                placeholder="Paste your NotebookLM share link…"
                className="mt-2 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              {addErr && <p className="mt-2 text-xs text-coral">{addErr}</p>}
              <button
                onClick={addResource}
                disabled={!resourceUrl.trim() || adding}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {adding ? <Spinner /> : <QrCode size={15} />} Add QR / link slide
              </button>
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}
