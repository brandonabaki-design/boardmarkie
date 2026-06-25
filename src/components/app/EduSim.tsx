"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Gamepad2, Copy, ExternalLink, Check, X } from "lucide-react";
import type { Lesson } from "@/lib/types";

// The AISA "EduSim" gem on Gemini — turns a lesson into a simulation-based
// learning experience for students.
const EDUSIM_GEM_URL = "https://gemini.google.com/gem/11QD4AkTJjpXVgEGw8SJ74nq99ntDfv8V?usp=sharing";

/** Serialise a lesson to clean, paste-ready text for the EduSim gem. */
function lessonToText(lesson: Lesson): string {
  const m = lesson.meta;
  const out: string[] = [];
  out.push(`# ${m.title}`);
  out.push(`${m.subject} · ${m.yearGroup} · ${m.durationMinutes} min · ${m.region}`);
  if (m.summary) out.push("", m.summary);
  if (m.objectives?.length) {
    out.push("", "## Learning objectives");
    m.objectives.forEach((o) => out.push(`- ${o}`));
  }
  if (m.vocabulary?.length) {
    out.push("", "## Key vocabulary");
    m.vocabulary.forEach((v) => out.push(`- ${v.term}: ${v.definition}`));
  }
  out.push("", "## Slides");
  lesson.slides.forEach((s, i) => {
    out.push("", `### ${i + 1}. ${s.title} [${s.layout}]`);
    if (s.subtitle) out.push(s.subtitle);
    if (s.body) out.push(s.body);
    (s.bullets ?? []).forEach((b) => out.push(`- ${b}`));
    (s.vocabulary ?? []).forEach((v) => out.push(`- ${v.term}: ${v.definition}`));
    if (s.activity)
      out.push(
        `Activity — ${s.activity.title} (${s.activity.grouping}, ${s.activity.durationMinutes} min): ${s.activity.instructions}`,
      );
    (s.discussionQuestions ?? []).forEach((q) => out.push(`- ${q}`));
    (s.quiz ?? []).forEach((q) => {
      out.push(`Q: ${q.question}`);
      (q.options ?? []).forEach((o) => out.push(`   - ${o}`));
      if (q.answer) out.push(`   Answer: ${q.answer}`);
    });
    if (s.youtube?.searchQuery) out.push(`Video: ${s.youtube.title || ""} (${s.youtube.searchQuery})`);
    if (s.teacherNotes) out.push(`Teacher notes: ${s.teacherNotes}`);
  });
  return out.join("\n");
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / older browsers.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function EduSimButton({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    const ok = await copyText(lessonToText(lesson));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
        title="Build a simulation with EduSim"
      >
        <Gamepad2 size={16} className="text-brand-600" /> <span className="hidden sm:inline">EduSim</span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-6 card-shadow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
                  <Gamepad2 size={20} className="text-brand-600" /> Build a simulation with EduSim
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Turn this lesson into a simulation-based learning experience with AISA&apos;s EduSim gem on Gemini.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="shrink-0 text-muted hover:text-ink" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <ol className="mt-5 space-y-3">
              {/* Step 1 — copy */}
              <li className="flex items-start gap-3 rounded-xl border border-line bg-paper/40 p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">1</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">Copy the lesson contents</p>
                  <p className="mt-0.5 text-sm text-muted">Copies this whole lesson as text, ready to paste.</p>
                  <button
                    onClick={doCopy}
                    className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      copied ? "bg-brand-50 text-brand-700" : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? "Copied!" : "Copy contents"}
                  </button>
                </div>
              </li>

              {/* Step 2 — open EduSim */}
              <li className="flex items-start gap-3 rounded-xl border border-line bg-paper/40 p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">2</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">Open EduSim on Gemini</p>
                  <p className="mt-0.5 text-sm text-muted">Opens the EduSim gem in a new tab.</p>
                  <a
                    href={EDUSIM_GEM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      copied
                        ? "bg-brand-600 text-white hover:bg-brand-700"
                        : "border border-line bg-white text-ink hover:border-brand-300"
                    }`}
                  >
                    <ExternalLink size={15} /> Open EduSim
                  </a>
                </div>
              </li>

              {/* Step 3 — paste */}
              <li className="flex items-start gap-3 rounded-xl border border-line bg-paper/40 p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">3</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">Paste into EduSim</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Paste the lesson (<span className="font-semibold text-ink">⌘/Ctrl + V</span>) into the EduSim chat and
                    send — it will code a simulation for your students.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
