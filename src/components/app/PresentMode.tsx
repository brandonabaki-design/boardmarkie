"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, StickyNote, Play, Pause, RotateCcw } from "lucide-react";
import type { Lesson } from "@/lib/types";
import { ensureElements } from "@/lib/canvas";
import { SlideCanvas } from "./SlideCanvas";

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PresentMode({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const total = lesson.slides.length;
  const [i, setI] = useState(0);
  const [notes, setNotes] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  const go = useCallback(
    (delta: number) => setI((v) => Math.min(total - 1, Math.max(0, v + delta))),
    [total],
  );

  // Lesson timer.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setI(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setI(total - 1);
      } else if (e.key === "n" || e.key === "N") {
        setNotes((v) => !v);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, total]);

  const slide = ensureElements(lesson.slides[i]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-ink" role="dialog" aria-modal="true" aria-label="Presentation">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-white/70 sm:px-6">
        <span className="min-w-0 truncate">{lesson.meta.title}</span>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* lesson timer */}
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
            <button
              onClick={() => setRunning((r) => !r)}
              aria-label={running ? "Pause timer" : "Start timer"}
              className="text-white/80 transition-colors hover:text-white"
            >
              {running ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <span className="tabular-nums text-white" aria-label="Elapsed time">
              {mmss(elapsed)}
            </span>
            <button
              onClick={() => {
                setElapsed(0);
                setRunning(false);
              }}
              aria-label="Reset timer"
              className="text-white/60 transition-colors hover:text-white"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <button
            onClick={() => setNotes((v) => !v)}
            aria-pressed={notes}
            title="Speaker notes (N)"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors ${
              notes ? "bg-white text-ink" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <StickyNote size={15} /> <span className="hidden sm:inline">Notes</span>
          </button>

          <span className="tabular-nums">
            {i + 1} / {total}
          </span>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/20"
          >
            <X size={15} /> <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-6">
        <div className="aspect-video max-h-full w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <SlideCanvas elements={slide.elements ?? []} background={slide.background} interactive />
        </div>

        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          aria-label="Previous slide"
          className="absolute left-3 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronLeft size={26} />
        </button>
        <button
          onClick={() => go(1)}
          disabled={i === total - 1}
          aria-label="Next slide"
          className="absolute right-3 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronRight size={26} />
        </button>
      </div>

      {notes && (
        <div className="max-h-[26vh] shrink-0 overflow-auto border-t border-white/15 px-6 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/40">Speaker notes · slide {i + 1}</p>
          {slide.teacherNotes ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">{slide.teacherNotes}</p>
          ) : (
            <p className="text-sm italic text-white/40">No notes for this slide.</p>
          )}
        </div>
      )}
    </div>
  );
}
