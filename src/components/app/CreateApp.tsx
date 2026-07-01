"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FolderOpen, Settings, Plus, ArrowLeft, AlertCircle, X, FlaskConical, BookOpen, ClipboardPaste, Sparkles, ExternalLink } from "lucide-react";
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
import { searchImages, firstLoadableImage } from "@/lib/imageSearch";
import { searchGifs } from "@/lib/gifSearch";
import { cid, ensureElements, slideToElements } from "@/lib/canvas";
import { TEST_LESSONS } from "@/lib/sampleLesson";
import {
  deleteArtifact,
  getArtifactFull,
  getAutoMediaSource,
  getGiphyKey,
  getImageConfig,
  getLibrary,
  saveArtifact,
  LIBRARY_EVENT,
} from "@/lib/storage";
import { onAuthChange, signOutUser, type AppUser } from "@/lib/auth";
import { isHostedMode, emailAllowed } from "@/lib/backend";
import { installSyncHooks, removeSyncHooks, subscribeArtifacts, syncOnce } from "@/lib/sync";
import { AppHeader } from "./AppHeader";
import { SignInWall } from "./SignInWall";
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
import { ImportLessonModal, MAGICSCHOOL_URL } from "./ImportLessonModal";
import { ExportMenu } from "./ExportMenu";
import { PresentMode } from "./PresentMode";
import { ShareLessonDialog } from "./ShareLessonDialog";
import { getSharedLesson } from "@/lib/lessonsLib";
import { Spinner } from "./ui";

function isMode(v: string | null): v is GenerationMode {
  return v === "lesson" || v === "series" || v === "worksheet";
}

// Which Settings tab to open to (mirrors SettingsModal's internal Tab type).
type SettingsTab = "claude" | "openai" | "images" | "sync";

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
  // refine.outline === null means the outline is still generating (the refiner
  // shows immediately with a loading state so the theme can be picked right away).
  const [refine, setRefine] = useState<{ req: GenerateRequest; outline: OutlineSlide[] | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [expanding, setExpanding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libOpen, setLibOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("claude");
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"ai" | "noai">("ai");
  const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null);
  const [past, setPast] = useState<Lesson[]>([]);
  const [future, setFuture] = useState<Lesson[]>([]);
  // True while a hardcoded sample lesson is being loaded (skips the AI calls).
  const [testMode, setTestMode] = useState(false);
  // The maker for the test lesson currently being loaded (chosen on the form).
  const testMakerRef = useRef<(() => Lesson) | null>(null);

  useEffect(() => {
    setLibrary(getLibrary());
  }, []);

  // Deep-link from the shared library (/lessons → /create/?shared=<id>): open the
  // shared lesson as a fresh local copy the teacher can adapt and re-save.
  const sharedHandled = useRef(false);
  useEffect(() => {
    const sid = params.get("shared");
    if (!sid || sharedHandled.current) return;
    sharedHandled.current = true;
    getSharedLesson(sid)
      .then((l) => {
        const copy = seedLesson({ ...l, id: cid("lesson"), createdAt: Date.now(), updatedAt: Date.now() });
        saveArtifact(copy);
        setCurrent(copy);
        refresh();
      })
      .catch(() => setError("Couldn't open that shared lesson."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Keep the library in sync with any local write (including changes pulled from
  // another device by the cloud sync layer).
  useEffect(() => {
    const onLib = () => setLibrary(getLibrary());
    window.addEventListener(LIBRARY_EVENT, onLib);
    return () => window.removeEventListener(LIBRARY_EVENT, onLib);
  }, []);

  // Cross-device sync: when the teacher is signed in, mirror every save/delete to
  // the cloud, reconcile both sides once, and stream in changes from other devices.
  useEffect(() => {
    let unsubSnap: (() => void) | null = null;
    const unsubAuth = onAuthChange((u) => {
      setAuthReady(true);
      // Hosted mode: enforce the email-domain allow-list client-side too (the
      // backend enforces it as well). A wrong-domain account is signed straight
      // back out, so it never reaches the tools.
      if (u && isHostedMode() && !emailAllowed(u.email)) {
        setError("Please sign in with your school account.");
        void signOutUser();
        return;
      }
      setUser(u);
      unsubSnap?.();
      unsubSnap = null;
      if (u) {
        installSyncHooks();
        void syncOnce();
        unsubSnap = subscribeArtifacts(() => setLibrary(getLibrary()));
      } else {
        removeSyncHooks();
      }
    });
    return () => {
      unsubAuth();
      unsubSnap?.();
      removeSyncHooks();
    };
  }, []);

  const refresh = () => setLibrary(getLibrary());

  const openSettings = (t: SettingsTab = "claude") => {
    setSettingsTab(t);
    setSettingsOpen(true);
  };

  const handleError = (err: unknown) => {
    const e = err as Error & { status?: number };
    setError(e.message || "Something went wrong.");
    if (e.status === 401) openSettings("claude");
  };

  // Lessons go through an outline-first flow: show the theme picker + outline
  // immediately, generate the outline in the background, then auto-build.
  const handleGenerate = async (req: GenerateRequest) => {
    setError(null);
    setTestMode(false); // a real generation supersedes any pending test load
    testMakerRef.current = null;
    if (req.mode === "lesson") {
      setGenMode("lesson");
      setRefine({ req, outline: null }); // show the refiner right away (outline loading)
      try {
        const outline = await generateOutline(req);
        // Ignore if the user navigated away / started a different generation.
        setRefine((r) => (r && r.req === req ? { req, outline } : r));
      } catch (err) {
        handleError(err);
        setRefine(null);
      }
      return;
    }
    await runGenerate(req);
  };

  // The refined outline + chosen theme were confirmed → expand to a full lesson.
  // In test mode, load the hardcoded sample lesson instead of calling the AI.
  const confirmOutline = (outline: OutlineSlide[], themeId: string) => {
    if (!refine) return;
    if (testMode) {
      setTestMode(false);
      setRefine(null);
      void runTestLesson(themeId);
      return;
    }
    const req2: GenerateRequest = { ...refine.req, outline, slideCount: outline.length };
    setRefine(null);
    void runGenerate(req2, themeId);
  };

  // Testing affordance: load a ready-made lesson with NO AI generation (no Claude
  // credits), going through the usual outline + theme step first so the full flow
  // can be exercised. The req/outline are derived from the sample for display only.
  const startTestLesson = (make: () => Lesson) => {
    setError(null);
    setGenMode("lesson");
    testMakerRef.current = make;
    const sample = make();
    const req: GenerateRequest = {
      mode: "lesson",
      topic: sample.meta.topic,
      subject: sample.meta.subject,
      yearGroup: sample.meta.yearGroup,
      region: sample.meta.region,
      autoImages: true,
    };
    const outline: OutlineSlide[] = sample.slides.map((s) => ({
      title: s.title,
      layout: s.layout,
      summary: s.subtitle || s.body || s.bullets?.[0] || "",
    }));
    setRefine({ req, outline });
    setTestMode(true);
  };

  // Load the chosen sample lesson into the editor without any AI call, then attach
  // media with the FREE web search only (GIFs where available, else stock photos)
  // — it never touches the paid AI-image path, so this costs no credits.
  const runTestLesson = async (themeId?: string) => {
    const make = testMakerRef.current;
    if (!make) return;
    setError(null);
    setGenMode("lesson");
    setLoading(true);
    let seeded = seedLesson(make());
    if (themeId) seeded = { ...seeded, theme: themeId };
    saveArtifact(seeded);
    setCurrent(seeded);
    setPast([]);
    setFuture([]);
    refresh();
    setLoading(false);

    let working = seeded;
    if (isHostedMode() || getGiphyKey()) {
      working = await autoSearchMedia(seeded, "gif");
    } else {
      working = await autoSearchMedia(seeded, "search");
    }
    const hasProxy = isHostedMode() || !!getImageConfig().proxyUrl;
    if (hasProxy) await autoEmbedYoutube(working);
  };

  // Import a pasted outline (e.g. MagicSchool) into a full lesson with NO AI call.
  // Optionally attaches a relevant photo/GIF per slide via the free web search.
  const handleImport = async (lesson: Lesson, addMedia: boolean) => {
    setImportOpen(false);
    setError(null);
    setTestMode(false);
    testMakerRef.current = null;
    setGenMode("lesson");
    const seeded = seedLesson(lesson);
    saveArtifact(seeded);
    setCurrent(seeded);
    setPast([]);
    setFuture([]);
    refresh();
    let working = seeded;
    if (addMedia) {
      working = isHostedMode() || getGiphyKey() ? await autoSearchMedia(seeded, "gif") : await autoSearchMedia(seeded, "search");
    }
    // Embed a relevant YouTube clip where the parser tagged a slide (needs the proxy).
    const hasProxy = isHostedMode() || !!getImageConfig().proxyUrl;
    if (hasProxy) await autoEmbedYoutube(working);
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
      const hasProxy = isHostedMode() || !!getImageConfig().proxyUrl;
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
          if (isHostedMode() || getGiphyKey()) {
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

    // Lesson subject + topic disambiguate generic queries during ranking
    // (e.g. biology "cells" over prison cells) without narrowing the search.
    const context = [lesson.meta?.subject, lesson.meta?.topic].filter(Boolean).join(" ");

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
          // Results are relevance-ranked, so the first that loads is the best match.
          if (kind === "gif" && gq) {
            const gifs = await searchGifs(gq, context);
            url = await firstLoadableImage(gifs.slice(0, 6).map((g) => g.url));
          }
          if (!url) {
            const iq = slideQuery(t);
            if (iq) {
              const imgs = await searchImages(iq, context);
              url = await firstLoadableImage(imgs.slice(0, 8).map((r) => r.url));
            }
          }
          if (url) {
            const cur = working.slides.find((s) => s.id === t.id) ?? t;
            const withImage = { ...cur, imageUrl: url };
            working = patchSlide(working, t.id, { imageUrl: url, elements: slideToElements(withImage) });
            setCurrent(working);
            saveArtifact(working);
          }
        } catch (e) {
          console.warn("[auto-media] no media for slide:", t.title, e);
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
      } catch (e) {
        console.warn("[auto-youtube] failed for slide:", t.title, e);
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

  // Hosted ("school") mode: sign-in is required to reach the creation tools.
  if (isHostedMode() && !user) {
    return authReady ? (
      <SignInWall />
    ) : (
      <div className="grid min-h-screen place-items-center bg-paper">
        <Spinner className="h-6 w-6 text-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader>
        {/* Worksheets/series have no bottom workspace bar, so their document
            actions stay here. Lessons get Present/Publish/Export in the bottom
            deck bar (CanvasEditor). Library + Settings are this page's tools. */}
        {current && current.kind !== "lesson" && (
          <>
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
          onClick={() => openSettings("claude")}
          className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-brand-300"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </AppHeader>

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
                onPresent={() => setPresenting(true)}
                onPublish={() => setShareOpen(true)}
                onAsk={() => setAskOpen((o) => !o)}
                askOpen={askOpen}
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
              {/* AI vs no-AI mode selector */}
              <div className="mx-auto mb-6 grid w-full max-w-xs grid-cols-2 gap-1 rounded-2xl border border-line bg-paper p-1">
                {(
                  [
                    { id: "ai", label: "AI Mode", icon: Sparkles },
                    { id: "noai", label: "No-AI Mode", icon: ClipboardPaste },
                  ] as const
                ).map((m) => {
                  const on = createMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setCreateMode(m.id)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                        on ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"
                      }`}
                    >
                      <m.icon size={15} /> {m.label}
                    </button>
                  );
                })}
              </div>

              {createMode === "ai" ? (
                <GeneratorForm initialMode={initialMode} loading={false} onSubmit={handleGenerate} />
              ) : (
                <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-6 card-shadow">
                  <h2 className="font-display text-lg font-bold text-ink">Paste a lesson outline — no AI</h2>
                  <p className="mt-1 text-sm text-muted">
                    Already have an outline (MagicSchool, ChatGPT, Gemini…)? Paste it and Boardmarkie builds the slides
                    instantly — no Claude credits used. No outline yet? Make one in MagicSchool&apos;s presentation
                    generator, then paste it back.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={MAGICSCHOOL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
                    >
                      <ExternalLink size={16} className="text-brand-600" /> Create outline in MagicSchool
                    </a>
                    <button
                      onClick={() => setImportOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                    >
                      <ClipboardPaste size={16} /> Paste your outline
                    </button>
                  </div>
                </div>
              )}

              <div className="mx-auto mt-7 max-w-2xl text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Test lessons · no AI
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {TEST_LESSONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => startTestLesson(t.make)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line bg-white px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-brand-300 hover:text-brand-700"
                    >
                      <FlaskConical size={14} className="text-brand-600" /> {t.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  Loads a ready-made lesson without using Claude credits — still searches the web for GIFs/images.
                </p>
              </div>

              {/* Discover shared resources made by all teachers */}
              <div className="mx-auto mt-10 max-w-2xl">
                <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Or explore shared resources
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/lessons/"
                    className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-brand-300 card-shadow"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <BookOpen size={20} />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-ink">Shared lessons</span>
                      <span className="block text-xs text-muted">Ready-made lessons from teachers — open &amp; adapt.</span>
                    </span>
                  </Link>
                  <Link
                    href="/sims/"
                    className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-brand-300 card-shadow"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <FlaskConical size={20} />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-ink">EduSim library</span>
                      <span className="block text-xs text-muted">Interactive simulations to embed via QR.</span>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
            {refine && (
              <OutlineRefiner
                req={refine.req}
                outline={refine.outline}
                busy={loading}
                onBack={() => {
                  setRefine(null);
                  setTestMode(false);
                  testMakerRef.current = null;
                }}
                onConfirm={confirmOutline}
              />
            )}
          </>
        )}
      </main>

      <LibraryDrawer
        open={libOpen}
        items={library}
        activeId={current?.id}
        onClose={() => setLibOpen(false)}
        onOpen={openArtifact}
        onDelete={removeArtifact}
      />
      {importOpen && (
        <ImportLessonModal onClose={() => setImportOpen(false)} onImport={handleImport} canAutoMedia />
      )}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialTab={settingsTab}
      />

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
        onOpenSettings={() => openSettings("openai")}
        open={askOpen}
        onOpenChange={setAskOpen}
        // Lessons trigger Ask from the deck bar button; other views keep the float.
        showLauncher={current?.kind !== "lesson"}
      />

      {presenting && current && current.kind === "lesson" && (
        <PresentMode lesson={current} onClose={() => setPresenting(false)} />
      )}

      {shareOpen && current && current.kind === "lesson" && (
        <ShareLessonDialog lesson={current} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
