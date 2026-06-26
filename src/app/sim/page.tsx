import { Suspense } from "react";
import { SimViewer } from "@/components/app/SimViewer";

export default function SimPage() {
  return (
    <Suspense fallback={<div className="grid h-[100dvh] place-items-center text-sm text-muted">Loading…</div>}>
      <SimViewer />
    </Suspense>
  );
}
