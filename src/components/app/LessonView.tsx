"use client";

import { useState } from "react";
import { Smile, GraduationCap, Scissors, Plus, Wand2, BookOpen, Target } from "lucide-react";
import type { EditAction, Lesson } from "@/lib/types";
import { SlideCard } from "./SlideCard";
import { Spinner } from "./ui";

export function LessonView({
  lesson,
  busy,
  onEdit,
  onGenerateImage,
  onGenerateDiagram,
  mediaBusy,
}: {
  lesson: Lesson;
  busy: boolean;
  onEdit: (action: EditAction, instruction?: string, slideId?: string) => void;
  onGenerateImage: (slideId: string) => void;
  onGenerateDiagram: (slideId: string) => void;
  mediaBusy: { slideId: string; kind: "image" | "diagram" } | null;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      {/* lesson header */}
      <div className="printable rounded-2xl border border-line bg-white p-6 card-shadow sm:p-8">
        <div className="flex flex-wrap gap-2">
          <Chip>{lesson.meta.subject}</Chip>
          <Chip>{lesson.meta.yearGroup}</Chip>
          <Chip>{lesson.meta.durationMinutes} min</Chip>
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {lesson.meta.title}
        </h1>
        {lesson.meta.summary && <p className="mt-3 text-lg text-muted">{lesson.meta.summary}</p>}

        {lesson.meta.objectives.length > 0 && (
          <div className="mt-6 rounded-xl bg-mint p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-700">
              <Target size={14} /> Learning objectives
            </p>
            <ul className="mt-3 space-y-2">
              {lesson.meta.objectives.map((o, i) => (
                <li key={i} className="flex gap-2.5 text-[15px] text-ink">
                  <span className="text-brand-500">✓</span> {o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {lesson.meta.vocabulary.length > 0 && (
          <div className="mt-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
              <BookOpen size={14} /> Key vocabulary
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lesson.meta.vocabulary.map((v) => (
                <span
                  key={v.term}
                  title={v.definition}
                  className="rounded-full border border-line bg-paper px-3 py-1 text-sm font-medium text-ink"
                >
                  {v.term}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* lesson-level edit bar */}
      <LessonEditBar busy={busy} onEdit={onEdit} />

      {/* slides */}
      <div className="mt-5 space-y-5">
        {lesson.slides.map((slide, i) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            index={i}
            total={lesson.slides.length}
            busy={busy}
            onEditSlide={(slideId, action, instruction) => onEdit(action, instruction, slideId)}
            onGenerateImage={onGenerateImage}
            onGenerateDiagram={onGenerateDiagram}
            mediaBusy={mediaBusy && mediaBusy.slideId === slide.id ? mediaBusy.kind : null}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
      {children}
    </span>
  );
}

function LessonEditBar({
  busy,
  onEdit,
}: {
  busy: boolean;
  onEdit: (action: EditAction, instruction?: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const actions: { action: EditAction; label: string; icon: typeof Smile }[] = [
    { action: "make_fun", label: "Make it fun", icon: Smile },
    { action: "simplify", label: "Simplify", icon: GraduationCap },
    { action: "advance", label: "Stretch", icon: GraduationCap },
    { action: "shorten", label: "Shorten", icon: Scissors },
    { action: "add_slide", label: "Add slide", icon: Plus },
  ];

  return (
    <div className="no-print sticky top-[68px] z-10 mt-5 rounded-2xl border border-line bg-white/90 p-2.5 backdrop-blur card-shadow">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-1.5 text-xs font-semibold text-muted">
          {busy ? "Working…" : "Refine whole lesson:"}
        </span>
        {actions.map((a) => (
          <button
            key={a.action}
            disabled={busy}
            onClick={() => onEdit(a.action)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
          >
            <a.icon size={14} className="text-brand-600" />
            {a.label}
          </button>
        ))}
        <button
          disabled={busy}
          onClick={() => setShowCustom((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
        >
          <Wand2 size={14} className="text-brand-600" />
          Rewrite…
        </button>
        {busy && <Spinner className="ml-auto mr-1 h-4 w-4 text-brand-600" />}
      </div>

      {showCustom && (
        <div className="mt-2 flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && custom.trim()) {
                onEdit("rewrite", custom.trim());
                setCustom("");
                setShowCustom(false);
              }
            }}
            placeholder="e.g. add a real-world example to every teaching slide"
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand-400"
          />
          <button
            disabled={!custom.trim() || busy}
            onClick={() => {
              onEdit("rewrite", custom.trim());
              setCustom("");
              setShowCustom(false);
            }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
