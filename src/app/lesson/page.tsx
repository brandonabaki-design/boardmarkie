import { Suspense } from "react";
import { SharedLessonViewer } from "@/components/app/SharedLessonViewer";

export default function LessonViewerPage() {
  return (
    <Suspense fallback={<div className="grid h-[100dvh] place-items-center text-sm text-muted">Loading…</div>}>
      <SharedLessonViewer />
    </Suspense>
  );
}
