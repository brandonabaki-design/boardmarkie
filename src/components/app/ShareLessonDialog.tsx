"use client";

import { useEffect, useState } from "react";
import { X, Check, Share2, Trash2, Copy, Link2 } from "lucide-react";
import type { Lesson } from "@/lib/types";
import { publishLesson, unpublishLesson, getMyPublishedIds } from "@/lib/lessonsLib";
import { lessonLink } from "@/lib/supabase";
import { useSupabaseUser } from "@/lib/supabaseAuth";
import { SimSignIn } from "./SimSignIn";
import { Spinner } from "./ui";

/** Publish the current lesson to the shared library all teachers can browse. */
export function ShareLessonDialog({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const { user, loading: authLoading } = useSupabaseUser();
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(lessonLink(lesson.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    getMyPublishedIds(user.id).then((ids) => active && setPublished(ids.has(lesson.id)));
    return () => {
      active = false;
    };
  }, [user, lesson.id]);

  const publish = async () => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await publishLesson(lesson, { id: user.id, name: user.name });
      setPublished(true);
      setDone(true);
    } catch (e) {
      setError((e as Error)?.message || "Couldn't publish this lesson.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await unpublishLesson(lesson.id);
      setPublished(false);
      setDone(false);
    } catch (e) {
      setError((e as Error)?.message || "Couldn't remove this lesson.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-white p-6 card-shadow">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <Share2 size={20} className="text-brand-600" /> Publish to library
          </h2>
          <button onClick={onClose} disabled={busy} className="text-muted hover:text-ink disabled:opacity-40">
            <X size={20} />
          </button>
        </div>

        {!authLoading && !user ? (
          <div className="mt-5">
            <p className="mb-4 text-sm text-muted">Sign in once to publish lessons all teachers can browse and reuse.</p>
            <SimSignIn heading="Sign in to publish your lesson" />
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">
              Publishing <strong className="text-ink">{lesson.meta.title}</strong> makes it visible to all teachers in the
              shared library, where they can open and adapt it. (Large AI-generated raster images stay on your device;
              text, layouts, diagrams and linked media are shared.)
            </p>

            {error && <p className="mt-3 text-xs text-coral">{error}</p>}
            {done && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                <Check size={15} /> Published to the shared library.
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={publish}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
              >
                {busy ? <Spinner /> : <Share2 size={16} />}
                {published ? "Update shared copy" : "Publish to library"}
              </button>
              {published && (
                <button
                  onClick={remove}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-coral transition-colors hover:bg-coral/10 disabled:opacity-50"
                >
                  <Trash2 size={15} /> Remove
                </button>
              )}
            </div>

            {published && (
              <div className="mt-4 rounded-xl border border-line bg-paper/50 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <Link2 size={13} /> Shareable presentation link
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={lessonLink(lesson.id)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-muted outline-none"
                  />
                  <button
                    onClick={copyLink}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300"
                  >
                    {copied ? <Check size={13} className="text-brand-600" /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted">Anyone with the link can view this presentation (read-only).</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
