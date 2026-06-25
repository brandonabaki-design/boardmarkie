# Boardmarkie Theme System — Master Spec & System Prompt

This is the single source of truth every embedded theme must satisfy. It doubles
as (a) a **system prompt** you can paste into an image model (Nano Banana / Gemini
Image, etc.) and (b) a **design brief** for a human in Figma/Illustrator.

The goal: per-subject decorative backgrounds (science, English, history, …) that
make generated lessons look premium **without ever fighting the lesson content**,
and that carry a **constant AISA branding layer** so they can't be quietly reused
by other schools or for personal projects.

---

## 0. The two-layer model (read this first)

Every theme is built from two layers:

- **Layer A — Decoration (varies per subject).** The pretty artwork (atoms/DNA for
  science, books/quills for English, columns/maps for history…). This is the only
  part that changes between subjects.
- **Layer B — Branding (IDENTICAL on every theme).** The AISA logo + school fine
  print, at fixed coordinates, byte-for-byte the same on every theme and every
  variant. This is what keeps slide arrangement consistent and makes the asset
  hard to repurpose.

> **Never let an image model render Layer B.** Image generators corrupt small text
> and logos and will not place them identically across themes. Layer B is always
> composited deterministically (real logo file + real font), either in code or
> with the shared overlay template (`public/themes/_branding/overlay-template.svg`).

---

## 1. Hard constraints (non-negotiable)

| Constraint | Value |
|---|---|
| Aspect ratio | **Exactly 16:9** (the canvas is locked to 16/9; off-ratio art gets stretched/cropped) |
| Master resolution | **1920×1080 min, 2560×1440 preferred** for crisp 4K projectors |
| Coordinate system | Reason in **percentages** — the app positions everything as % of a 16:9 frame |
| File format | **SVG** (preferred: tiny, crisp, recolorable) or **WebP** (for photographic art) |
| File size | **< ~400 KB** per asset (backgrounds get embedded into PowerPoint exports) |
| Storage | Ship as static files in `public/themes/<subject>/…`, referenced via base path — **never** base64-baked into saved lessons (keeps Firestore sync under its 1 MB cap) |

---

## 2. Two variants per subject

Each subject needs **two** background files, because the app fills almost the whole
frame with content:

### `…-title.svg` — Title / cover variant
- Used for: title, section divider, and plenary slides.
- Richer artwork allowed.
- **Must keep the top band airy** (`y 0–24%`, full width): the app drops the slide
  title there. No high-contrast art behind that band.
- Decoration lives in the lower 60% and along the side/bottom edges.

### `…-body.svg` — Content / body variant
- Used for: every content, objectives, vocab, activity, discussion, quiz slide.
- **Quiet.** Decoration is faint (opacity ≤ ~0.15) and pushed to the outer frame
  (corners + extreme edges only).
- **Must keep a large clean safe area** for content (see §3). The center must read
  like near-empty paper.

---

## 3. Safe zones (where content lands — keep these clear)

Coordinates as % of the 16:9 frame. The app's auto-layout places content here, so
decoration must stay faint or absent in these regions:

| Zone | Box (x, y, w, h) | Rule |
|---|---|---|
| Title band | `6%, 5%, 74%, 19%` | Keep clear on **both** variants (title shrunk to ~74% wide so it never hits the logo) |
| Body column | `6%, 26%, 48%, 68%` | Keep clear on **body** variant |
| Visual/image zone | `57%, 26%, 37%, 50%` | Keep clear on **body** variant (generated images land here) |
| Logo reserve | `87%, 4%, 10%, 8%` | **Reserved for branding on every theme** — no decoration |
| Fine-print reserve | `6%, 94%, 70%, 5%` | **Reserved for branding on every theme** — no decoration |

Decoration is encouraged **outside** these boxes: far-left edge, far-right edge,
bottom strip, and the four corners.

---

## 4. Branding layer (constant — identical everywhere)

These never move between themes or variants:

- **AISA logo** — top-right, inside box `x 87–97%, y 4–12%`, on a subtle frosted
  white chip so it stays legible on any palette (light *or* dark themes).
- **School fine print** — bottom-left, baseline at `y ≈ 96%`, starting at `x = 6%`:
  > `American International School in Abu Dhabi  ·  For AISA classroom use only`
  Small, muted, single line.

Branding lives on **opposite corners** on purpose: cropping out both while keeping
a clean 16:9 is hard, which is the anti-reuse point.

**Anti-reuse:** bake Layer B into the final asset (don't add it as a separate,
deletable slide element). Baked-in branding survives PowerPoint **and** PDF/print
export and can't be deleted without removing the whole background.

---

## 5. Style guidelines (per subject)

Keep the same *system* (soft, airy, professional, light background, decorations as
quiet accents) and vary only the palette + motifs:

| Subject | Palette | Motifs |
|---|---|---|
| **Science** | soft sky-blue → teal; blue + warm-gold accents | atoms, molecular networks, DNA helix, dotted globe, microscope/telescope/flask line-icons |
| English | warm cream → soft rose | books, open pages, quill, ink swirls, speech marks |
| History | parchment → muted gold | columns, scrolls, old maps, compass, timeline |
| Maths | cool grey-blue | grid, geometric shapes, graphs, π/Σ glyphs, rulers |
| Geography | sage green → ocean blue | contour lines, globe, mountains, compass rose |

Universal style rules:
- Light background (dark text must read). Use a gentle diagonal gradient.
- Decoration is **accent, not subject** — think faint, tasteful, lots of breathing room.
- One light "bloom"/glow is fine; avoid heavy shadows, busy textures, or full-bleed saturation.
- No stocky clip-art look; no photographic faces/people; no third-party logos or
  watermarks other than AISA.

---

## 6. Validation checklist (every asset must pass)

- [ ] Exactly 16:9, ≥ 1920×1080, < ~400 KB.
- [ ] Title band (`6,5,74,19`) clear of high-contrast art (both variants).
- [ ] Body variant: body column + image zone read as near-empty; decoration ≤ ~0.15 opacity.
- [ ] Logo present, top-right in the reserved box, legible on this palette.
- [ ] Fine print present, bottom-left, correct school wording, legible.
- [ ] Logo + fine print in the **exact same pixels** as every other theme.
- [ ] Text/logo are sharp vectors or composited — **not** AI-rendered.
- [ ] Dark text sample placed over the title band and body column is readable.
