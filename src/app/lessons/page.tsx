"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, FlaskConical } from "lucide-react";
import { listSharedLessons, type SharedLessonMeta, type SharedLessonFilters } from "@/lib/lessonsLib";
import { GRADE_LEVELS, SUBJECTS } from "@/lib/taxonomy";
import { SharedLessonCard } from "@/components/app/SharedLessonCard";
import { Select } from "@/components/app/ui";

export default function SharedLessonsPage() {
  const [filters, setFilters] = useState<SharedLessonFilters>({ search: "", grade: "", subject: "" });
  const [rows, setRows] = useState<SharedLessonMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const t = setTimeout(() => {
      listSharedLessons(filters)
        .then((data) => active && setRows(data))
        .catch((e) => active && setError(e?.message || "Could not load the shared library."))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [filters]);

  const set = (key: keyof SharedLessonFilters, val: string) => setFilters((f) => ({ ...f, [key]: val }));

  return (
    <div className="min-h-[100dvh] bg-paper">
      <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link href="/create/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft size={16} /> Create
        </Link>
        <span className="font-display text-lg font-extrabold tracking-tight text-ink">Shared lessons</span>
        <Link
          href="/sims/"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
        >
          <FlaskConical size={16} className="text-brand-600" /> EduSim library
        </Link>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 rounded-2xl border border-line bg-white p-5 card-shadow">
          <h1 className="font-display text-xl font-bold text-ink">Lessons shared by all teachers</h1>
          <p className="mt-1 text-sm text-muted">
            Open any lesson to use it as your own starting point — it opens in the editor as a fresh copy you can adapt.
          </p>
        </div>

        <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search by title, topic or description…"
              value={filters.search}
              onChange={(e) => set("search", e.target.value)}
              className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-3.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <Select value={filters.grade} onChange={(e) => set("grade", e.target.value)} aria-label="Grade">
            <option value="">All grades</option>
            {GRADE_LEVELS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
          <Select value={filters.subject} onChange={(e) => set("subject", e.target.value)} aria-label="Subject">
            <option value="">All subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center text-muted">
            No shared lessons yet. Open a lesson and use <strong className="text-ink">Share</strong> to publish the first.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((l) => (
              <SharedLessonCard key={l.id} lesson={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
