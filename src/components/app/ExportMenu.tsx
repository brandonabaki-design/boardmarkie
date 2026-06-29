"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown, FileText, Presentation, Braces, FileType } from "lucide-react";
import type { Artifact } from "@/lib/types";
import {
  downloadJSON,
  exportLessonToPptx,
  exportLessonToDocx,
  exportWorksheetToDocx,
  exportSeriesToDocx,
  printDocument,
} from "@/lib/export";

export function ExportMenu({
  artifact,
  variant = "primary",
  direction = "down",
}: {
  artifact: Artifact;
  variant?: "primary" | "secondary";
  direction?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const btnClass =
    variant === "secondary"
      ? "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
      : "inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700";

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className={btnClass}>
        <Download size={16} /> Export
        <ChevronDown
          size={15}
          className={`transition-transform ${open ? "rotate-180" : ""} ${direction === "up" ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute right-0 z-30 w-60 rounded-2xl border border-line bg-white p-1.5 card-shadow ${
            direction === "up" ? "bottom-full mb-2" : "mt-2"
          }`}
        >
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
          {artifact.kind === "lesson" && (
            <Item
              icon={FileType}
              title="Word (.docx)"
              subtitle="Editable lesson handout"
              onClick={() => {
                exportLessonToDocx(artifact);
                setOpen(false);
              }}
            />
          )}
          {artifact.kind === "worksheet" && (
            <Item
              icon={FileType}
              title="Word (.docx)"
              subtitle="Editable, incl. answer key"
              onClick={() => {
                exportWorksheetToDocx(artifact);
                setOpen(false);
              }}
            />
          )}
          {artifact.kind === "series" && (
            <Item
              icon={FileType}
              title="Word (.docx)"
              subtitle="Editable unit overview"
              onClick={() => {
                exportSeriesToDocx(artifact);
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
