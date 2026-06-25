# Image-generation prompts (Nano Banana / Gemini Image)

Use these to generate **Layer A only** (the decorative artwork). They deliberately
forbid text and logos — Layer B (AISA logo + fine print) is composited afterward
with the shared overlay template so it's pixel-identical across every theme.

> Workflow: generate art → drop it under the overlay template
> (`public/themes/_branding/overlay-template.svg`) → export as the final
> `…-title` / `…-body` asset. See `THEME_SYSTEM_PROMPT.md` for the full spec.

Replace `{{SUBJECT}}`, `{{MOTIFS}}`, and `{{PALETTE}}` per subject (defaults shown
filled in for science).

---

## Shared system preamble (paste as the system / style instruction)

```
You generate decorative slide BACKGROUND artwork for a school lesson app.
Hard rules:
- Output is EXACTLY 16:9, 2560x1440.
- Soft, airy, professional, modern-educational. Light background with a gentle
  diagonal gradient. Decoration is a quiet ACCENT, with lots of empty breathing room.
- ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO LOGOS, NO WATERMARKS of any kind.
- No people/faces, no heavy shadows, no busy textures, no full-bleed saturation,
  no borders/frames.
- Leave the specified safe areas visually EMPTY (near-flat background) so lesson
  text and images can sit on top and stay readable.
```

---

## TITLE / COVER variant

```
A 16:9 {{SUBJECT}} lesson TITLE background.
Palette: {{PALETTE}}.
Motifs (tasteful, semi-transparent accents): {{MOTIFS}}.
Composition:
- Keep the TOP 25% of the frame airy and nearly empty (a slide title goes there).
- Place the artwork in the lower 60% and along the left, right, and bottom edges.
- One soft light bloom is allowed, center-right.
- Balanced, premium, calm. No text, no logo.
```

**Science (filled in):**
```
A 16:9 science lesson TITLE background.
Palette: soft sky-blue to pale teal gradient, with blue and warm-gold accents.
Motifs (tasteful, semi-transparent accents): orbiting atoms with glossy nuclei
linked into a faint molecular network, a stylized DNA double helix down the right
edge, a translucent dotted globe (centered on the Eastern Hemisphere — Middle East /
Africa / Asia), and a few delicate line-icons (microscope, telescope, flask, ringed
planet) along the bottom.
Composition:
- Keep the TOP 25% of the frame airy and nearly empty.
- Artwork in the lower 60% and along the left/right/bottom edges; one soft bloom center-right.
No text, no logo.
```

---

## CONTENT / BODY variant

```
A 16:9 {{SUBJECT}} lesson CONTENT background — VERY MINIMAL.
Palette: {{PALETTE}}, but lighter and quieter than the title variant.
Motifs: the same {{MOTIFS}}, but FAINT (about 10-15% opacity) and pushed into the
four corners and the extreme left/right/bottom edges ONLY.
Composition:
- The center and the left two-thirds must read as near-empty paper (lesson text
  and images sit there).
- Keep the top band and the upper-right area clear.
- Think "subtle stationery," not "poster." No text, no logo.
```

**Science (filled in):**
```
A 16:9 science lesson CONTENT background — VERY MINIMAL.
Palette: soft sky-blue/teal, light and quiet.
Motifs: faint atoms in the corners (~12% opacity), a thin faint DNA helix hugging
the far-right edge, and a faint molecular line-and-node motif along the very bottom.
Composition:
- Center and left two-thirds = near-empty paper. Top band and upper-right clear.
Subtle stationery look. No text, no logo.
```

---

## After generating

1. Confirm it passes the checklist in `THEME_SYSTEM_PROMPT.md` §6.
2. Composite the branding overlay (logo top-right + fine print bottom-left).
3. Export to `public/themes/<subject>/<subject>-title.webp` and `-body.webp`,
   under ~400 KB each.
