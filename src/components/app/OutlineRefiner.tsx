"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, Sparkles, Check, Pause } from "lucide-react";
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

// Seconds to wait after the outline lands before auto-building (so the deck
// feels like it builds itself). Editing the outline cancels it.
const AUTO_SECONDS = 6;

export function OutlineRefiner({
  req,
  outline,
  busy,
  onBack,
  onConfirm,
}: {
  req: GenerateRequest;
  outline: OutlineSlide[] | null; // null = still generating
  busy: boolean;
  onBack: () => void;
  onConfirm: (outline: OutlineSlide[], themeId: string) => void;
}) {
  const [items, setItems] = useState<OutlineSlide[]>([]);
  const [themeId, setThemeId] = useState("classic");
  const [countdown, setCountdown] = useState<number | null>(null);
  const startedRef = useRef(false);
  const firedRef = useRef(false);

  // Outline arrived → load it and start the auto-build countdown.
  useEffect(() => {
    if (!outline || startedRef.current) return;
    startedRef.current = true;
    setItems(outline);
    setCountdown(AUTO_SECONDS);
  }, [outline]);

  // Tick the countdown; build automatically at zero.
  useEffect(() => {
    if (countdown === null || busy) return;
    if (countdown <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        onConfirm(items, themeId);
      }
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
    // items/themeId intentionally omitted so theme/edit changes don't restart the tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, busy]);

  // Any outline edit cancels auto-build — the teacher is taking control.
  const stopAuto = () => setCountdown(null);
  const update = (i: number, patch: Partial<OutlineSlide>) => {
    stopAuto();
    setItems((arr) => arr.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  };
  const move = (i: number, d: -1 | 1) => {
    stopAuto();
    setItems((arr) => {
      const j = i + d;
      if (j < 0 || j >= arr.length) return arr;
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const remove = (i: number) => {
    stopAuto();
    setItems((arr) => arr.filter((_, j) => j !== i));
  };
  const add = () => {
    stopAuto();
    setItems((arr) => [...arr, { title: "New slide", layout: "content", summary: "" }]);
  };

  // Picking a theme keeps auto-build going but resets the timer so there's no
  // rush while browsing themes.
  const pickTheme = (id: string) => {
    setThemeId(id);
    setCountdown((c) => (c === null ? null : AUTO_SECONDS));
  };

  const loading = outline === null;
  const build = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onConfirm(items, themeId);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-2xl border border-line bg-white p-5 card-shadow sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink">Your lesson outline</h1>
            <p className="mt-1 text-sm text-muted">
              {req.topic} · {req.yearGroup}
              {items.length ? ` · ${items.length} slides` : ""}
            </p>
          </div>
          <button
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* Theme — shown immediately so it can be chosen while the outline loads */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Theme</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {THEMES.map((t) => {
              const active = t.id === themeId;
              return (
                <button
                  key={t.id}
                  onClick={() => pickTheme(t.id)}
                  className={`overflow-hidden rounded-xl border-2 text-left transition-all ${
                    active ? "border-brand-500 ring-2 ring-brand-100" : "border-line hover:border-brand-300"
                  }`}
                >
                  <div className="flex aspect-video flex-col justify-center gap-1 px-2.5" style={{ background: t.bg }}>
                    <span style={{ color: t.ink, fontFamily: t.displayFont }} className="text-sm font-extrabold leading-none">
                      Title
                    </span>
                    <span style={{ color: t.muted }} className="text-[9px] leading-tight">
                      Lesson content
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[11px] font-semibold text-ink">{t.label}</span>
                    {active && <Check size={12} className="text-brand-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Outline */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Slides</p>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: Math.max(3, req.slideCount ?? 6) }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-line bg-paper/40 p-2.5">
                  <span className="h-6 w-6 shrink-0 animate-pulse rounded-md bg-line" />
                  <span className="h-5 flex-1 animate-pulse rounded bg-line" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <ol className="space-y-2">
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
                  </li>
                ))}
              </ol>
              <button
                onClick={add}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                <Plus size={14} /> Add slide
              </button>
            </>
          )}
        </div>

        {/* Action bar */}
        <div className="mt-6 flex items-center gap-3">
          {loading ? (
            <span className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-paper px-4 py-2.5 text-sm font-semibold text-muted">
              <Spinner /> Generating outline…
            </span>
          ) : busy ? (
            <span className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white opacity-80">
              <Spinner /> Creating lesson…
            </span>
          ) : countdown !== null ? (
            <>
              <button
                onClick={stopAuto}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
              >
                <Pause size={15} /> Pause
              </button>
              <button
                onClick={build}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Sparkles size={16} /> Building in {countdown}s — Generate now
              </button>
            </>
          ) : (
            <button
              onClick={build}
              disabled={!items.length}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              <Sparkles size={16} /> Generate slides
            </button>
          )}
        </div>
        {countdown !== null && (
          <p className="mt-2 text-center text-xs text-muted">
            Auto-building with the <span className="font-semibold text-ink">{THEMES.find((t) => t.id === themeId)?.label}</span> theme — edit the outline or hit Pause to take your time.
          </p>
        )}
      </div>
    </div>
  );
}
