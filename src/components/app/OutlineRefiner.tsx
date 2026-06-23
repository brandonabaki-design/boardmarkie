"use client";

import { useState } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, Sparkles, Check } from "lucide-react";
import type { GenerateRequest, OutlineSlide, SlideLayout } from "@/lib/types";
import { THEMES } from "@/lib/themes";
import { Spinner } from "./ui";

const LAYOUTS: SlideLayout[] = [
  "title",
  "objectives",
  "content",
  "vocabulary",
  "activity",
  "discussion",
  "video",
  "quiz",
  "plenary",
];

function Stepper({ step }: { step: "refine" | "theme" }) {
  const steps = [
    { label: "Topic", state: "done" as const },
    { label: "Refine", state: step === "theme" ? ("done" as const) : ("active" as const) },
    { label: "Theme", state: step === "theme" ? ("active" as const) : ("todo" as const) },
  ];
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <span
              className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${
                s.state === "active"
                  ? "bg-brand-600 text-white"
                  : s.state === "done"
                    ? "bg-brand-100 text-brand-700"
                    : "bg-paper text-muted"
              }`}
            >
              {s.state === "done" ? <Check size={15} /> : i + 1}
            </span>
            <span className={`mt-1 text-xs font-semibold ${s.state === "todo" ? "text-muted" : "text-ink"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && <span className="mb-4 h-px w-8 bg-line sm:w-12" />}
        </div>
      ))}
    </div>
  );
}

export function OutlineRefiner({
  req,
  outline,
  busy,
  onBack,
  onConfirm,
}: {
  req: GenerateRequest;
  outline: OutlineSlide[];
  busy: boolean;
  onBack: () => void;
  onConfirm: (outline: OutlineSlide[], themeId: string) => void;
}) {
  const [items, setItems] = useState<OutlineSlide[]>(outline.length ? outline : []);
  const [themeId, setThemeId] = useState("classic");
  const [step, setStep] = useState<"refine" | "theme">("refine");

  const update = (i: number, patch: Partial<OutlineSlide>) =>
    setItems((arr) => arr.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: -1 | 1) =>
    setItems((arr) => {
      const j = i + d;
      if (j < 0 || j >= arr.length) return arr;
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const remove = (i: number) => setItems((arr) => arr.filter((_, j) => j !== i));
  const add = () => setItems((arr) => [...arr, { title: "New slide", layout: "content", summary: "" }]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Stepper step={step} />

      {step === "refine" ? (
        <div className="rounded-2xl border border-line bg-white p-5 card-shadow sm:p-7">
          <h1 className="font-display text-2xl font-extrabold text-ink">Refine your outline</h1>
          <p className="mt-1 text-sm text-muted">
            {req.topic} · {req.yearGroup} · {items.length} slides. Edit titles, change a slide&apos;s type, reorder
            or remove — then pick a theme.
          </p>

          <ol className="mt-5 space-y-2">
            {items.map((it, i) => (
              <li key={i} className="rounded-xl border border-line bg-paper/40 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white text-xs font-bold text-muted">
                    {i + 1}
                  </span>
                  <input
                    value={it.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none focus:border-brand-400"
                  />
                  <select
                    value={it.layout}
                    onChange={(e) => update(i, { layout: e.target.value as SlideLayout })}
                    aria-label="Slide type"
                    className="shrink-0 rounded-lg border border-line bg-white px-1.5 py-1.5 text-xs font-medium text-muted outline-none focus:border-brand-400"
                  >
                    {LAYOUTS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <div className="flex shrink-0 items-center">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-white hover:text-ink disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      aria-label="Move down"
                      className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-white hover:text-ink disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => remove(i)}
                      disabled={items.length <= 1}
                      aria-label="Remove slide"
                      className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-coral/10 hover:text-coral disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <input
                  value={it.summary}
                  onChange={(e) => update(i, { summary: e.target.value })}
                  placeholder="What this slide covers…"
                  className="mt-1.5 ml-8 block w-[calc(100%-2rem)] rounded-lg border border-transparent bg-transparent px-2.5 py-1 text-xs text-muted outline-none focus:border-line focus:bg-white"
                />
              </li>
            ))}
          </ol>

          <button
            onClick={add}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-brand-300 hover:text-brand-700"
          >
            <Plus size={14} /> Add slide
          </button>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => setStep("theme")}
              disabled={!items.length}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              Next: pick a theme →
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-5 card-shadow sm:p-7">
          <h1 className="font-display text-2xl font-extrabold text-ink">Pick a theme</h1>
          <p className="mt-1 text-sm text-muted">Choose the look for your deck — you can change it later.</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {THEMES.map((t) => {
              const active = t.id === themeId;
              return (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={`overflow-hidden rounded-xl border-2 text-left transition-all ${
                    active ? "border-brand-500 ring-2 ring-brand-100" : "border-line hover:border-brand-300"
                  }`}
                >
                  <div className="flex aspect-video flex-col justify-center gap-1 px-3" style={{ background: t.bg }}>
                    <span style={{ color: t.ink, fontFamily: t.displayFont }} className="text-base font-extrabold leading-none">
                      Title
                    </span>
                    <span style={{ color: t.muted }} className="text-[10px] leading-tight">
                      Lesson content
                    </span>
                    <span className="mt-0.5 h-1 w-6 rounded-full" style={{ background: "#14a892" }} />
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-xs font-semibold text-ink">{t.label}</span>
                    {active && <Check size={13} className="text-brand-600" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setStep("refine")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
            >
              <ArrowLeft size={16} /> Refine
            </button>
            <button
              onClick={() => onConfirm(items, themeId)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? <Spinner /> : <Sparkles size={16} />} Create lesson
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
