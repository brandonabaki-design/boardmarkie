"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, ClipboardCheck, X } from "lucide-react";
import { listSimulations, getAuthorNames, type Simulation, type SimFilters } from "@/lib/sims";
import { GRADE_LEVELS, SUBJECTS } from "@/lib/taxonomy";
import { SimCard } from "@/components/app/SimCard";
import { AppHeader } from "@/components/app/AppHeader";
import { Select } from "@/components/app/ui";

export default function SimsLibraryPage() {
  const [filters, setFilters] = useState<SimFilters>({ search: "", grade: "", subject: "", sort: "created_at" });
  const [sims, setSims] = useState<Simulation[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Standards filter is applied client-side (free-text, substring) so teachers
  // can find every activity aligned to a standard. Seeded from ?standard= so
  // clicking a standard anywhere deep-links here.
  const [standard, setStandard] = useState("");

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("standard");
    if (s) setStandard(s);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const t = setTimeout(() => {
      listSimulations(filters)
        .then(async (rows) => {
          if (!active) return;
          setSims(rows);
          setAuthors(await getAuthorNames(rows.map((r) => r.author_id)));
        })
        .catch((e) => active && setError(e?.message || "Could not load the library."))
        .finally(() => active && setLoading(false));
    }, 250); // debounce search typing
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [filters]);

  const set = (key: keyof SimFilters, val: string) => setFilters((f) => ({ ...f, [key]: val }));

  const std = standard.trim().toLowerCase();
  const shown = std
    ? sims.filter((s) => (s.standards || []).some((x) => x.toLowerCase().includes(std)))
    : sims;

  return (
    <div className="min-h-[100dvh] bg-paper">
      <AppHeader>
        <Link
          href="/sims/new/"
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Add a simulation</span>
        </Link>
      </AppHeader>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 rounded-2xl border border-line bg-white p-5 card-shadow">
          <h1 className="font-display text-xl font-bold text-ink">Interactive simulations, made by teachers</h1>
          <p className="mt-1 text-sm text-muted">
            Every simulation is shared with all teachers. Open one, then embed its QR on a slide or share the link with
            students.
          </p>
        </div>

        <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search by title or description…"
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
          <Select value={filters.sort} onChange={(e) => set("sort", e.target.value)} aria-label="Sort">
            <option value="created_at">Newest</option>
            <option value="rating">Top rated</option>
            <option value="views">Most viewed</option>
          </Select>
        </div>

        <div className="relative mb-5 max-w-md">
          <ClipboardCheck size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Find by standard (e.g. NGSS MS-LS1-6)"
            value={standard}
            onChange={(e) => setStandard(e.target.value)}
            className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-9 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          {standard && (
            <button
              onClick={() => setStandard("")}
              aria-label="Clear standard filter"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-muted">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white py-16 text-center">
            <p className="text-muted">{std ? "No simulations match that standard." : "No simulations match yet."}</p>
            <Link
              href="/sims/new/"
              className="mt-3 inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Be the first to add one
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((sim) => (
              <SimCard key={sim.id} sim={sim} authorName={authors[sim.author_id]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
