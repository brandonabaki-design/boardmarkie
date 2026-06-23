"use client";

import { useEffect, useState } from "react";
import { X, KeyRound, ShieldCheck, ExternalLink, Check, ImagePlus, Search, Zap, Sparkles } from "lucide-react";
import {
  getApiKey,
  setApiKey,
  getImageConfig,
  setImageConfig,
  getSearchKey,
  setSearchKey,
  getModel,
  setModel,
  getImageStyle,
  setImageStyle,
  type ImageStyle,
  getImageQuality,
  setImageQuality,
  type ImageQuality,
} from "@/lib/storage";
import { MODEL_OPTIONS } from "@/lib/anthropic";

type Tab = "claude" | "images";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("claude");
  const [value, setValue] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [pixabayKey, setPixabayKey] = useState("");
  const [model, setModelState] = useState<string>("");
  const [imgStyle, setImgStyle] = useState<ImageStyle>("line");
  const [imgQuality, setImgQuality] = useState<ImageQuality>("standard");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("claude");
      setValue(getApiKey());
      const cfg = getImageConfig();
      setProxyUrl(cfg.proxyUrl);
      setImageKey(cfg.apiKey);
      setPixabayKey(getSearchKey());
      setModelState(getModel());
      setImgStyle(getImageStyle());
      setImgQuality(getImageQuality());
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  const save = () => {
    setApiKey(value);
    setImageConfig({ proxyUrl, apiKey: imageKey });
    setSearchKey(pixabayKey);
    setModel(model);
    setImageStyle(imgStyle);
    setImageQuality(imgQuality);
    setSaved(true);
    setTimeout(onClose, 600);
  };

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  const tabs: { id: Tab; label: string; icon: typeof KeyRound }[] = [
    { id: "claude", label: "Claude", icon: Zap },
    { id: "images", label: "Images", icon: ImagePlus },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-white card-shadow">
        {/* header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <KeyRound size={20} className="text-brand-600" /> Settings
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* tabs */}
        <div className="shrink-0 px-4 pt-3">
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-paper p-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold transition-all ${
                  tab === t.id ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-auto px-6 py-5">
          {tab === "claude" && (
            <div>
              <p className="text-sm text-muted">
                Boardmarkie generates with Anthropic&apos;s Claude. If the site is hosted with a server key
                you can leave this blank. Otherwise paste your own key — it&apos;s stored only in this browser
                and sent directly with your requests.
              </p>

              <label className="mt-5 block">
                <span className="text-sm font-semibold text-ink">Anthropic API key</span>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="sk-ant-…"
                  autoComplete="off"
                  className={inputCls}
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
            </div>
          )}

          {tab === "images" && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Sparkles size={16} className="text-brand-600" /> Image generation
              </h3>
              <p className="mt-1.5 text-xs text-muted">
                Slide illustrations use Google Imagen via a small proxy you deploy once. Diagrams are drawn by
                Claude and need nothing extra here.
              </p>

              <label className="mt-3 block">
                <span className="text-sm font-semibold text-ink">Image proxy URL</span>
                <input
                  type="url"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="https://boardmarkie.vercel.app/api/image"
                  autoComplete="off"
                  className={inputCls}
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
                  className={inputCls}
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

              <div className="mt-4">
                <span className="text-sm font-semibold text-ink">Illustration style</span>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-paper p-1.5">
                  {(
                    [
                      ["line", "Line art (B&W)"],
                      ["color", "Colour"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setImgStyle(v)}
                      className={`rounded-xl px-2 py-2 text-sm font-semibold transition-all ${
                        imgStyle === v ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Black-and-white line art looks clean, loads fast, and is printer-friendly.
                </p>
              </div>

              <div className="mt-4">
                <span className="text-sm font-semibold text-ink">Image quality</span>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-paper p-1.5">
                  {(
                    [
                      ["fast", "Fast"],
                      ["standard", "Standard"],
                      ["ultra", "Ultra"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setImgQuality(v)}
                      className={`rounded-xl px-2 py-2 text-sm font-semibold transition-all ${
                        imgQuality === v ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Higher tiers follow the prompt more accurately — Ultra is best (slower &amp; pricier). Note:
                  raster images can&apos;t render reliable text; use a Diagram for anything with labels.
                </p>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Search size={16} className="text-brand-600" /> Image search
                </h3>
                <p className="mt-1.5 text-xs text-muted">
                  <span className="font-semibold text-ink">Swap → Web search</span> uses Google image search
                  when your proxy has <code className="rounded bg-paper px-1">GOOGLE_CSE_KEY</code> and{" "}
                  <code className="rounded bg-paper px-1">GOOGLE_CSE_CX</code> set — broad, high-quality web
                  images. Otherwise it falls back to{" "}
                  <a
                    href="https://pixabay.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-700 hover:underline"
                  >
                    Pixabay
                  </a>{" "}
                  (add a free key below).
                </p>

                <label className="mt-3 block">
                  <span className="text-sm font-semibold text-ink">Pixabay API key</span>
                  <input
                    type="password"
                    value={pixabayKey}
                    onChange={(e) => setPixabayKey(e.target.value)}
                    placeholder="e.g. 12345678-abcdef…"
                    autoComplete="off"
                    className={inputCls}
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
            </div>
          )}
        </div>

        {/* pinned footer */}
        <div className="flex shrink-0 gap-3 border-t border-line bg-white px-6 py-4">
          <button
            onClick={() => {
              setApiKey("");
              setValue("");
            }}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            Clear key
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
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
