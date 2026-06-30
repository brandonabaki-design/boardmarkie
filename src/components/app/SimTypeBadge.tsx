"use client";

import { FlaskConical, Gamepad2, Map, ClipboardCheck } from "lucide-react";
import { simTypeMeta, type SimType } from "@/lib/simTypes";

const ICON: Record<SimType, typeof FlaskConical> = {
  simulation: FlaskConical,
  game: Gamepad2,
  adventure: Map,
  worksheet: ClipboardCheck,
};

/** Coloured pill showing a simulation's kind (Simulation / Game / Adventure / Worksheet). */
export function SimTypeBadge({ type, size = "sm" }: { type: string | null | undefined; size?: "sm" | "xs" }) {
  const meta = simTypeMeta(type);
  const Icon = ICON[meta.id];
  const pad = size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${meta.badge} ${pad}`}>
      <Icon size={size === "xs" ? 11 : 12} /> {meta.short}
    </span>
  );
}
