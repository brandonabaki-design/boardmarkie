"use client";

import { useEffect, useState } from "react";
import { X, KeyRound, ShieldCheck, ExternalLink, Check, ImagePlus, Search, Zap, Sparkles, Bot, Film, Eye, EyeOff } from "lucide-react";
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
  getImageProvider,
  setImageProvider,
  type ImageProvider,
  getOpenAIKey,
  setOpenAIKey,
  getGiphyKey,
  setGiphyKey,
} from "@/lib/storage";
import { MODEL_OPTIONS } from "@/lib/anthropic";
import { CHAT_MODEL, chatComplete } from "@/lib/openai";
import { Spinner } from "./ui";

type Tab = "claude" | "openai" | "images";

// Masked API-key input with a show/hide toggle, so keys can be verified.
function SecretInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative mt-1.5">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-xl border border-line px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-ink"
        aria-label={show ? "Hide API key" : "Show API key"}
        title={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("claude");
  const [value, setValue] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [pixabayKey, setPixabayKey] = useState("");
  const [giphyKey, setGiphyKeyState] = useState("");
  const [openaiKey, setOpenaiKeyState] = useState("");
  const [model, setModelState] = useState<string>("");
  const [imgProvider, setImgProvider] = useState<ImageProvider>("imagen");
  const [imgStyle, setImgStyle] = useState<ImageStyle>("line");
  const [imgQuality, setImgQuality] = useState<ImageQuality>("standard");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setTab("claude");
      setValue(getApiKey());
      const cfg = getImageConfig();
      setProxyUrl(cfg.proxyUrl);
      setImageKey(cfg.apiKey);
      setPixabayKey(getSearchKey());
      setGiphyKeyState(getGiphyKey());
      setOpenaiKeyState(getOpenAIKey());
      setModelState(getModel());
      setImgProvider(getImageProvider());
      setImgStyle(getImageStyle());
      setImgQuality(getImageQuality());
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  const persist = () => {
    setApiKey(value);
    setImageConfig({ proxyUrl, apiKey: imageKey });
    setSearchKey(pixabayKey);
    setGiphyKey(giphyKey);
    setOpenAIKey(openaiKey);
    setModel(model);
    setImageProvider(imgProvider);
    setImageStyle(imgStyle);
    setImageQuality(imgQuality);
  };

  const save = () => {
    persist();
    setSaved(true);
    setTimeout(onClose, 600);
  };

  // One-click OpenAI check: saves settings, then pings the proxy and reports the
  // exact outcome (success, or OpenAI's precise error) so setup issues are obvious.
  const testOpenAI = async () => {
    persist();
    setTestMsg(null);
    setTesting(true);
    try {
      const r = await chatComplete([{ role: "user", content: "Reply with exactly: OK" }]);
      setTestMsg({ ok: true, text: `Connected — OpenAI replied “${(r.content || "").trim().slice(0, 40)}”.` });
    } catch (e) {
      setTestMsg({ ok: false, text: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const keyPreview = openaiKey ? `${openaiKey.slice(0, 7)}…${openaiKey.slice(-4)}` : "(empty)";
  const chatEndpoint = proxyUrl ? proxyUrl.replace(/\/image\/?$/, "/openai-chat") : "(no proxy URL set)";

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  const tabs: { id: Tab; label: string; icon: typeof KeyRound }[] = [
    { id: "claude", label: "Claude", icon: Zap },
    { id: "openai", label: "OpenAI", icon: Bot },
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
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-paper p-1.5">
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
                <SecretInput value={value} onChange={setValue} placeholder="sk-ant-…" />
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

          {tab === "openai" && (
            <div>
              <p className="text-sm text-muted">
                An OpenAI key powers <span className="font-semibold text-ink">Ask Boardmarkie</span> (the{" "}
                {CHAT_MODEL} chat assistant) and <span className="font-semibold text-ink">DALL·E 3</span> image
                generation. It&apos;s stored only in this browser and routed through your image proxy — OpenAI
                blocks direct browser calls — so you&apos;ll also need a proxy URL set in the Images tab.
              </p>

              <label className="mt-5 block">
                <span className="text-sm font-semibold text-ink">OpenAI API key</span>
                <SecretInput value={openaiKey} onChange={setOpenaiKeyState} placeholder="sk-…" />
              </label>

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-mint px-3.5 py-3 text-xs text-brand-900">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
                Your key stays in your browser&apos;s local storage and is sent only to your own proxy.
              </div>

              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
              >
                Get an OpenAI API key <ExternalLink size={13} />
              </a>

              <div className="mt-5 rounded-xl border border-line p-3.5">
                <button
                  type="button"
                  onClick={testOpenAI}
                  disabled={testing}
                  className="inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
                >
                  {testing ? <Spinner /> : <Bot size={15} />} Test OpenAI connection
                </button>
                <p className="mt-2 break-all text-[11px] leading-relaxed text-muted">
                  Saves, then sends key <code className="rounded bg-paper px-1">{keyPreview}</code> to{" "}
                  <code className="rounded bg-paper px-1">{chatEndpoint}</code>
                </p>
                {testMsg && (
                  <p className={`mt-2 text-xs ${testMsg.ok ? "font-medium text-brand-700" : "text-coral"}`}>
                    {testMsg.ok ? "✅ " : "❌ "}
                    {testMsg.text}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-paper px-3.5 py-3 text-xs text-muted">
                <Sparkles size={15} className="mt-0.5 shrink-0 text-brand-600" />
                To draw slide illustrations with DALL·E 3, switch the image engine to DALL·E 3 in the Images
                tab.
              </div>
            </div>
          )}

          {tab === "images" && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Sparkles size={16} className="text-brand-600" /> Image generation
              </h3>

              <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-paper p-1.5">
                {(
                  [
                    ["imagen", "Imagen (Google)"],
                    ["dalle", "DALL·E 3 (OpenAI)"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setImgProvider(v)}
                    className={`rounded-xl px-2 py-2 text-sm font-semibold transition-all ${
                      imgProvider === v ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {imgProvider === "dalle"
                  ? "DALL·E 3 uses your OpenAI key (OpenAI tab), routed through the proxy below. Diagrams are still drawn by Claude."
                  : "Google Imagen runs through the proxy below. Diagrams are drawn by Claude and need nothing extra."}
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
                <SecretInput value={imageKey} onChange={setImageKey} placeholder="AIza…" />
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
                  <span className="font-semibold text-ink">Swap → Web search</span> uses{" "}
                  <a
                    href="https://openverse.org"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-700 hover:underline"
                  >
                    Openverse
                  </a>{" "}
                  — millions of openly-licensed images from Flickr, Wikimedia Commons, museums and more —
                  with no key and no setup. A{" "}
                  <a
                    href="https://pixabay.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-700 hover:underline"
                  >
                    Pixabay
                  </a>{" "}
                  key (below) is an optional backup for extra stock photos.
                </p>

                <label className="mt-3 block">
                  <span className="text-sm font-semibold text-ink">Pixabay API key</span>
                  <SecretInput value={pixabayKey} onChange={setPixabayKey} placeholder="e.g. 12345678-abcdef…" />
                </label>

                <a
                  href="https://pixabay.com/api/docs/"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                >
                  Get a free Pixabay API key <ExternalLink size={13} />
                </a>

                <div className="mt-5">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Film size={14} className="text-brand-600" /> Giphy API key
                  </span>
                  <p className="mt-1 text-xs text-muted">
                    Enables the <span className="font-semibold text-ink">GIFs</span> toggle in Swap → Web
                    search.
                  </p>
                  <SecretInput value={giphyKey} onChange={setGiphyKeyState} placeholder="Giphy API key…" />
                  <a
                    href="https://developers.giphy.com/dashboard/"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                  >
                    Get a free Giphy API key <ExternalLink size={13} />
                  </a>
                </div>
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
