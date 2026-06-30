"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Info, QrCode, X } from "lucide-react";
import { getSimulation, incrementView, getAuthorNames, type Simulation } from "@/lib/sims";
import { eduSimLink } from "@/lib/supabase";
import { SandboxedHtml } from "./SandboxedHtml";
import { QrOverlay } from "./QrOverlay";
import { Stars } from "./Stars";
import { SimTypeBadge } from "./SimTypeBadge";

export function SimViewer() {
  const id = useSearchParams().get("id") ?? "";
  const [sim, setSim] = useState<Simulation | null>(null);
  const [author, setAuthor] = useState("");
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("No simulation was specified.");
      return;
    }
    let active = true;
    setError("");
    setSim(null);
    getSimulation(id)
      .then(async (data) => {
        if (!active) return;
        setSim(data);
        incrementView(id);
        const names = await getAuthorNames([data.author_id]);
        if (active) setAuthor(names[data.author_id] || "A teacher");
      })
      .catch((e) => active && setError(e?.message || "This simulation could not be found."));
    return () => {
      active = false;
    };
  }, [id]);

  const shareUrl = id ? eduSimLink(id) : "";

  if (error) {
    return (
      <div className="grid h-[100dvh] place-items-center p-6 text-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">Hmm.</h2>
          <p className="mt-2 text-muted">{error}</p>
          <Link
            href="/sims/"
            className="mt-4 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Back to library
          </Link>
        </div>
      </div>
    );
  }
  if (!sim) {
    return <div className="grid h-[100dvh] place-items-center text-sm text-muted">Loading simulation…</div>;
  }

  return (
    <div className="relative h-[100dvh] w-full bg-white">
      <SandboxedHtml html={sim.html ?? ""} title={sim.title} className="h-full w-full" />

      {/* bottom control bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-line bg-white/95 px-3 py-2 backdrop-blur">
        <Link
          href="/sims/"
          title="Back to library"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-paper hover:text-ink"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="truncate font-semibold text-ink">{sim.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            title="Details"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-paper hover:text-ink"
          >
            <Info size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <QrCode size={16} /> QR
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="absolute bottom-14 right-3 z-20 w-[min(92vw,22rem)] rounded-2xl border border-line bg-white p-4 card-shadow">
          <button
            onClick={() => setShowInfo(false)}
            aria-label="Close"
            className="absolute right-3 top-3 text-muted hover:text-ink"
          >
            <X size={16} />
          </button>
          <h3 className="pr-6 font-display text-lg font-bold text-ink">{sim.title}</h3>
          {sim.description && <p className="mt-1 text-sm text-muted">{sim.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <SimTypeBadge type={sim.sim_type} />
            {sim.grade_level && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {sim.grade_level}
              </span>
            )}
            {sim.subject && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                {sim.subject}
              </span>
            )}
            {(sim.concepts || []).map((c) => (
              <span key={c} className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
                {c}
              </span>
            ))}
          </div>
          {(sim.standards || []).length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-ink">Standards</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {sim.standards.map((s) => (
                  <Link
                    key={s}
                    href={`/sims/?standard=${encodeURIComponent(s)}`}
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
                  >
                    {s}
                  </Link>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted">Tap a standard to find more activities aligned to it.</p>
            </div>
          )}
          <p className="mt-2 text-xs text-muted">
            By {author} · {sim.view_count} views
          </p>
          <div className="mt-2">
            <Stars value={Number(sim.avg_rating) || 0} count={sim.rating_count} size={16} />
          </div>
        </div>
      )}

      {showQr && shareUrl && <QrOverlay url={shareUrl} onClose={() => setShowQr(false)} />}
    </div>
  );
}
