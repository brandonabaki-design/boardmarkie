"use client";

import { Type, ImagePlus, Square, Video } from "lucide-react";
import { Spinner } from "./ui";

/**
 * Shown the instant a lesson generation starts — the editor's shape (toolbar,
 * canvas, slide rail) appears immediately so it feels fast, then fills in with
 * the real deck when generation completes.
 */
export function LessonSkeleton() {
  return (
    <div>
      {/* header */}
      <div className="mb-4">
        <div className="flex gap-2">
          <span className="shimmer h-6 w-16 rounded-full" />
          <span className="shimmer h-6 w-20 rounded-full" />
          <span className="shimmer h-6 w-14 rounded-full" />
        </div>
        <div className="shimmer mt-3 h-9 w-2/3 rounded-lg" />
      </div>

      {/* refine bar */}
      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-line bg-white p-2.5 card-shadow">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="shimmer h-7 w-20 rounded-full" />
        ))}
      </div>

      <div className="flex gap-4">
        {/* left toolbar (static) */}
        <div className="flex shrink-0 flex-col gap-1.5">
          {[Type, ImagePlus, Square, Video].map((Icon, i) => (
            <div key={i} className="flex w-16 flex-col items-center gap-1 rounded-xl border border-line bg-white px-2 py-2.5 text-[11px] font-semibold text-muted/60">
              <Icon size={18} className="text-brand-300" />
            </div>
          ))}
        </div>

        {/* canvas */}
        <div className="min-w-0 flex-1">
          <div className="shimmer aspect-video w-full rounded-2xl" />
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-700">
            <Spinner className="h-4 w-4 text-brand-600" /> Crafting your lesson…
          </div>
        </div>

        {/* slide rail */}
        <div className="hidden w-44 shrink-0 lg:block">
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="shimmer aspect-video w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
