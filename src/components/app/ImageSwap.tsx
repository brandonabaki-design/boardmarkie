"use client";

import { useState } from "react";
import { X, Search, Upload, Link2, Trash2, ExternalLink } from "lucide-react";
import type { Slide } from "@/lib/types";
import { searchImages, googleImagesUrl, type ImageResult } from "@/lib/imageSearch";
import { Spinner } from "./ui";

/** Fetch an image and encode it as a data URL (so it renders instantly, works
 *  even if the host blocks hotlinking, and embeds cleanly into exports). */
async function toDataUrl(src: string): Promise<string> {
  const res = await fetch(src);
  if (!res.ok) throw new Error("fetch failed");
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

export function ImageSwap({
  slide,
  onPick,
  onRemove,
  onClose,
}: {
  slide: Slide;
  onPick: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(slide.imagePrompt || slide.title || "");
  const [results, setResults] = useState<ImageResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [picking, setPicking] = useState(false);

  const runSearch = async () => {
    if (!q.trim()) return;
    setErr(null);
    setSearching(true);
    setResults([]);
    try {
      setResults(await searchImages(q.trim()));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const onFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onPick(String(reader.result));
    reader.readAsDataURL(file);
  };

  // Prefer the small CORS-friendly thumbnail (fast + reliable + embeddable);
  // fall back to the full image, then to the raw URL (display-only).
  const pickResult = async (r: ImageResult) => {
    setPicking(true);
    try {
      onPick(await toDataUrl(r.thumb || r.url));
    } catch {
      try {
        onPick(await toDataUrl(r.url));
      } catch {
        onPick(r.url);
      }
    } finally {
      setPicking(false);
    }
  };

  const pickUrl = async (raw: string) => {
    setPicking(true);
    try {
      onPick(await toDataUrl(raw));
    } catch {
      onPick(raw);
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-line bg-white p-6 card-shadow">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Swap image</h2>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
            placeholder="Search free images (Openverse)…"
            className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          />
          <button
            onClick={runSearch}
            disabled={searching || !q.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {searching ? <Spinner /> : <Search size={16} />} Search
          </button>
        </div>

        {err && (
          <p className="mt-2 text-xs text-coral">
            {err}{" "}
            <a
              href={googleImagesUrl(q)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
            >
              open Google Images <ExternalLink size={11} />
            </a>{" "}
            then upload or paste the URL below.
          </p>
        )}

        {picking && (
          <p className="mt-2 flex items-center gap-2 text-xs font-medium text-brand-700">
            <Spinner /> Adding image…
          </p>
        )}

        <div className="mt-3 min-h-[4rem] flex-1 overflow-auto">
          {results.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => pickResult(r)}
                  disabled={picking}
                  title={r.title}
                  className="aspect-square overflow-hidden rounded-lg border border-line transition-colors hover:border-brand-400 disabled:opacity-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.thumb} alt={r.title} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            !searching &&
            !err && (
              <p className="py-6 text-center text-xs text-muted">
                Search the web, upload an image, or paste a URL.
              </p>
            )
          )}
        </div>

        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand-300">
            <Upload size={16} className="text-brand-600" /> Upload from device
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
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
              disabled={!url.trim() || picking}
              aria-label="Use pasted URL"
              className="rounded-xl border border-line px-4 py-2.5 text-ink transition-colors hover:border-brand-300 disabled:opacity-50"
            >
              <Link2 size={16} />
            </button>
          </div>
          {(slide.imageUrl || slide.diagramSvg) && (
            <button
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-coral hover:underline"
            >
              <Trash2 size={13} /> Remove current image
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
