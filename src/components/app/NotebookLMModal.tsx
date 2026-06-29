"use client";

import { useState } from "react";
import { X, Download, Copy, Check, ExternalLink, NotebookText, Headphones, Video, Layers } from "lucide-react";
import type { Lesson } from "@/lib/types";
import { exportLessonToPptx } from "@/lib/export";
import {
  NOTEBOOK_ACTIVITIES,
  NOTEBOOKLM_URL,
  notebookLmPrompt,
  lessonDetails,
  type NotebookActivity,
} from "@/lib/notebooklm";
import { Spinner } from "./ui";

const ACTIVITY_ICON: Record<NotebookActivity, typeof Headphones> = {
  podcast: Headphones,
  video: Video,
  flashcards: Layers,
};

function slugify(s: string): string {
  return (s || "lesson").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "lesson";
}

export function NotebookLMModal({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState<NotebookActivity | null>(null);

  // Download the two NotebookLM sources: the slide deck (.pptx) + a clean
  // lesson-details JSON (objectives, standards, vocabulary, slide content).
  const downloadPack = async () => {
    setDownloading(true);
    try {
      const slug = slugify(lesson.meta.title);
      const json = JSON.stringify(lessonDetails(lesson), null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-details.json`;
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
              The slide deck (.pptx) and a lesson-details file (objectives, standards, vocabulary, slide content) to
              upload into NotebookLM as sources.
            </p>
            <button
              onClick={downloadPack}
              disabled={downloading}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300 disabled:opacity-50"
            >
              {downloading ? <Spinner /> : downloaded ? <Check size={15} className="text-brand-600" /> : <Download size={15} />}
              {downloading ? "Preparing…" : downloaded ? "Downloaded — get more?" : "Download lesson pack (.pptx + .json)"}
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
        </ol>
      </div>
    </div>
  );
}
