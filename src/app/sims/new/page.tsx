import { Suspense } from "react";
import { SimEditor } from "@/components/app/SimEditor";

export default function NewSimPage() {
  return (
    <Suspense fallback={<div className="grid h-[100dvh] place-items-center text-sm text-muted">Loading…</div>}>
      <SimEditor />
    </Suspense>
  );
}
