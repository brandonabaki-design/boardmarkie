"use client";

import { useMemo, useState } from "react";
import { X, ClipboardPaste, Sparkles, FileText } from "lucide-react";
import type { Lesson } from "@/lib/types";
import { lessonFromOutline, previewOutline } from "@/lib/importOutline";
import { Field } from "./ui";

const PLACEHOLDER = `Slide 1
Photosynthesis: How Plants Make Their Own Food (Grade 3)

Slide 2
What Is Photosynthesis?
Photosynthesis is how plants make their own food.
Plants use sunlight to turn water and air into sugar (food).

Slide 3
What Plants Need (Inputs)
Sunlight (energy from the Sun)
Water (usually from the soil)
Carbon dioxide (a gas in the air)`;

export function ImportLessonModal({
  onClose,
  onImport,
  canAutoMedia,
}: {
  onClose: () => void;
  onImport: (lesson: Lesson, addMedia: boolean) => void;
  canAutoMedia: boolean;
}) {
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [region, setRegion] = useState("");
  const [addMedia, setAddMedia] = useState(canAutoMedia);
  // Track whether the teacher edited the grade so detection doesn't clobber it.
  const [gradeTouched, setGradeTouched] = useState(false);

  const preview = useMemo(() => previewOutline(text), [text]);

  // Auto-fill the grade from the pasted text until the teacher types their own.
  const detectedGrade = preview?.yearGroup ?? "";
  const gradeValue = gradeTouched ? grade : grade || detectedGrade;

  const onCreate = () => {
    const lesson = lessonFromOutline(text, {
      subject,
      yearGroup: gradeValue,
      region,
    });
    if (!lesson) return;
    onImport(lesson, addMedia && canAutoMedia);
  };

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-line bg-white p-6 card-shadow">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <ClipboardPaste size={20} className="text-brand-600" /> Paste a lesson — no AI
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">
          Already have an outline from MagicSchool (or anywhere)? Paste it below and Boardmarkie builds the slides
          instantly — no Claude credits used. Each <span className="font-semibold text-ink">Slide N</span> becomes a slide;
          the first line of each is its title.
        </p>

        <div className="mt-4">
          <Field label="Paste your lesson outline">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={11}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              className={`${inputCls} resize-y font-mono text-xs leading-relaxed`}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Subject" hint="optional">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Science"
              className={inputCls}
            />
          </Field>
          <Field label="Grade / year" hint="auto-detected">
            <input
              value={gradeValue}
              onChange={(e) => {
                setGradeTouched(true);
                setGrade(e.target.value);
              }}
              placeholder="e.g. Grade 3"
              className={inputCls}
            />
          </Field>
          <Field label="Region" hint="optional">
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. UAE"
              className={inputCls}
            />
          </Field>
        </div>

        {preview ? (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            <div className="flex items-center gap-2 font-semibold">
              <FileText size={15} /> {preview.slideCount} slide{preview.slideCount === 1 ? "" : "s"} detected
            </div>
            <p className="mt-1 text-brand-800/90">
              <span className="font-semibold">{preview.title || "Untitled lesson"}</span>
              {preview.standards.length > 0 && (
                <span className="block text-xs text-brand-800/80">
                  Standards found: {preview.standards.join(", ")}
                </span>
              )}
            </p>
          </div>
        ) : text.trim() ? (
          <div className="mt-4 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
            Couldn&apos;t find any slides. Make sure each slide starts with a line like “Slide 1”, “Slide 2”…
          </div>
        ) : null}

        {canAutoMedia && (
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-paper px-4 py-3">
            <input
              type="checkbox"
              checked={addMedia}
              onChange={(e) => setAddMedia(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <Sparkles size={14} className="text-brand-600" /> Find a relevant photo/GIF for each slide
              </span>
              <span className="text-xs text-muted">Free web image search (no AI) — you can swap or remove any image after.</span>
            </span>
          </label>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!preview}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            <ClipboardPaste size={15} /> Create lesson
          </button>
        </div>
      </div>
    </div>
  );
}
