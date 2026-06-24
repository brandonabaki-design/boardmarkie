"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FolderOpen, Settings, Plus, ArrowLeft, AlertCircle, X, Play } from "lucide-react";
import { Logo } from "@/components/Logo";
import type {
  Artifact,
  EditAction,
  GenerateRequest,
  GenerationMode,
  Lesson,
  OutlineSlide,
  SeriesLesson,
  Slide,
} from "@/lib/types";
import { generateArtifact, generateOutline, editLesson, editWorksheet } from "@/lib/client";
import { generateImage, illustrationPrompt, canGenerateImages } from "@/lib/images";
import { resolveYoutube } from "@/lib/youtube";
import { searchImages } from "@/lib/imageSearch";
import { searchGifs } from "@/lib/gifSearch";
import { cid, ensureElements, slideToElements } from "@/lib/canvas";
import {
  deleteArtifact,
  getArtifactFull,
  getAutoMediaSource,
  getGiphyKey,
  getImageConfig,
  getLibrary,
  saveArtifact,
} from "@/lib/storage";
import { GeneratorForm } from "./GeneratorForm";
import { GeneratingState } from "./GeneratingState";
import { LessonSkeleton } from "./LessonSkeleton";
import { OutlineRefiner } from "./OutlineRefiner";
import { CanvasEditor } from "./CanvasEditor";
import { AskBoardmarkie } from "./AskBoardmarkie";
import { WorksheetView } from "./WorksheetView";
import { SeriesView } from "./SeriesView";
import { SettingsModal } from "./SettingsModal";
import { LibraryDrawer } from "./LibraryDrawer";
import { ExportMenu } from "./ExportMenu";
import { PresentMode } from "./PresentMode";
import { Spinner } from "./ui";

function isMode(v: string | null): v is GenerationMode {
  return v === "lesson" || v === "series" || v === "worksheet";
}

function patchSlide(lesson: Lesson, slideId: string, patch: Partial<Slide>): Lesson {
  return {
    ...lesson,
    slides: lesson.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
  };
}

// Short query for searching a stock image / GIF for a slide.
function slideQuery(s: Slide): string {
  return (s.imageQuery || s.imageAlt || s.title || "").trim();
}

// Clone a slide with fresh ids (slide + each element) for instant duplication.
function duplicateSlide(slide: Slide): Slide {
  return {
    ...slide,
    id: cid("sl"),
    elements: slide.elements?.map((el) => ({ ...el, id: cid(el.type) })),
  };
}

// Give every slide a canvas layout. `fresh` rebuilds it from the (re)generated
// content — used after an AI edit, which rewrites the structured fields.
function seedLesson(lesson: Lesson, fresh = false): Lesson {
  return {
    ...lesson,
    slides: lesson.slides.map((s) => ensureElements(fresh ? { ...s, elements: undefined } : s)),
  };
}

// Shared illustration prompt — applies the teacher's chosen style (line art by
// default) and steers the raster model away from rendering (garbled) text.
function imagePromptFor(slide: { imagePrompt?: string }): string {
  return illustrationPrompt(slide.imagePrompt ?? "");
}

export function CreateApp() {
  const params = useSearchParams();
  const initialMode: GenerationMode = isMode(params.get("mode")) ? (params.get("mode") as GenerationMode) : "lesson";

  const [library, setLibrary] = useState<Artifact[]>([]);
  const [current, setCurrent] = useState<Artifact | null>(null);
  const [genMode, setGenMode] = useState<GenerationMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [outlining, setOutlining] = useState(false);
  const [refine, setRefine] = useState<{ req: GenerateRequest; outline: OutlineSlide[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const [expanding, setExpanding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libOpen, setLibOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null);
  const [past, setPast] = useState<Lesson[]>([]);
  const [future, setFuture] = useState<Lesson[]>([]);

  useEffect(() => {
    setLibrary(getLibrary());
  }, []);

  const refresh = () => setLibrary(getLibrary());

  const handleError = (err: unknown) => {
    const e = err as Error & { status?: number };
    setError(e.message || "Something went wrong.");
    if (e.status === 401) setSettingsOpen(true);
  };

  // Lessons go through an outline-first wizard (Topic → Refine → Theme); other
  // modes generate directly.
  const handleGenerate = async (req: GenerateRequest) => {
    setError(null);
    if (req.mode === "lesson") {
      setGenMode("lesson");
      setOutlining(true);
      try {
        const outline = await generateOutline(req);
        setRefine({ req, outline });
      } catch (err) {
        handleError(err);
      } finally {
        setOutlining(false);
      }
      return;
    }
    await runGenerate(req);
  };

  // The refined outline + chosen theme were confirmed → expand to a full lesson.
  const confirmOutline = (outline: OutlineSlide[], themeId: string) => {
    if (!refine) return;
    const req2: GenerateRequest = { ...refine.req, outline, slideCount: outline.length };
    setRefine(null);
    void runGenerate(req2, themeId);
  };

  const runGenerate = async (req: GenerateRequest, themeId?: string) => {
    setError(null);
    setGenMode(req.mode);
    setLoading(true);
    let artifact: Artifact;
    try {
      artifact = await generateArtifact(req);
    } catch (err) {
      handleError(err);
      setLoading(false);
      return;
    }
    let seeded = artifact.kind === "lesson" ? seedLesson(artifact) : artifact;
    if (themeId && seeded.kind === "lesson") seeded = { ...seeded, theme: themeId };
    saveArtifact(seeded);
    setCurrent(seeded);
    setPast([]);
    setFuture([]);
    refresh();
    setLoading(false);

    if (seeded.kind === "lesson") {
      const hasProxy = !!getImageConfig().proxyUrl;
      let working = seeded;
      if (req.autoImages) {
        const source = getAutoMediaSource();
        if (source === "generate") {
          if (canGenerateImages()) {
            working = await autoGenerateImages(seeded);
          } else {
            setError(
              "Lesson created. To AI-generate images, set up an engine in Settings → Images, or switch “Add images” to Web search (free).",
            );
            setSettingsOpen(true);
          }
        } else if (source === "gif") {
          if (getGiphyKey()) {
            working = await autoSearchMedia(seeded, "gif");
          } else {
            setError(
              "Lesson created. To auto-add GIFs, add a Giphy key in Settings → Images, or switch “Add images” to Web search (free).",
            );
            setSettingsOpen(true);
          }
        } else {
          working = await autoSearchMedia(seeded, "search"); // free, no setup needed
        }
      }
      // YouTube resolution needs the proxy.
      if (hasProxy) await autoEmbedYoutube(working);
    }
  };

  // Generate slide illustrations concurrently (a small pool keeps it fast
  // without hammering the proxy), placing each onto the slide's canvas as it lands.
  const autoGenerateImages = async (lesson: Lesson) => {
    // Skip video slides, and vocab/quiz slides (they use their own card/box
    // templates rather than a slide-level image).
    const targets = lesson.slides.filter(
      (s) =>
        s.imagePrompt &&
        !s.imageUrl &&
        !s.youtube?.searchQuery &&
        s.layout !== "vocabulary" &&
        s.layout !== "quiz",
    );
    if (!targets.length) return lesson;
    setImageProgress({ done: 0, total: targets.length });

    let working = lesson;
    let done = 0;
    let next = 0;
    let stop = false;
    const CONCURRENCY = 3;

    const worker = async () => {
      while (!stop) {
        const i = next++;
        if (i >= targets.length) break;
        try {
          const image = await generateImage(imagePromptFor(targets[i]), { aspectRatio: "16:9" });
          const cur = working.slides.find((s) => s.id === targets[i].id) ?? targets[i];
          const withImage = { ...cur, imageUrl: image };
          working = patchSlide(working, targets[i].id, { imageUrl: image, elements: slideToElements(withImage) });
          setCurrent(working);
          saveArtifact(working);
        } catch (err) {
          const e = err as Error & { status?: number };
          if (e.status === 401) {
            stop = true;
            handleError(err);
            break;
          }
        } finally {
          done++;
          setImageProgress({ done, total: targets.length });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));
    refresh();
    setImageProgress(null);
    return working;
  };

  // Auto-embed a searched image or GIF on each slide (free — no AI generation).
  // Embeds the result URL directly; the same concurrent-pool pattern keeps it fast.
  const autoSearchMedia = async (lesson: Lesson, kind: "search" | "gif") => {
    const targets = lesson.slides.filter(
      (s) =>
        (s.gifQuery || s.imageQuery || s.imageAlt || s.imagePrompt) &&
        !s.imageUrl &&
        !s.youtube?.searchQuery &&
        s.layout !== "vocabulary" &&
        s.layout !== "quiz",
    );
    if (!targets.length) return lesson;
    setImageProgress({ done: 0, total: targets.length });

    let working = lesson;
    let done = 0;
    let next = 0;
    const CONCURRENCY = 3;

    const worker = async () => {
      while (true) {
        const i = next++;
        if (i >= targets.length) break;
        const t = targets[i];
        try {
          let url: string | undefined;
          const gq = (t.gifQuery || "").trim();
          // In GIF mode, embed a GIF only where the model chose a concrete
          // gifQuery; otherwise fall back to a relevant photo (never a random GIF).
          if (kind === "gif" && gq) url = (await searchGifs(gq))[0]?.url;
          if (!url) {
            const iq = slideQuery(t);
            if (iq) url = (await searchImages(iq))[0]?.url;
          }
          if (url) {
            const cur = working.slides.find((s) => s.id === t.id) ?? t;
            const withImage = { ...cur, imageUrl: url };
            working = patchSlide(working, t.id, { imageUrl: url, elements: slideToElements(withImage) });
            setCurrent(working);
            saveArtifact(working);
          }
        } catch {
          /* no result for this slide — skip it */
        } finally {
          done++;
          setImageProgress({ done, total: targets.length });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));
    refresh();
    setImageProgress(null);
    return working;
  };

  // Resolve each slide's suggested video to a real embeddable id (via the proxy)
  // and drop it onto the slide. No-ops gracefully if the proxy / YouTube key is absent.
  const autoEmbedYoutube = async (lesson: Lesson) => {
    const targets = lesson.slides.filter((s) => s.youtube?.searchQuery);
    if (!targets.length) return;
    let working = lesson;
    for (const t of targets) {
      try {
        const r = await resolveYoutube(t.youtube!.searchQuery);
        if (!r?.videoId) continue;
        const cur = working.slides.find((s) => s.id === t.id);
        if (!cur) continue;
        working = patchSlide(working, t.id, {
          elements: slideToElements(cur, { kind: "youtube", videoId: r.videoId, title: r.title }),
        });
        setCurrent(working);
        saveArtifact(working);
      } catch {
        /* skip this one */
      }
    }
    refresh();
  };

  const handleEdit = async (action: EditAction, instruction?: string, slideId?: string) => {
    if (!current || current.kind !== "lesson") return;
    setError(null);
    setEditing(true);
    try {
      const updated = seedLesson(await editLesson({ lesson: current, action, instruction, slideId }), true);
      commitLesson(updated);
    } catch (err) {
      handleError(err);
    } finally {
      setEditing(false);
    }
  };

  // History-recording lesson setter (every canvas/AI edit becomes an undo step).
  const commitLesson = (next: Lesson) => {
    setPast((p) => (current && current.kind === "lesson" ? [...p, current].slice(-60) : p));
    setFuture([]);
    setCurrent(next);
    saveArtifact(next);
    refresh();
  };

  // Chat-driven edit: Ask Boardmarkie (GPT-4o) requested a change → run it
  // through the same Claude edit pipeline as the Improve buttons, record it in
  // undo history, and return a short confirmation for the chat.
  const askEdit = async (instruction: string, slideNumber?: number): Promise<string> => {
    if (!current) return "There's nothing open to edit.";
    setEditing(true);
    try {
      if (current.kind === "lesson") {
        const slide = slideNumber ? current.slides[slideNumber - 1] : undefined;
        const updated = seedLesson(
          await editLesson({ lesson: current, action: "rewrite", instruction, slideId: slide?.id }),
          true,
        );
        commitLesson(updated);
        return slide ? `✓ Updated slide ${slideNumber}.` : "✓ Done — updated the presentation.";
      }
      if (current.kind === "worksheet") {
        const updated = await editWorksheet({ worksheet: current, instruction });
        setCurrent(updated);
        saveArtifact(updated);
        refresh();
        return "✓ Done — updated the worksheet.";
      }
      return "This document type can't be edited from chat yet.";
    } finally {
      setEditing(false);
    }
  };

  // Instant structural slide ops (no model call) — undoable like other edits.
  const askArrange = async (op: string, slideNumber: number, toPosition?: number): Promise<string> => {
    if (!current || current.kind !== "lesson") return "There's no lesson open to rearrange.";
    const n = current.slides.length;
    const i = slideNumber - 1;
    if (i < 0 || i >= n) return `There's no slide ${slideNumber} — the lesson has ${n}.`;
    const slides = [...current.slides];

    if (op === "delete") {
      if (n <= 1) return "I can't delete the only slide.";
      slides.splice(i, 1);
      commitLesson({ ...current, slides });
      return `✓ Deleted slide ${slideNumber}.`;
    }
    if (op === "duplicate") {
      slides.splice(i + 1, 0, duplicateSlide(current.slides[i]));
      commitLesson({ ...current, slides });
      return `✓ Duplicated slide ${slideNumber}.`;
    }
    if (op === "move") {
      let to = (toPosition ?? n) - 1;
      to = Math.max(0, Math.min(n - 1, to));
      if (to === i) return `Slide ${slideNumber} is already in that position.`;
      const [m] = slides.splice(i, 1);
      slides.splice(to, 0, m);
      commitLesson({ ...current, slides });
      return `✓ Moved slide ${slideNumber} to position ${to + 1}.`;
    }
    return "I didn't recognise that slide operation.";
  };

  const undo = () => {
    if (!current || current.kind !== "lesson" || !past.length) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [current, ...f].slice(0, 60));
    setCurrent(prev);
    saveArtifact(prev);
    refresh();
  };

  const redo = () => {
    if (!current || current.kind !== "lesson" || !future.length) return;
    const nxt = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, current].slice(-60));
    setCurrent(nxt);
    saveArtifact(nxt);
    refresh();
  };

  const handleExpand = async (seriesLesson: SeriesLesson) => {
    if (!current || current.kind !== "series") return;
    setError(null);
    setExpanding(seriesLesson.number);
    setGenMode("lesson");
    const req: GenerateRequest = {
      mode: "lesson",
      topic: `${seriesLesson.title} — ${seriesLesson.objective}`.trim(),
      subject: current.meta.subject,
      yearGroup: current.meta.yearGroup,
      region: current.meta.region,
      notes: `This is lesson ${seriesLesson.number} of the unit "${current.meta.title}". ${seriesLesson.summary}`,
    };
    try {
      const artifact = await generateArtifact(req);
      const seeded = artifact.kind === "lesson" ? seedLesson(artifact) : artifact;
      saveArtifact(seeded);
      setCurrent(seeded);
      setPast([]);
      setFuture([]);
      refresh();
      window.scrollTo({ top: 0 });
    } catch (err) {
      handleError(err);
    } finally {
      setExpanding(null);
    }
  };

  const openArtifact = async (a: Artifact) => {
    setLibOpen(false);
    setError(null);
    window.scrollTo({ top: 0 });
    // Pull the full copy (with images) from IndexedDB; fall back to the list item.
    const full = (await getArtifactFull(a.id)) ?? a;
    setCurrent(full.kind === "lesson" ? seedLesson(full) : full);
    setPast([]);
    setFuture([]);
  };

  const removeArtifact = (id: string) => {
    deleteArtifact(id);
    refresh();
    if (current?.id === id) setCurrent(null);
  };

  const startNew = () => {
    setCurrent(null);
    setPast([]);
    setFuture([]);
    setError(null);
  };

  const busy = loading || editing || expanding !== null || imageProgress !== null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            {current && (
              <>
                {current.kind === "lesson" && (
                  <button
                    onClick={() => setPresenting(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
                  >
                    <Play size={16} /> <span className="hidden sm:inline">Present</span>
                  </button>
                )}
                <ExportMenu artifact={current} />
                <button
                  onClick={startNew}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
                >
                  <Plus size={16} /> <span className="hidden sm:inline">New</span>
                </button>
              </>
            )}
            <button
              onClick={() => setLibOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-brand-300"
              aria-label="Library"
              title="My library"
            >
              <FolderOpen size={18} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-brand-300"
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {error && (
          <div className="no-print mx-auto mb-6 flex max-w-2xl items-start gap-3 rounded-xl border border-coral/30 bg-coral/[0.06] px-4 py-3 text-sm text-ink">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-coral" />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-muted hover:text-ink">
              <X size={16} />
            </button>
          </div>
        )}

        {imageProgress && (
          <div className="no-print mx-auto mb-6 flex max-w-2xl items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800">
            <Spinner className="h-4 w-4 text-brand-600" /> Adding images… {imageProgress.done}/{imageProgress.total}
          </div>
        )}

        {current ? (
          <div>
            <button
              onClick={startNew}
              className="no-print mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft size={16} /> New plan
            </button>

            {current.kind === "lesson" && (
              <CanvasEditor
                lesson={current as Lesson}
                busy={busy}
                onEdit={handleEdit}
                onChange={commitLesson}
                onUndo={undo}
                onRedo={redo}
                canUndo={past.length > 0}
                canRedo={future.length > 0}
              />
            )}
            {current.kind === "worksheet" && <WorksheetView worksheet={current} />}
            {current.kind === "series" && <SeriesView series={current} busyLesson={expanding} onExpand={handleExpand} />}
          </div>
        ) : loading ? (
          genMode === "lesson" ? <LessonSkeleton /> : <GeneratingState mode={genMode} />
        ) : (
          <>
            {/* Form stays mounted (just hidden) during Refine so inputs are preserved on Back. */}
            <div className={refine ? "hidden" : ""}>
              <GeneratorForm initialMode={initialMode} loading={outlining} onSubmit={handleGenerate} />
            </div>
            {refine && (
              <OutlineRefiner
                req={refine.req}
                outline={refine.outline}
                busy={loading}
                onBack={() => setRefine(null)}
                onConfirm={confirmOutline}
              />
            )}
          </>
        )}
      </main>

      <footer className="no-print border-t border-line py-6 text-center text-sm text-muted">
        <Link href="/" className="hover:text-brand-700">
          Boardmarkie
        </Link>{" "}
        · Plan less, teach more.
      </footer>

      <LibraryDrawer
        open={libOpen}
        items={library}
        activeId={current?.id}
        onClose={() => setLibOpen(false)}
        onOpen={openArtifact}
        onDelete={removeArtifact}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <AskBoardmarkie
        context={
          current && (current.kind === "lesson" || current.kind === "worksheet")
            ? {
                title: current.meta.title,
                subject: current.meta.subject,
                yearGroup: current.meta.yearGroup,
                region: current.meta.region,
              }
            : undefined
        }
        editKind={
          current?.kind === "lesson" ? "lesson" : current?.kind === "worksheet" ? "worksheet" : undefined
        }
        slides={
          current?.kind === "lesson"
            ? current.slides.map((s, i) => ({ number: i + 1, title: s.title }))
            : undefined
        }
        onEdit={askEdit}
        onArrange={askArrange}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {presenting && current && current.kind === "lesson" && (
        <PresentMode lesson={current} onClose={() => setPresenting(false)} />
      )}
    </div>
  );
}
