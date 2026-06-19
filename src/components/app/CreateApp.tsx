"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FolderOpen, Settings, Plus, ArrowLeft, AlertCircle, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import type {
  Artifact,
  EditAction,
  GenerateRequest,
  GenerationMode,
  Lesson,
  SeriesLesson,
  Slide,
} from "@/lib/types";
import { generateArtifact, editLesson, generateDiagram } from "@/lib/client";
import { generateImage } from "@/lib/images";
import { deleteArtifact, getImageConfig, getLibrary, saveArtifact } from "@/lib/storage";
import { GeneratorForm } from "./GeneratorForm";
import { GeneratingState } from "./GeneratingState";
import { LessonView } from "./LessonView";
import { WorksheetView } from "./WorksheetView";
import { SeriesView } from "./SeriesView";
import { SettingsModal } from "./SettingsModal";
import { LibraryDrawer } from "./LibraryDrawer";
import { ExportMenu } from "./ExportMenu";
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

// Shared illustration prompt — adds a classroom-friendly style and steers the
// raster model away from rendering (usually garbled) text in the image.
function imagePromptFor(slide: { imagePrompt?: string }): string {
  return `${slide.imagePrompt}. Bright, friendly, age-appropriate educational illustration; clean flat style; no words or text in the image.`;
}

export function CreateApp() {
  const params = useSearchParams();
  const initialMode: GenerationMode = isMode(params.get("mode")) ? (params.get("mode") as GenerationMode) : "lesson";

  const [library, setLibrary] = useState<Artifact[]>([]);
  const [current, setCurrent] = useState<Artifact | null>(null);
  const [genMode, setGenMode] = useState<GenerationMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [expanding, setExpanding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libOpen, setLibOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mediaBusy, setMediaBusy] = useState<{ slideId: string; kind: "image" | "diagram" } | null>(
    null,
  );
  const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    setLibrary(getLibrary());
  }, []);

  const refresh = () => setLibrary(getLibrary());

  const handleError = (err: unknown) => {
    const e = err as Error & { status?: number };
    setError(e.message || "Something went wrong.");
    if (e.status === 401) setSettingsOpen(true);
  };

  const handleGenerate = async (req: GenerateRequest) => {
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
    saveArtifact(artifact);
    setCurrent(artifact);
    refresh();
    setLoading(false);

    // Optionally illustrate the slides right after creation.
    if (req.autoImages && artifact.kind === "lesson") {
      if (!getImageConfig().proxyUrl) {
        setError(
          "Lesson created. To auto-generate images, add your image proxy URL and Gemini key in Settings — then use “Generate image” on a slide.",
        );
        setSettingsOpen(true);
      } else {
        await autoGenerateImages(artifact);
      }
    }
  };

  const autoGenerateImages = async (lesson: Lesson) => {
    const targets = lesson.slides.filter((s) => s.imagePrompt && !s.imageUrl);
    if (!targets.length) return;
    setImageProgress({ done: 0, total: targets.length });
    let working = lesson;
    for (let i = 0; i < targets.length; i++) {
      try {
        const image = await generateImage(imagePromptFor(targets[i]), { aspectRatio: "16:9" });
        working = patchSlide(working, targets[i].id, { imageUrl: image });
        setCurrent(working);
        saveArtifact(working);
      } catch (err) {
        const e = err as Error & { status?: number };
        if (e.status === 401) {
          handleError(err); // misconfigured proxy/key — stop early
          break;
        }
        // otherwise skip this slide and keep going
      }
      setImageProgress({ done: i + 1, total: targets.length });
    }
    refresh();
    setImageProgress(null);
  };

  const handleEdit = async (action: EditAction, instruction?: string, slideId?: string) => {
    if (!current || current.kind !== "lesson") return;
    setError(null);
    setEditing(true);
    try {
      const updated = await editLesson({ lesson: current, action, instruction, slideId });
      saveArtifact(updated);
      setCurrent(updated);
      refresh();
    } catch (err) {
      handleError(err);
    } finally {
      setEditing(false);
    }
  };

  const handleGenerateImage = async (slideId: string) => {
    if (!current || current.kind !== "lesson") return;
    const lesson = current;
    const slide = lesson.slides.find((s) => s.id === slideId);
    if (!slide?.imagePrompt) return;
    setError(null);
    setMediaBusy({ slideId, kind: "image" });
    try {
      const image = await generateImage(imagePromptFor(slide), { aspectRatio: "16:9" });
      const updated = patchSlide(lesson, slideId, { imageUrl: image });
      setCurrent(updated);
      saveArtifact(updated);
      refresh();
    } catch (err) {
      handleError(err);
    } finally {
      setMediaBusy(null);
    }
  };

  const handleGenerateDiagram = async (slideId: string) => {
    if (!current || current.kind !== "lesson") return;
    const lesson = current;
    const slide = lesson.slides.find((s) => s.id === slideId);
    if (!slide) return;
    setError(null);
    setMediaBusy({ slideId, kind: "diagram" });
    try {
      const { svg, alt } = await generateDiagram({
        topic: lesson.meta.topic,
        subject: lesson.meta.subject,
        yearGroup: lesson.meta.yearGroup,
        region: lesson.meta.region,
        slideTitle: slide.title,
        instruction: slide.imagePrompt,
      });
      const updated = patchSlide(lesson, slideId, {
        diagramSvg: svg,
        imageAlt: slide.imageAlt || alt,
      });
      setCurrent(updated);
      saveArtifact(updated);
      refresh();
    } catch (err) {
      handleError(err);
    } finally {
      setMediaBusy(null);
    }
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
      saveArtifact(artifact);
      setCurrent(artifact);
      refresh();
      window.scrollTo({ top: 0 });
    } catch (err) {
      handleError(err);
    } finally {
      setExpanding(null);
    }
  };

  const openArtifact = (a: Artifact) => {
    setCurrent(a);
    setLibOpen(false);
    setError(null);
    window.scrollTo({ top: 0 });
  };

  const removeArtifact = (id: string) => {
    deleteArtifact(id);
    refresh();
    if (current?.id === id) setCurrent(null);
  };

  const startNew = () => {
    setCurrent(null);
    setError(null);
  };

  const busy = loading || editing || expanding !== null || mediaBusy !== null || imageProgress !== null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* app header */}
      <header className="no-print sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            {current && (
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
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
            <Spinner className="h-4 w-4 text-brand-600" /> Generating images… {imageProgress.done}/
            {imageProgress.total}
          </div>
        )}

        {loading && !current ? (
          <GeneratingState mode={genMode} />
        ) : !current ? (
          <GeneratorForm initialMode={initialMode} loading={loading} onSubmit={handleGenerate} />
        ) : (
          <div>
            <button
              onClick={startNew}
              className="no-print mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft size={16} /> New plan
            </button>

            {current.kind === "lesson" && (
              <LessonView
                lesson={current as Lesson}
                busy={busy}
                onEdit={handleEdit}
                onGenerateImage={handleGenerateImage}
                onGenerateDiagram={handleGenerateDiagram}
                mediaBusy={mediaBusy}
              />
            )}
            {current.kind === "worksheet" && <WorksheetView worksheet={current} />}
            {current.kind === "series" && (
              <SeriesView series={current} busyLesson={expanding} onExpand={handleExpand} />
            )}
          </div>
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
    </div>
  );
}
