import { Suspense } from "react";
import { CreateApp } from "@/components/app/CreateApp";

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateApp />
    </Suspense>
  );
}
