"use client";

import { useEffect, useState } from "react";
import type { GenerationMode } from "@/lib/types";
import { LogoMark } from "@/components/Logo";

const MESSAGES: Record<GenerationMode, string[]> = {
  lesson: [
    "Reading the curriculum…",
    "Setting learning objectives…",
    "Writing the slides…",
    "Picking key vocabulary…",
    "Designing an activity…",
    "Adding teacher notes…",
    "Polishing the plenary…",
  ],
  series: [
    "Mapping the unit…",
    "Sequencing the lessons…",
    "Building progression…",
    "Choosing key activities…",
    "Joining it all together…",
  ],
  worksheet: [
    "Drafting questions…",
    "Mixing question types…",
    "Adding challenge…",
    "Writing the answer key…",
    "Formatting for print…",
  ],
};

export function GeneratingState({ mode }: { mode: GenerationMode }) {
  const messages = MESSAGES[mode];
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % messages.length), 1600);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 animate-float rounded-3xl bg-brand-100 blur-xl" />
        <LogoMark className="h-16 w-16 animate-float" />
      </div>
      <h2 className="mt-8 font-display text-2xl font-extrabold text-ink">
        Building your {mode === "series" ? "unit" : mode}
      </h2>
      <p className="mt-2 h-6 text-muted transition-all">{messages[i]}</p>

      <div className="mt-8 w-full space-y-3">
        {[0, 1, 2].map((r) => (
          <div key={r} className="rounded-xl border border-line bg-white p-4">
            <div className="shimmer h-3 w-1/3 rounded-full" />
            <div className="mt-3 space-y-2">
              <div className="shimmer h-2.5 w-full rounded-full" />
              <div className="shimmer h-2.5 w-5/6 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted">This usually takes 10–30 seconds.</p>
    </div>
  );
}
