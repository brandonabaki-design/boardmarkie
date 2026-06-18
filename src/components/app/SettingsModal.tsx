"use client";

import { useEffect, useState } from "react";
import { X, KeyRound, ShieldCheck, ExternalLink, Check } from "lucide-react";
import { getApiKey, setApiKey } from "@/lib/storage";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(getApiKey());
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  const save = () => {
    setApiKey(value);
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
