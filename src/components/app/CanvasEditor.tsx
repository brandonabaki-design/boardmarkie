"use client";

import { useEffect, useRef, useState } from "react";
import {
  Type,
  ImagePlus,
  Square,
  Video,
  Plus,
  Trash2,
  Wand2,
  Smile,
  GraduationCap,
  Scissors,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  ClipboardCheck,
  ArrowUp,
  ArrowDown,
  Undo2,
  Redo2,
  GripVertical,
  LayoutGrid,
} from "lucide-react";
import type { CanvasElement, EditAction, Lesson, Slide } from "@/lib/types";
import {
  cid,
  clamp,
  ensureElements,
  imageElement,
  shapeElement,
  slideToElements,
  textElement,
  topZ,
  youtubeElement,
  youtubeId,
} from "@/lib/canvas";
import { SlideCanvas } from "./SlideCanvas";
import { ImageSwap, type SwapMedia } from "./ImageSwap";
import { Editable, Spinner } from "./ui";

export function CanvasEditor({
  lesson,
  busy,
  onEdit,
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  lesson: Lesson;
  busy: boolean;
  onEdit: (action: EditAction, instruction?: string, slideId?: string) => void;
  onChange: (lesson: Lesson) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [ytOpen, setYtOpen] = useState(false);
  const [ytInput, setYtInput] = useState("");
  const [ytErr, setYtErr] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [improveOpen, setImproveOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const clip = useRef<CanvasElement | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const note = (msg: string) => {
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 1200);
  };

  const safeIdx = Math.min(idx, lesson.slides.length - 1);
  const slide = ensureElements(lesson.slides[safeIdx]);
  const els = slide.elements ?? [];

  const writeSlide = (patch: Partial<Slide>) =>
    onChange({
      ...lesson,
      slides: lesson.slides.map((s, i) => (i === safeIdx ? { ...ensureElements(s), ...patch } : s)),
    });

  const setElements = (next: CanvasElement[]) => writeSlide({ elements: next });

  const addAndSelect = (el: CanvasElement) => {
    setElements([...els, el]);
    setSelectedId(el.id);
  };

  const addText = () => addAndSelect(textElement({ text: "Add your text", x: 28, y: 42, w: 44, h: 14, fontSize: 5, z: topZ(els) }));
  const addShape = () => addAndSelect(shapeElement({ x: 34, y: 36, w: 32, h: 28, z: topZ(els) }));
  const addImageNew = () => {
    setSwapTarget(null);
    setSwapOpen(true);
  };

  const handlePick = (media: SwapMedia) => {
    if (swapTarget) {
      setElements(
        els.map((e) =>
          e.id === swapTarget && e.type === "image" ? { ...e, src: media.src, svg: media.svg, alt: media.alt ?? e.alt } : e,
        ),
      );
    } else {
      addAndSelect(imageElement({ x: 30, y: 26, w: 40, h: 48, z: topZ(els), src: media.src, svg: media.svg, alt: media.alt }));
    }
    setSwapOpen(false);
    setSwapTarget(null);
  };

  const submitYoutube = () => {
    const id = youtubeId(ytInput);
    if (!id) {
      setYtErr("That doesn't look like a YouTube link.");
      return;
    }
    addAndSelect(youtubeElement({ videoId: id, x: 26, y: 22, w: 48, h: 54, z: topZ(els) }));
    setYtOpen(false);
    setYtInput("");
    setYtErr(null);
  };

  const goTo = (i: number) => {
    setIdx(i);
    setSelectedId(null);
  };

  const addSlide = () => {
    const blank: Slide = {
      id: cid("sl"),
      layout: "content",
      title: "New slide",
      elements: [textElement({ text: "New slide", x: 5, y: 5, w: 90, h: 12, fontSize: 6, bold: true, font: "display", z: 1 })],
    };
    const slides = [...lesson.slides];
    slides.splice(safeIdx + 1, 0, blank);
    onChange({ ...lesson, slides });
    goTo(safeIdx + 1);
  };

  const deleteSlide = () => {
    if (lesson.slides.length <= 1) return;
    onChange({ ...lesson, slides: lesson.slides.filter((_, i) => i !== safeIdx) });
    goTo(Math.max(0, safeIdx - 1));
  };

  // Rebuild the layout from the slide's content (auto-fit + columns); no AI call.
  const autoArrange = () => writeSlide({ elements: slideToElements(slide) });

  const moveSlide = (dir: -1 | 1) => {
    const j = safeIdx + dir;
    if (j < 0 || j >= lesson.slides.length) return;
    const slides = [...lesson.slides];
    [slides[safeIdx], slides[j]] = [slides[j], slides[safeIdx]];
    onChange({ ...lesson, slides });
    goTo(j);
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= lesson.slides.length || to >= lesson.slides.length) return;
    const slides = [...lesson.slides];
    const [m] = slides.splice(from, 1);
    slides.splice(to, 0, m);
    onChange({ ...lesson, slides });
    setIdx(to);
    setSelectedId(null);
  };

  // Keyboard: undo/redo, and copy/cut/paste of the selected element (when not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = !!(document.activeElement as HTMLElement | null)?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
      } else if (k === "y" && !typing) {
        e.preventDefault();
        onRedo();
      } else if ((k === "c" || k === "x") && !typing && selectedId) {
        const el = els.find((x) => x.id === selectedId);
        if (!el) return;
        clip.current = el;
        if (k === "x") {
          e.preventDefault();
          setElements(els.filter((x) => x.id !== el.id));
          setSelectedId(null);
        }
        note(k === "x" ? "Cut" : "Copied");
      } else if (k === "v" && !typing && clip.current) {
        e.preventDefault();
        const src = clip.current;
        addAndSelect({
          ...src,
          id: cid(src.type),
          x: clamp(src.x + 3, 0, 92),
          y: clamp(src.y + 3, 0, 92),
          z: topZ(els),
        } as CanvasElement);
        note("Pasted");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [els, selectedId, onUndo, onRedo]);

  const context = {
    topic: lesson.meta.topic,
    subject: lesson.meta.subject,
    yearGroup: lesson.meta.yearGroup,
    region: lesson.meta.region,
    slideTitle: slide.title,
  };

  const tools = [
    { label: "Text", icon: Type, onClick: addText },
    { label: "Image", icon: ImagePlus, onClick: addImageNew },
    { label: "Shape", icon: Square, onClick: addShape },
    { label: "Video", icon: Video, onClick: () => setYtOpen(true) },
  ];

  const refineActions: { action: EditAction; label: string; icon: typeof Smile }[] = [
    { action: "make_fun", label: "Make fun", icon: Smile },
    { action: "simplify", label: "Simplify", icon: GraduationCap },
    { action: "advance", label: "Stretch", icon: GraduationCap },
    { action: "shorten", label: "Shorten", icon: Scissors },
  ];

  return (
    <>
    <div className="no-print">
      {/* lesson header */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{lesson.meta.subject}</span>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{lesson.meta.yearGroup}</span>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{lesson.meta.durationMinutes} min</span>
          {(lesson.meta.objectives.length > 0 || (lesson.meta.standards?.length ?? 0) > 0) && (
            <button
              onClick={() => setInfoOpen((v) => !v)}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
            >
              Lesson info {infoOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
        <Editable
          value={lesson.meta.title}
          onCommit={(v) => onChange({ ...lesson, meta: { ...lesson.meta, title: v || "Untitled lesson" } })}
          multiline={false}
          placeholder="Lesson title"
          className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl"
        />

        {infoOpen && (
          <div className="mt-3 grid gap-3 rounded-xl border border-line bg-paper/50 p-4 sm:grid-cols-2">
            {lesson.meta.objectives.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">
                  <Target size={13} /> Objectives
                </p>
                <ul className="mt-2 space-y-1 text-sm text-ink">
                  {lesson.meta.objectives.map((o, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-brand-500">✓</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lesson.meta.standards && lesson.meta.standards.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                  <ClipboardCheck size={13} /> Standards
                </p>
                <ul className="mt-2 space-y-1 text-sm text-ink">
                  {lesson.meta.standards.map((st, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" /> {st}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* refine-whole-lesson bar */}
      <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/90 p-2.5 backdrop-blur card-shadow">
        <span className="px-1.5 text-xs font-semibold text-muted">{busy ? "Working…" : "Refine lesson:"}</span>
        {refineActions.map((a) => (
          <button
            key={a.action}
            disabled={busy}
            onClick={() => onEdit(a.action)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
          >
            <a.icon size={14} className="text-brand-600" />
            {a.label}
          </button>
        ))}
        {busy && <Spinner className="ml-auto mr-1 h-4 w-4 text-brand-600" />}
      </div>

      <div className="flex gap-4">
        {/* left insert toolbar */}
        <div className="no-print flex shrink-0 flex-col gap-1.5">
          {tools.map((t) => (
            <button
              key={t.label}
              onClick={t.onClick}
              disabled={busy}
              className="flex w-16 flex-col items-center gap-1 rounded-xl border border-line bg-white px-2 py-2.5 text-[11px] font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
            >
              <t.icon size={18} className="text-brand-600" />
              {t.label}
            </button>
          ))}
        </div>

        {/* canvas + per-slide controls */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-2xl border border-line bg-white card-shadow">
            <SlideCanvas
              elements={els}
              background={slide.background}
              editable
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={setElements}
              onRequestSwap={(id) => {
                setSwapTarget(id);
                setSwapOpen(true);
              }}
            />
          </div>

          <div className="no-print mt-2 flex flex-wrap items-center gap-1.5">
            <IconBtn title="Undo (⌘Z)" disabled={!canUndo} onClick={onUndo}>
              <Undo2 size={16} />
            </IconBtn>
            <IconBtn title="Redo (⌘⇧Z)" disabled={!canRedo} onClick={onRedo}>
              <Redo2 size={16} />
            </IconBtn>
            <span className="mx-1 h-5 w-px bg-line" />
            <IconBtn title="Previous slide" disabled={safeIdx === 0} onClick={() => goTo(safeIdx - 1)}>
              <ChevronUp size={16} className="-rotate-90" />
            </IconBtn>
            <span className="text-xs font-medium text-muted">
              Slide {safeIdx + 1} / {lesson.slides.length}
            </span>
            <IconBtn title="Next slide" disabled={safeIdx === lesson.slides.length - 1} onClick={() => goTo(safeIdx + 1)}>
              <ChevronUp size={16} className="rotate-90" />
            </IconBtn>
            <span className="mx-1 h-5 w-px bg-line" />
            <IconBtn title="Move slide earlier" disabled={safeIdx === 0} onClick={() => moveSlide(-1)}>
              <ArrowUp size={15} />
            </IconBtn>
            <IconBtn title="Move slide later" disabled={safeIdx === lesson.slides.length - 1} onClick={() => moveSlide(1)}>
              <ArrowDown size={15} />
            </IconBtn>
            <IconBtn title="Delete slide" disabled={lesson.slides.length <= 1} onClick={deleteSlide}>
              <Trash2 size={15} />
            </IconBtn>
            <span className="mx-1 h-5 w-px bg-line" />
            <IconBtn title="Auto-arrange (reset layout from content)" onClick={autoArrange}>
              <LayoutGrid size={15} />
            </IconBtn>

            <div className="relative ml-auto">
              <button
                onClick={() => setImproveOpen((v) => !v)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 disabled:opacity-50"
              >
                {busy ? <Spinner /> : <Wand2 size={14} className="text-brand-600" />} Improve slide
              </button>
              {improveOpen && (
                <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-line bg-white p-2 card-shadow">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-semibold text-muted">Improve this slide</span>
                    <button onClick={() => setImproveOpen(false)} className="text-muted hover:text-ink">
                      <X size={14} />
                    </button>
                  </div>
                  {([
                    { action: "make_fun" as EditAction, label: "Make it more fun" },
                    { action: "simplify" as EditAction, label: "Simplify" },
                    { action: "advance" as EditAction, label: "Stretch & challenge" },
                  ]).map((a) => (
                    <button
                      key={a.action}
                      onClick={() => {
                        setImproveOpen(false);
                        onEdit(a.action, undefined, slide.id);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
                    >
                      {a.label}
                    </button>
                  ))}
                  <div className="mt-1 border-t border-line p-2">
                    <input
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && instruction.trim()) {
                          onEdit("rewrite", instruction.trim(), slide.id);
                          setInstruction("");
                          setImproveOpen(false);
                        }
                      }}
                      placeholder="Or tell it what to change…"
                      className="w-full rounded-lg border border-line px-2.5 py-2 text-sm outline-none focus:border-brand-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="no-print mt-2 text-xs text-muted">
            Click to select · drag to move · handles to resize · double-click text to edit ·{" "}
            <span className="whitespace-nowrap">⌘C/⌘X/⌘V copy/cut/paste</span> ·{" "}
            <span className="whitespace-nowrap">⌘Z undo</span>
          </p>
        </div>

        {/* slide thumbnail rail */}
        <div className="no-print hidden w-44 shrink-0 lg:block">
          <p className="mb-2 px-1 text-xs font-semibold text-muted">Slides · drag to reorder</p>
          <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
            {lesson.slides.map((s, i) => {
              const thumb = ensureElements(s);
              return (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(i);
                  }}
                  onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null) reorder(dragFrom, i);
                    setDragFrom(null);
                    setDragOver(null);
                  }}
                  onDragEnd={() => {
                    setDragFrom(null);
                    setDragOver(null);
                  }}
                  onClick={() => goTo(i)}
                  title="Drag to reorder"
                  // Skip layout/paint for off-screen thumbnails (big win for long decks).
                  style={{ contentVisibility: "auto", containIntrinsicSize: "auto 104px" }}
                  className={`group relative flex cursor-grab items-stretch gap-1 rounded-lg border-2 transition-colors active:cursor-grabbing ${
                    i === safeIdx ? "border-brand-500" : "border-line hover:border-brand-300"
                  } ${dragOver === i && dragFrom !== null && dragFrom !== i ? "ring-2 ring-brand-400" : ""} ${
                    dragFrom === i ? "opacity-50" : ""
                  }`}
                >
                  <span className="flex w-5 shrink-0 items-center justify-center rounded-l-md bg-paper text-muted group-hover:text-brand-600">
                    <GripVertical size={13} />
                  </span>
                  <span className="absolute left-6 top-1 z-10 rounded bg-white/85 px-1 text-[10px] font-semibold text-muted">
                    {i + 1}
                  </span>
                  <div className="pointer-events-none min-w-0 flex-1 overflow-hidden rounded-r-md">
                    <SlideCanvas elements={thumb.elements ?? []} background={s.background} />
                  </div>
                </div>
              );
            })}
            <button
              onClick={addSlide}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line py-3 text-xs font-semibold text-muted transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              <Plus size={14} /> Add slide
            </button>
          </div>
        </div>
      </div>

      {/* mobile add-slide */}
      <button
        onClick={addSlide}
        className="no-print mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300 lg:hidden"
      >
        <Plus size={15} /> Add slide
      </button>

      {flash && (
        <div className="no-print pointer-events-none fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {flash}
        </div>
      )}

      {swapOpen && (
        <ImageSwap
          context={context}
          initialQuery={slide.title}
          onPick={handlePick}
          onClose={() => {
            setSwapOpen(false);
            setSwapTarget(null);
          }}
        />
      )}

      {ytOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setYtOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-white p-6 card-shadow">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
                <Video size={20} className="text-coral" /> Add YouTube video
              </h2>
              <button onClick={() => setYtOpen(false)} className="text-muted hover:text-ink">
                <X size={20} />
              </button>
            </div>
            <input
              value={ytInput}
              autoFocus
              onChange={(e) => {
                setYtInput(e.target.value);
                setYtErr(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && submitYoutube()}
              placeholder="Paste a YouTube link…"
              className="mt-4 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            {ytErr && <p className="mt-2 text-xs text-coral">{ytErr}</p>}
            <button
              onClick={submitYoutube}
              disabled={!ytInput.trim()}
              className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              Add to slide
            </button>
            <p className="mt-2 text-xs text-muted">The video becomes a resizable element and plays in Present mode.</p>
          </div>
        </div>
      )}
    </div>
    <PrintDeck lesson={lesson} />
    </>
  );
}

function PrintDeck({ lesson }: { lesson: Lesson }) {
  return (
    <div className="hidden print:block">
      {lesson.slides.map((s) => {
        const slide = ensureElements(s);
        return (
          <div key={s.id} className="print-page">
            <SlideCanvas elements={slide.elements ?? []} background={s.background} />
          </div>
        );
      })}
    </div>
  );
}

function IconBtn({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
