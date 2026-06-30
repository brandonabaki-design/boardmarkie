"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  X,
  Presentation,
  Layers,
  ClipboardList,
  Trash2,
  FolderOpen,
  BookOpen,
  FlaskConical,
  ChevronRight,
  Search,
} from "lucide-react";
import type { Artifact } from "@/lib/types";
import { useDialog } from "./useDialog";
import { Select } from "./ui";

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

type SortBy = "recent" | "title";

// Standards only exist on lessons; other kinds report none.
function artifactStandards(a: Artifact): string[] {
  return a.kind === "lesson" ? a.meta.standards ?? [] : [];
}

// Distinct, sorted option list from a value accessor.
function distinct(items: Artifact[], pick: (a: Artifact) => string | undefined): string[] {
  const set = new Set<string>();
  for (const a of items) {
    const v = pick(a)?.trim();
    if (v) set.add(v);
  }
  return [...set].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
}

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
  const dialogRef = useDialog<HTMLElement>(open, onClose);

  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [standard, setStandard] = useState("");
  const [sort, setSort] = useState<SortBy>("recent");

  const grades = useMemo(() => distinct(items, (a) => a.meta.yearGroup), [items]);
  const subjects = useMemo(() => distinct(items, (a) => a.meta.subject), [items]);
  const standards = useMemo(() => {
    const set = new Set<string>();
    for (const a of items) for (const s of artifactStandards(a)) if (s.trim()) set.add(s.trim());
    return [...set].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter((a) => {
      if (grade && a.meta.yearGroup !== grade) return false;
      if (subject && a.meta.subject !== subject) return false;
      if (standard && !artifactStandards(a).includes(standard)) return false;
      if (needle) {
        const hay = `${a.meta.title} ${a.meta.subject ?? ""} ${a.meta.topic ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    list.sort((a, b) =>
      sort === "title"
        ? a.meta.title.localeCompare(b.meta.title)
        : (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
    );
    return list;
  }, [items, q, grade, subject, standard, sort]);

  const anyFilter = Boolean(q || grade || subject || standard);
  const clearFilters = () => {
    setQ("");
    setGrade("");
    setSubject("");
    setStandard("");
  };

  // Hide single-option filters — nothing to choose between.
  const showGrade = grades.length > 1;
  const showSubject = subjects.length > 1;
  const showStandard = standards.length > 1;
  const showControls = items.length > 1;

  return (
    <div className={`fixed inset-0 z-[55] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="My library"
        tabIndex={-1}
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-line bg-white outline-none transition-transform duration-300 ${
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

        {/* Browse the shared libraries (all teachers' work) */}
        <nav className="space-y-1 border-b border-line p-3">
          <Link
            href="/lessons/"
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper text-brand-700">
              <BookOpen size={16} />
            </span>
            Shared lessons
            <ChevronRight size={16} className="ml-auto text-muted" />
          </Link>
          <Link
            href="/sims/"
            onClick={onClose}
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper text-brand-700">
              <FlaskConical size={16} />
            </span>
            EduSim library
            <ChevronRight size={16} className="ml-auto text-muted" />
          </Link>
        </nav>

        {/* Filter + sort the teacher's own work */}
        {showControls && (
          <div className="space-y-2.5 border-b border-line p-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search your work…"
                aria-label="Search your work"
                className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {(showGrade || showSubject) && (
              <div className="grid grid-cols-2 gap-2">
                {showGrade && (
                  <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Filter by grade" className="text-sm">
                    <option value="">All grades</option>
                    {grades.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                )}
                {showSubject && (
                  <Select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    aria-label="Filter by subject"
                    className="text-sm"
                  >
                    <option value="">All subjects</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            )}

            {showStandard && (
              <Select
                value={standard}
                onChange={(e) => setStandard(e.target.value)}
                aria-label="Filter by standard"
                className="text-sm"
              >
                <option value="">All standards</option>
                {standards.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">
                {filtered.length} of {items.length}
                {anyFilter && (
                  <button onClick={clearFilters} className="ml-2 font-semibold text-brand-700 hover:underline">
                    Clear
                  </button>
                )}
              </span>
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortBy)}
                aria-label="Sort"
                className="w-auto text-sm"
              >
                <option value="recent">Recent</option>
                <option value="title">Title A–Z</option>
              </Select>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-muted">Your work</p>
          {items.length === 0 ? (
            <div className="mt-16 text-center text-sm text-muted">
              <p>Nothing saved yet.</p>
              <p className="mt-1">Everything you generate is saved here automatically.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-16 text-center text-sm text-muted">
              <p>No matches.</p>
              <button onClick={clearFilters} className="mt-1 font-semibold text-brand-700 hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((a) => {
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
                          <span className="block truncate text-xs text-muted">
                            {KIND_LABEL[a.kind]} · {a.meta.yearGroup}
                            {a.meta.subject ? ` · ${a.meta.subject}` : ""}
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
