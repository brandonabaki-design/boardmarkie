"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Worksheet, WorksheetQuestion } from "@/lib/types";

export function WorksheetView({ worksheet }: { worksheet: Worksheet }) {
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={() => setShowAnswers((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
        >
          {showAnswers ? <EyeOff size={16} /> : <Eye size={16} />}
          {showAnswers ? "Hide answer key" : "Show answer key"}
        </button>
      </div>

      <div className="printable rounded-2xl border border-line bg-white p-7 card-shadow sm:p-10">
        <header className="border-b border-line pb-5">
          <div className="flex flex-wrap gap-2">
            <Chip>{worksheet.meta.subject}</Chip>
            <Chip>{worksheet.meta.yearGroup}</Chip>
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">
            {worksheet.meta.title}
          </h1>
          {worksheet.meta.instructions && (
            <p className="mt-2 text-muted">{worksheet.meta.instructions}</p>
          )}
          <div className="mt-4 flex gap-6 text-sm text-muted">
            <span>Name: ____________________</span>
            <span>Date: __________</span>
          </div>
        </header>

        <div className="mt-6 space-y-8">
          {worksheet.sections.map((section, si) => (
            <section key={si}>
              <h2 className="font-display text-lg font-bold text-ink">{section.title}</h2>
              {section.instructions && (
                <p className="mt-1 text-sm italic text-muted">{section.instructions}</p>
              )}
              <ol className="mt-4 space-y-5">
                {section.questions.map((q) => (
                  <QuestionItem key={q.number} q={q} showAnswers={showAnswers} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionItem({ q, showAnswers }: { q: WorksheetQuestion; showAnswers: boolean }) {
  return (
    <li className="break-inside-avoid">
      <div className="flex gap-2">
        <span className="font-semibold text-ink">{q.number}.</span>
        <div className="flex-1">
          <p className="text-[15px] text-ink">
            {q.prompt}
            {q.marks ? <span className="ml-2 text-xs text-muted">[{q.marks} marks]</span> : null}
          </p>

          {(q.type === "mcq" || q.type === "matching") && q.options && q.options.length > 0 && (
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {q.options.map((o, i) => {
                const correct = showAnswers && q.answer && o.trim() === q.answer.trim();
                return (
                  <li
                    key={i}
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                      correct ? "bg-brand-50 font-medium text-brand-800" : "bg-paper text-ink"
                    }`}
                  >
                    {String.fromCharCode(97 + i)}) {o}
                  </li>
                );
              })}
            </ul>
          )}

          {q.type === "truefalse" && (
            <div className="mt-2 flex gap-3 text-sm text-ink">
              <span className="rounded-lg bg-paper px-3 py-1">True</span>
              <span className="rounded-lg bg-paper px-3 py-1">False</span>
            </div>
          )}

          {(q.type === "short" || q.type === "fill") && (
            <div className="mt-2 border-b border-dashed border-line pb-6" />
          )}
          {q.type === "long" && (
            <div className="mt-2 space-y-6">
              <div className="border-b border-dashed border-line" />
              <div className="border-b border-dashed border-line" />
              <div className="border-b border-dashed border-line" />
            </div>
          )}

          {showAnswers && q.answer && (
            <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
              <span className="font-semibold">Answer: </span>
              {q.answer}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
      {children}
    </span>
  );
}
