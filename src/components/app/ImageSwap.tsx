"use client";

import { useState } from "react";
import { X, Search, Upload, Link2, Sparkles, PenTool, ImageIcon, ExternalLink } from "lucide-react";
import { searchImages, googleImagesUrl, type ImageResult } from "@/lib/imageSearch";
import { searchGifs } from "@/lib/gifSearch";
import { getImageConfig } from "@/lib/storage";
import { generateImage, illustrationPrompt } from "@/lib/images";
import { generateDiagram } from "@/lib/client";
import { Spinner } from "./ui";
import { useDialog } from "./useDialog";

export interface SwapMedia {
  src?: string;
  svg?: string;
  alt?: string;
}

export interface SwapContext {
  topic: string;
  subject: string;
  yearGroup: string;
  region: string;
  slideTitle?: string;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

/** Encode an image URL as a data URL — direct fetch first, then the Vercel
 *  /fetch-image proxy (server-side, no CORS), so picked images embed reliably. */
async function toDataUrl(src: string): Promise<string> {
  try {
    const res = await fetch(src);
    if (res.ok) return await blobToDataUrl(await res.blob());
  } catch {
    /* fall through to the proxy */
  }
  const { proxyUrl } = getImageConfig();
  if (!proxyUrl) throw new Error("fetch failed");
  const fetchUrl = proxyUrl.replace(/\/image\/?$/, "/fetch-image");
  const res = await fetch(fetchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: src }),
  });
  if (!res.ok) throw new Error("proxy fetch failed");
  const data = (await res.json()) as { image?: string };
  if (!data.image) throw new Error("no image returned");
  return data.image;
}

type Tab = "ai" | "search" | "upload";

export function ImageSwap({
  initialQuery = "",
  context,
  onPick,
  onClose,
}: {
  initialQuery?: string;
  context?: SwapContext;
  onPick: (media: SwapMedia) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("ai");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // AI create
  const [prompt, setPrompt] = useState(initialQuery);
  const [kind, setKind] = useState<"illustration" | "diagram">("illustration");

  // Web search
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<ImageResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchKind, setSearchKind] = useState<"image" | "gif">("image");

  // Upload / URL
  const [url, setUrl] = useState("");

  const dialogRef = useDialog(true, onClose);

  const finish = (media: SwapMedia) => {
    onPick(media);
  };

  const runAi = async () => {
    if (!prompt.trim()) return;
    setErr(null);
    setBusy(true);
    try {
      if (kind === "diagram") {
        if (!context) throw new Error("Diagrams need lesson context.");
        const { svg, alt } = await generateDiagram({
          topic: context.topic,
          subject: context.subject,
          yearGroup: context.yearGroup,
          region: context.region,
          slideTitle: context.slideTitle,
          instruction: prompt.trim(),
        });
        finish({ svg, alt });
      } else {
        const src = await generateImage(illustrationPrompt(prompt.trim()), { aspectRatio: "16:9" });
        finish({ src });
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runSearch = async () => {
    if (!q.trim()) return;
    setErr(null);
    setSearching(true);
    setResults([]);
    try {
      setResults(searchKind === "gif" ? await searchGifs(q.trim()) : await searchImages(q.trim()));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = async (r: ImageResult) => {
    setBusy(true);
    try {
      finish({ src: await toDataUrl(r.url || r.thumb), alt: r.title });
    } catch {
      try {
        finish({ src: await toDataUrl(r.thumb), alt: r.title });
      } catch {
        finish({ src: r.url || r.thumb, alt: r.title });
      }
    } finally {
      setBusy(false);
    }
  };

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => finish({ src: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const pickUrl = async (raw: string) => {
    setBusy(true);
    try {
      finish({ src: await toDataUrl(raw) });
    } catch {
      finish({ src: raw });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Swap image"
        tabIndex={-1}
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border border-line bg-white p-6 outline-none card-shadow"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Swap image</h2>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-muted">Generate, browse, or upload images and diagrams.</p>

        {/* tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-paper p-1.5">
          {([
            { id: "ai", label: "AI create", icon: <Sparkles size={15} /> },
            { id: "search", label: "Web search", icon: <Search size={15} /> },
            { id: "upload", label: "Upload", icon: <Upload size={15} /> },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setErr(null);
                setTab(t.id);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold transition-all ${
                tab === t.id ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {busy && (
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-brand-700">
            <Spinner /> Working…
          </p>
        )}
        {err && (
          <p className="mt-3 text-xs text-coral">
            {err}{" "}
            {tab === "search" && (
              <a href={googleImagesUrl(q)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                open Google Images <ExternalLink size={11} />
              </a>
            )}
          </p>
        )}

        <div className="mt-4 min-h-[8rem] flex-1 overflow-auto">
          {tab === "ai" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-paper p-1.5">
                <button
                  onClick={() => setKind("illustration")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-all ${kind === "illustration" ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"}`}
                >
                  <ImageIcon size={14} /> Illustration
                </button>
                <button
                  onClick={() => setKind("diagram")}
                  disabled={!context}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-all disabled:opacity-40 ${kind === "diagram" ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"}`}
                >
                  <PenTool size={14} /> Diagram
                </button>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Describe what you want</span>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder={kind === "diagram" ? "e.g. a labelled diagram of the water cycle" : "e.g. three orange slices in a row on a clean background"}
                  className="mt-1.5 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
                />
              </label>
              <button
                onClick={runAi}
                disabled={busy || !prompt.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {busy ? <Spinner /> : <Sparkles size={16} />} Generate
              </button>
              <p className="text-xs text-muted">
                Illustrations use your image proxy (Settings → Image generation). Diagrams are drawn by Claude.
              </p>
            </div>
          )}

          {tab === "search" && (
            <div>
              <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-paper p-1">
                {(["image", "gif"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      setSearchKind(k);
                      setResults([]);
                      setErr(null);
                    }}
                    className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
                      searchKind === k ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"
                    }`}
                  >
                    {k === "image" ? "Images" : "GIFs"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder={searchKind === "gif" ? "Search GIFs (Giphy)…" : "Search openly-licensed images…"}
                  className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
                />
                <button
                  onClick={runSearch}
                  disabled={searching || !q.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {searching ? <Spinner /> : <Search size={16} />}
                </button>
              </div>
              {results.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => pickResult(r)}
                      disabled={busy}
                      title={r.title}
                      className="aspect-square overflow-hidden rounded-lg border border-line transition-colors hover:border-brand-400 disabled:opacity-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.thumb} alt={r.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                !searching && (
                  <p className="mt-6 text-center text-xs text-muted">
                    {searchKind === "gif"
                      ? "Search Giphy for fun, classroom-safe GIFs."
                      : "Search millions of free, openly-licensed images you can safely reuse in class."}
                  </p>
                )
              )}
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand-300">
                <Upload size={16} className="text-brand-600" /> Upload from device
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <div className="flex gap-2">
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="…or paste an image URL"
                  className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
                />
                <button
                  onClick={() => url.trim() && pickUrl(url.trim())}
                  disabled={!url.trim() || busy}
                  aria-label="Use pasted URL"
                  className="rounded-xl border border-line px-4 py-2.5 text-ink transition-colors hover:border-brand-300 disabled:opacity-50"
                >
                  <Link2 size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
