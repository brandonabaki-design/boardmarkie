// The kinds of interactive resource a teacher can build with EduSim. Each type
// gets a tailored "build directive" prepended to the lesson text sent to the
// AISA EduSim gem, and is stored on the simulation so the library can badge and
// filter by it. Framework-light (no JSX): components map `icon` → a lucide icon.

export type SimType = "simulation" | "game" | "adventure" | "worksheet";

export interface SimTypeMeta {
  id: SimType;
  label: string; // full label (menus)
  short: string; // compact label (badges)
  description: string;
  icon: string; // lucide icon name, resolved in components
  badge: string; // tailwind classes for the pill
}

export const SIM_TYPES: SimTypeMeta[] = [
  {
    id: "simulation",
    label: "Simulation",
    short: "Simulation",
    description: "A hands-on model students manipulate to explore a concept.",
    icon: "FlaskConical",
    badge: "bg-brand-50 text-brand-700",
  },
  {
    id: "game",
    label: "Game",
    short: "Game",
    description: "A play-to-learn challenge with a goal, scoring and instant feedback.",
    icon: "Gamepad2",
    badge: "bg-violet-50 text-violet-700",
  },
  {
    id: "adventure",
    label: "Choose your own adventure",
    short: "Adventure",
    description: "A branching story where student decisions lead to different outcomes.",
    icon: "Map",
    badge: "bg-rose-50 text-rose-700",
  },
  {
    id: "worksheet",
    label: "Interactive worksheet",
    short: "Worksheet",
    description: "On-screen questions and tasks with hints, checking and a score.",
    icon: "ClipboardCheck",
    badge: "bg-sky-50 text-sky-700",
  },
];

export const DEFAULT_SIM_TYPE: SimType = "simulation";

const BY_ID = Object.fromEntries(SIM_TYPES.map((t) => [t.id, t])) as Record<SimType, SimTypeMeta>;

export function simTypeMeta(id: string | null | undefined): SimTypeMeta {
  return BY_ID[id as SimType] ?? BY_ID[DEFAULT_SIM_TYPE];
}

export function normalizeSimType(v: string | null | undefined): SimType {
  return BY_ID[v as SimType] ? (v as SimType) : DEFAULT_SIM_TYPE;
}

/**
 * Instruction prepended to the lesson text the EduSim gem receives, so it codes
 * the kind of artifact the teacher chose. All types output a single self-
 * contained HTML file (it's pasted into a sandboxed iframe).
 */
export function simBuildDirective(id: SimType): string {
  const map: Record<SimType, string> = {
    simulation:
      "BUILD TYPE: INTERACTIVE SIMULATION. Code a hands-on, single-file HTML simulation students " +
      "manipulate to explore the concept — sliders, controls and buttons with live visual feedback so " +
      "cause and effect are visible as they experiment.",
    game:
      "BUILD TYPE: EDUCATIONAL GAME. Code a single-file HTML game that teaches the concept through play — " +
      "a clear goal, simple rules, scoring and/or levels, win/lose states, and instant feedback that " +
      "rewards correct understanding.",
    adventure:
      "BUILD TYPE: CHOOSE-YOUR-OWN-ADVENTURE. Code a single-file HTML branching story where students make " +
      "decisions at each step that lead to different paths and endings, with the choices and consequences " +
      "reinforcing the concept and its key vocabulary.",
    worksheet:
      "BUILD TYPE: INTERACTIVE WORKSHEET. Code a single-file HTML worksheet of on-screen questions and tasks " +
      "(multiple choice, short answer, drag-or-match where useful) with hints, instant checking and a final " +
      "score students can complete independently.",
  };
  return map[id];
}
