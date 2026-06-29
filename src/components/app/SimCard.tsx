"use client";

import Link from "next/link";
import type { Simulation } from "@/lib/sims";
import { Stars } from "./Stars";

export function SimCard({ sim, authorName }: { sim: Simulation; authorName?: string }) {
  return (
    <Link
      href={`/sim/?id=${sim.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-300 card-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-bold leading-snug text-ink">{sim.title}</h3>
        <Stars value={Number(sim.avg_rating) || 0} count={sim.rating_count} size={14} />
      </div>
      {sim.description && <p className="line-clamp-2 text-sm text-muted">{sim.description}</p>}
      <div className="flex flex-wrap gap-1.5">
        {sim.grade_level && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            {sim.grade_level}
          </span>
        )}
        {sim.subject && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            {sim.subject}
          </span>
        )}
        {(sim.concepts || []).slice(0, 3).map((c) => (
          <span key={c} className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
            {c}
          </span>
        ))}
      </div>
      {(sim.standards || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted">
          <span className="font-semibold uppercase tracking-wide">Standards:</span>
          {(sim.standards || []).slice(0, 2).map((s) => (
            <span key={s} className="rounded bg-paper px-1.5 py-0.5 font-medium">
              {s}
            </span>
          ))}
          {(sim.standards || []).length > 2 && <span>+{(sim.standards || []).length - 2}</span>}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted">
        <span>{authorName || "A teacher"}</span>
        <span>{sim.view_count || 0} views</span>
      </div>
    </Link>
  );
}
