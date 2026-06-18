"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What exactly does Boardmarkie create?",
    a: "Complete lesson slide decks (objectives, vocabulary, explanations, activities, discussion prompts, a quick quiz and a plenary), connected units of up to 12 lessons, and printable worksheets with answer keys — all pitched to your chosen year group and curriculum.",
  },
  {
    q: "Which curricula does it support?",
    a: "UK National Curriculum, US Common Core and state standards, the Australian Curriculum, and international / IB frameworks. You choose the region and year group, and content is pitched accordingly.",
  },
  {
    q: "Can I edit what it generates?",
    a: "Yes — everything is editable. You can rewrite any slide with one click (make it more fun, simplify, stretch, shorten, add a slide) or give a specific instruction, and Boardmarkie revises it.",
  },
  {
    q: "How do I get my lesson into my own tools?",
    a: "Export a deck to PowerPoint (.pptx) — which also opens in Google Slides and Keynote — print a clean PDF, or save the raw content as JSON. Worksheets export to print-ready PDF.",
  },
  {
    q: "Do I need an API key?",
    a: "This build runs on Anthropic's Claude. If the app is hosted with a server key you can just start planning. Otherwise, add your own Anthropic API key in Settings — it's stored only in your browser.",
  },
  {
    q: "Is my content private?",
    a: "Your lessons are saved locally in your browser, not on a server. Generation requests go directly to the AI provider to produce your content.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-paper">
      <div className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-600">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Questions, answered
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="overflow-hidden rounded-xl border border-line bg-white">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-display text-base font-bold text-ink">{f.q}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-brand-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
