"use client";

import { ArrowRight, Target } from "lucide-react";
import type { LessonSeries, SeriesLesson } from "@/lib/types";
import { Spinner } from "./ui";

export function SeriesView({
  series,
  busyLesson,
  onExpand,
}: {
  series: LessonSeries;
  busyLesson: number | null;
  onExpand: (lesson: SeriesLesson) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="printable rounded-2xl border border-line bg-white p-6 card-shadow sm:p-8">
        <div className="flex flex-wrap gap-2">
          <Chip>{series.meta.subject}</Chip>
          <Chip>{series.meta.yearGroup}</Chip>
          <Chip>{series.lessons.length} lessons</Chip>
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {series.meta.title}
        </h1>
        {series.meta.summary && <p className="mt-3 text-lg text-muted">{series.meta.summary}</p>}
      </div>

      <ol className="mt-5 space-y-4">
        {series.lessons.map((lesson) => (
          <li
            key={lesson.number}
            className="print-page relative rounded-2xl border border-line bg-white p-6 card-shadow"
          >
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 font-display font-extrabold text-white">
                {lesson.number}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl font-bold text-ink">{lesson.title}</h3>
                {lesson.objective && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-sm text-brand-700">
                    <Target size={15} className="mt-0.5 shrink-0" />
                    {lesson.objective}
                  </p>
                )}
                {lesson.summary && <p className="mt-2 text-[15px] text-muted">{lesson.summary}</p>}

                {lesson.keyActivities.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {lesson.keyActivities.map((a, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-paper px-3 py-1.5 text-xs font-medium text-ink"
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => onExpand(lesson)}
                  disabled={busyLesson !== null}
                  className="no-print mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
                >
                  {busyLesson === lesson.number ? (
                    <>
                      <Spinner /> Building…
                    </>
                  ) : (
                    <>
                      Build full lesson <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>
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
