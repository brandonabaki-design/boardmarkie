"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, Download } from "lucide-react";
import { qrToDataURL } from "@/lib/qr";

/** Modal showing a scannable QR for `url`, with copy-link and PNG download. */
export function QrOverlay({ url, onClose }: { url: string; onClose: () => void }) {
  const [png, setPng] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    qrToDataURL(url, { width: 320 }).then((d) => active && setPng(d)).catch(() => {});
    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xs rounded-2xl border border-line bg-white p-6 text-center card-shadow">
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 text-muted hover:text-ink">
          <X size={18} />
        </button>
        <h3 className="font-display text-lg font-bold text-ink">Scan to open</h3>
        <p className="mt-1 text-xs text-muted">Students scan this to launch the simulation on their device.</p>
        <div className="mx-auto mt-4 grid h-[240px] w-[240px] place-items-center rounded-xl border border-line bg-white p-2">
          {png ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={png} alt="QR code" width={224} height={224} className="h-full w-full" />
          ) : (
            <span className="text-xs text-muted">Generating…</span>
          )}
        </div>
        <p className="mt-3 break-all text-[11px] text-muted">{url}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={copy}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
          >
            {copied ? <Check size={15} className="text-brand-600" /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy link"}
          </button>
          {png && (
            <a
              href={png}
              download="edusim-qr.png"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Download size={15} /> PNG
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
