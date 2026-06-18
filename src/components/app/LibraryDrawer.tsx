"use client";

import { X, Presentation, Layers, ClipboardList, Trash2, FolderOpen } from "lucide-react";
import type { Artifact } from "@/lib/types";

const KIND_ICON = {
  lesson: Presentation,
  series: Layers,
  worksheet: ClipboardList,
} as const;

const KIND_LABEL = {
  lesson: "Lesson",
  series: "Unit",
  worksheet: "Worksheet",
} as const;

export function LibraryDrawer({
  open,
  items,
  activeId,
  onClose,
  onOpen,
  onDelete,
}: {
  open: boolean;
  items: Artifact[];
  activeId?: string;
  onClose: () => void;
  onOpen: (a: Artifact) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`fixed inset-0 z-[55] ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-line bg-white transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <FolderOpen size={18} className="text-brand-600" /> My library
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="mt-16 text-center text-sm text-muted">
              <p>Nothing saved yet.</p>
              <p className="mt-1">Everything you generate is saved here automatically.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((a) => {
                const Icon = KIND_ICON[a.kind];
                const active = a.id === activeId;
                return (
                  <li key={a.id}>
                    <div
                      className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                        active ? "border-brand-300 bg-brand-50" : "border-line bg-white hover:border-brand-200"
                      }`}
                    >
                      <button onClick={() => onOpen(a)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper text-brand-700">
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {a.meta.title}
                          </span>
                          <span className="block text-xs text-muted">
                            {KIND_LABEL[a.kind]} · {a.meta.yearGroup}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => onDelete(a.id)}
                        className="shrink-0 rounded-lg p-1.5 text-muted opacity-0 transition-opacity hover:bg-coral/10 hover:text-coral group-hover:opacity-100"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
