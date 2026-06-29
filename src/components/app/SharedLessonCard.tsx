"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SharedLessonMeta } from "@/lib/lessonsLib";

export function SharedLessonCard({ lesson }: { lesson: SharedLessonMeta }) {
  return (
    <Link
      href={`/create/?shared=${lesson.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-300 card-shadow"
    >
      <h3 className="font-display text-base font-bold leading-snug text-ink">{lesson.title}</h3>
      {lesson.description && <p className="line-clamp-2 text-sm text-muted">{lesson.description}</p>}
      <div className="flex flex-wrap gap-1.5">
        {lesson.grade_level && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            {lesson.grade_level}
          </span>
        )}
        {lesson.subject && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            {lesson.subject}
          </span>
        )}
        {lesson.topic && (
          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
            {lesson.topic}
          </span>
        )}
      </div>
      {(lesson.standards || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted">
          <span className="font-semibold uppercase tracking-wide">Standards:</span>
          {(lesson.standards || []).slice(0, 2).map((s) => (
            <span key={s} className="rounded bg-paper px-1.5 py-0.5 font-medium">
              {s}
            </span>
          ))}
          {(lesson.standards || []).length > 2 && <span>+{(lesson.standards || []).length - 2}</span>}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted">
        <span>{lesson.author_name || "A teacher"}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
          Open <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}
