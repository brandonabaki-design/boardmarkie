"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown, FileText, Presentation, Braces } from "lucide-react";
import type { Artifact } from "@/lib/types";
import { downloadJSON, exportLessonToPptx, printDocument } from "@/lib/export";

export function ExportMenu({ artifact }: { artifact: Artifact }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        <Download size={16} /> Export
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-2xl border border-line bg-white p-1.5 card-shadow">
          {artifact.kind === "lesson" && (
            <Item
              icon={Presentation}
              title="PowerPoint (.pptx)"
              subtitle="Opens in Slides & Keynote"
              onClick={() => {
                exportLessonToPptx(artifact);
                setOpen(false);
              }}
            />
          )}
          <Item
            icon={FileText}
            title="PDF / Print"
            subtitle="Print-ready document"
            onClick={() => {
              setOpen(false);
              setTimeout(printDocument, 100);
            }}
          />
          <Item
            icon={Braces}
            title="JSON"
            subtitle="Raw content data"
            onClick={() => {
              downloadJSON(artifact);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function Item({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof FileText;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-paper"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
        <Icon size={17} />
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-muted">{subtitle}</span>
      </span>
    </button>
  );
}
