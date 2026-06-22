"use client";

import { useEffect, useState } from "react";
import { X, KeyRound, ShieldCheck, ExternalLink, Check, ImagePlus, Search, Zap } from "lucide-react";
import {
  getApiKey,
  setApiKey,
  getImageConfig,
  setImageConfig,
  getSearchKey,
  setSearchKey,
  getModel,
  setModel,
} from "@/lib/storage";
import { MODEL_OPTIONS } from "@/lib/anthropic";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [pixabayKey, setPixabayKey] = useState("");
  const [model, setModelState] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(getApiKey());
      const cfg = getImageConfig();
      setProxyUrl(cfg.proxyUrl);
      setImageKey(cfg.apiKey);
      setPixabayKey(getSearchKey());
      setModelState(getModel());
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  const save = () => {
    setApiKey(value);
    setImageConfig({ proxyUrl, apiKey: imageKey });
    setSearchKey(pixabayKey);
    setModel(model);
    setSaved(true);
    setTimeout(onClose, 600);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-white p-6 card-shadow">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <KeyRound size={20} className="text-brand-600" /> Settings
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <p className="mt-4 text-sm text-muted">
          Boardmarkie generates with Anthropic&apos;s Claude. If the site is hosted
          with a server key you can leave this blank. Otherwise paste your own key —
          it&apos;s stored only in this browser and sent directly with your requests.
        </p>

        <label className="mt-5 block">
          <span className="text-sm font-semibold text-ink">Anthropic API key</span>
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
            className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-mint px-3.5 py-3 text-xs text-brand-900">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
          Your key never touches our database — it stays in your browser&apos;s local storage.
        </div>

        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
        >
          Get an Anthropic API key <ExternalLink size={13} />
        </a>

        <div className="mt-6 border-t border-line pt-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Zap size={16} className="text-brand-600" /> Speed vs. quality
          </h3>
          <p className="mt-1.5 text-xs text-muted">
            Which Claude model writes your lessons. Faster tiers generate in less time and cost less;
            higher tiers add depth on complex topics.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-paper p-1.5">
            {MODEL_OPTIONS.map((o) => {
              const active = o.id === model;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setModelState(o.id)}
                  className={`rounded-xl px-2 py-2.5 text-center text-sm font-semibold transition-all ${
                    active ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">{MODEL_OPTIONS.find((o) => o.id === model)?.blurb}</p>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <ImagePlus size={16} className="text-brand-600" /> Image generation
          </h3>
          <p className="mt-1.5 text-xs text-muted">
            Slide illustrations use Google Imagen via a small proxy you deploy
            once (a Cloudflare Worker — see the <code className="rounded bg-paper px-1">worker/</code> folder).
            Diagrams are drawn by Claude and need nothing extra here.
          </p>

          <label className="mt-3 block">
            <span className="text-sm font-semibold text-ink">Image proxy URL</span>
            <input
              type="url"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="https://boardmarkie-image-proxy.…workers.dev"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-sm font-semibold text-ink">
              Gemini API key{" "}
              <span className="font-normal text-muted">(blank if the proxy holds a shared key)</span>
            </span>
            <input
              type="password"
              value={imageKey}
              onChange={(e) => setImageKey(e.target.value)}
              placeholder="AIza…"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
          >
            Get a Gemini API key <ExternalLink size={13} />
          </a>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Search size={16} className="text-brand-600" /> Image search
          </h3>
          <p className="mt-1.5 text-xs text-muted">
            The editor’s <span className="font-semibold text-ink">Swap → Search</span> finds high-quality,
            classroom-safe photos and illustrations via{" "}
            <a
              href="https://pixabay.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-700 hover:underline"
            >
              Pixabay
            </a>
            . Add your free API key below (email signup — no cloud project or billing). You can always upload
            a file or paste an image URL instead.
          </p>

          <label className="mt-3 block">
            <span className="text-sm font-semibold text-ink">Pixabay API key</span>
            <input
              type="password"
              value={pixabayKey}
              onChange={(e) => setPixabayKey(e.target.value)}
              placeholder="e.g. 12345678-abcdef…"
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <a
            href="https://pixabay.com/api/docs/"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
          >
            Get a free Pixabay API key <ExternalLink size={13} />
          </a>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setApiKey("");
              setValue("");
            }}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            Clear
          </button>
          <button
            onClick={save}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {saved ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : (
              "Save key"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
