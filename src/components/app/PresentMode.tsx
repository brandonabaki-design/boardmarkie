"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Lesson, Slide } from "@/lib/types";

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

  const slide = lesson.slides[i];

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
        <PresentSlide slide={slide} lesson={lesson} />

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

function PresentSlide({ slide, lesson }: { slide: Slide; lesson: Lesson }) {
  const visual = slide.imageUrl || slide.diagramSvg;

  if (slide.layout === "title") {
    return (
      <SlideFrame>
        <div className="flex h-full flex-col items-center justify-center px-[6%] text-center">
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-ink">{slide.title}</h1>
          {slide.subtitle && <p className="mt-5 text-2xl text-muted">{slide.subtitle}</p>}
          <p className="mt-10 text-lg font-semibold text-brand-700">
            {lesson.meta.subject} • {lesson.meta.yearGroup}
          </p>
        </div>
      </SlideFrame>
    );
  }

  return (
    <SlideFrame>
      <div className="flex h-full flex-col px-[5%] py-[4%]">
        <h2 className="font-display text-4xl font-extrabold tracking-tight text-ink">{slide.title}</h2>
        {slide.subtitle && <p className="mt-2 text-xl text-muted">{slide.subtitle}</p>}

        <div className={`mt-6 grid flex-1 gap-6 overflow-hidden ${visual ? "grid-cols-[1.1fr_0.9fr]" : "grid-cols-1"}`}>
          <div className="min-h-0 space-y-4 overflow-auto pr-2 text-[1.6rem] leading-snug text-ink">
            {slide.body && <p>{slide.body}</p>}

            {slide.bullets && slide.bullets.length > 0 && (
              <ul className="space-y-3">
                {slide.bullets.map((b, k) => (
                  <li key={k} className="flex gap-3">
                    <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    {b}
                  </li>
                ))}
              </ul>
            )}

            {slide.vocabulary && slide.vocabulary.length > 0 && (
              <dl className="space-y-2">
                {slide.vocabulary.map((v, k) => (
                  <div key={k}>
                    <dt className="inline font-bold text-brand-700">{v.term}: </dt>
                    <dd className="inline text-ink">{v.definition}</dd>
                  </div>
                ))}
              </dl>
            )}

            {slide.activity && (
              <div className="rounded-xl bg-amber/[0.1] p-4">
                <p className="font-bold text-ink">{slide.activity.title}</p>
                <p className="mt-1 text-[1.4rem] leading-snug text-ink">{slide.activity.instructions}</p>
              </div>
            )}

            {slide.discussionQuestions && slide.discussionQuestions.length > 0 && (
              <ul className="space-y-2">
                {slide.discussionQuestions.map((q, k) => (
                  <li key={k} className="rounded-lg bg-mint px-4 py-2 text-brand-900">
                    {q}
                  </li>
                ))}
              </ul>
            )}

            {slide.quiz && slide.quiz.length > 0 && (
              <ol className="space-y-3">
                {slide.quiz.map((q, k) => (
                  <li key={k}>
                    <p className="font-semibold text-ink">
                      {k + 1}. {q.question}
                    </p>
                    {q.options.length > 0 && (
                      <ul className="mt-1 grid grid-cols-2 gap-1.5 text-[1.3rem]">
                        {q.options.map((o, oi) => (
                          <li key={oi} className="rounded bg-paper px-3 py-1 text-ink">
                            {o}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {visual && (
            <div className="flex min-h-0 items-center justify-center">
              {slide.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slide.imageUrl}
                  alt={slide.imageAlt || slide.title}
                  className="max-h-full max-w-full rounded-xl object-contain"
                />
              ) : (
                <div
                  role="img"
                  aria-label={slide.imageAlt || "Diagram"}
                  className="max-h-full w-full overflow-hidden [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: slide.diagramSvg || "" }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </SlideFrame>
  );
}

function SlideFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="aspect-video max-h-full w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
      {children}
    </div>
  );
}
