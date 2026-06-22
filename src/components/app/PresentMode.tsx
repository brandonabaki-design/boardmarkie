"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Lesson } from "@/lib/types";
import { ensureElements } from "@/lib/canvas";
import { SlideCanvas } from "./SlideCanvas";

export function PresentMode({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const total = lesson.slides.length;
  const [i, setI] = useState(0);

  const go = useCallback(
    (delta: number) => setI((v) => Math.min(total - 1, Math.max(0, v + delta))),
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  const slide = ensureElements(lesson.slides[i]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-ink">
      <div className="flex items-center justify-between px-6 py-3 text-sm text-white/70">
        <span className="truncate">{lesson.meta.title}</span>
        <div className="flex items-center gap-5">
          <span className="tabular-nums">
            {i + 1} / {total}
          </span>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/20"
          >
            <X size={15} /> Exit
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-8">
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
    </div>
  );
}
