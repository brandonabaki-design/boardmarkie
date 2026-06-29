"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Lesson } from "@/lib/types";
import { getSharedLesson } from "@/lib/lessonsLib";
import { PresentMode } from "./PresentMode";

// Read-only viewer for a published lesson presentation (the target of a "copy
// link" share). Reuses Present mode so recipients get the full slide deck without
// an account and without an editable copy landing in their library.
export function SharedLessonViewer() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("No presentation was specified.");
      return;
    }
    let active = true;
    getSharedLesson(id)
      .then((l) => active && setLesson(l))
      .catch((e) => active && setError(e?.message || "This presentation could not be found."));
    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="grid h-[100dvh] place-items-center p-6 text-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">Hmm.</h2>
          <p className="mt-2 text-muted">{error}</p>
          <Link
            href="/lessons/"
            className="mt-4 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Back to shared lessons
          </Link>
        </div>
      </div>
    );
  }
  if (!lesson) {
    return <div className="grid h-[100dvh] place-items-center text-sm text-muted">Loading presentation…</div>;
  }
  return <PresentMode lesson={lesson} onClose={() => router.push("/lessons/")} />;
}
