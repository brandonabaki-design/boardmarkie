// Deck themes — a background + default text colour applied across the editor,
// Present mode, thumbnails and exports. Applied at render time (non-destructive),
// so switching a theme never rebuilds or loses slide content. The brand teal
// accent works on every theme.

export interface Theme {
  id: string;
  label: string;
  bg: string; // slide background
  ink: string; // default text colour (chosen for contrast on `bg`)
  muted: string; // secondary text colour
  dark?: boolean;
}

export const THEMES: Theme[] = [
  { id: "classic", label: "Classic", bg: "#ffffff", ink: "#16181d", muted: "#5a6472" },
  { id: "paper", label: "Paper", bg: "#faf6ee", ink: "#2a2620", muted: "#6b6355" },
  { id: "mint", label: "Mint", bg: "#effbf6", ink: "#0f4842", muted: "#3f6b62" },
  { id: "sky", label: "Sky", bg: "#eef6ff", ink: "#13314f", muted: "#4a6488" },
  { id: "sunny", label: "Sunny", bg: "#fff8e7", ink: "#3a2f10", muted: "#7a6a3a" },
  { id: "chalkboard", label: "Chalkboard", bg: "#1f2a2e", ink: "#eef5f3", muted: "#a3b4af", dark: true },
  { id: "midnight", label: "Midnight", bg: "#0f172a", ink: "#e8eef7", muted: "#93a4c0", dark: true },
];

export const DEFAULT_THEME = THEMES[0];

export function getTheme(id?: string): Theme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}
