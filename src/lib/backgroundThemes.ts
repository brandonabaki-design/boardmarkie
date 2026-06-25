// Subject background themes — embedded, AISA-watermarked slide backgrounds that
// sit behind lesson content (see public/themes/<id>/ and docs/themes/). Each
// theme ships two variants: "title" (rich cover, used for title slides) and
// "body" (quiet, used for every other slide). Applied at render time alongside
// the colour deck theme (themes.ts), so switching never rebuilds slide content.

import type { Slide } from "./types";
import type { Theme } from "./themes";

// Inlined by next.config (`env`): "" locally, "/boardmarkie" on Pages. Lets this
// client code build correct /public asset URLs under the Pages subpath.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const BG_AUTO = "auto";
export const BG_NONE = "none";

export interface BackgroundTheme {
  id: string;
  label: string;
  ink: string; // default text colour chosen to read on this background
  muted: string; // secondary text colour
  match: RegExp; // matched against the lesson subject for auto-selection
}

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  { id: "science", label: "Science", ink: "#1f3a5f", muted: "#4d6c8a", match: /scien|biolog|chemist|physics/i },
  { id: "maths", label: "Maths", ink: "#243b63", muted: "#566f99", match: /math|algebra|geometr|numerac|calcul|statist/i },
  { id: "english", label: "English", ink: "#4a3527", muted: "#7a6452", match: /english|literac|literat|languag|\bmfl\b|drama|reading|writing/i },
];

export function getBackgroundTheme(id?: string | null): BackgroundTheme | undefined {
  return BACKGROUND_THEMES.find((t) => t.id === id);
}

/** The theme auto-selected from a lesson subject, or null if none matches. */
export function autoBackgroundThemeId(subject?: string): string | null {
  if (!subject) return null;
  return BACKGROUND_THEMES.find((t) => t.match.test(subject))?.id ?? null;
}

type BgLesson = { meta: { subject: string }; backgroundTheme?: string };

/** Resolve the background theme that applies to a lesson, honouring the manual
 *  override: undefined/"auto" → by subject, "none" → off, else an explicit id. */
export function resolveBackgroundTheme(lesson: BgLesson): BackgroundTheme | null {
  const choice = lesson.backgroundTheme;
  if (choice === BG_NONE) return null;
  if (choice && choice !== BG_AUTO) return getBackgroundTheme(choice) ?? null;
  const id = autoBackgroundThemeId(lesson.meta.subject);
  return id ? getBackgroundTheme(id) ?? null : null;
}

export function backgroundVariant(layout: Slide["layout"]): "title" | "body" {
  return layout === "title" ? "title" : "body";
}

export function backgroundImageUrl(themeId: string, variant: "title" | "body"): string {
  return `${BASE}/themes/${themeId}/${themeId}-${variant}.svg`;
}

export interface DeckRender {
  background: string;
  backgroundImage?: string;
  ink: string;
  muted: string;
  displayFont: string;
}

/** Combined render props for a slide: the colour deck theme, with the subject
 *  background image + its text colours layered on when a background theme applies. */
export function deckRender(lesson: BgLesson, slide: Slide, theme: Theme): DeckRender {
  const bg = resolveBackgroundTheme(lesson);
  return {
    background: slide.background ?? theme.bg,
    backgroundImage: bg ? backgroundImageUrl(bg.id, backgroundVariant(slide.layout)) : undefined,
    ink: bg?.ink ?? theme.ink,
    muted: bg?.muted ?? theme.muted,
    displayFont: theme.displayFont,
  };
}
