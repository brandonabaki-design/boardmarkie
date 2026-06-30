// Helpers for the freeform canvas editor: building elements, laying a generated
// slide out onto the canvas, and parsing YouTube links. Coordinates are always
// PERCENTAGES of the 16:9 canvas (0–100). Kept dependency-light on purpose so it
// can be imported anywhere without pulling in the Anthropic SDK.

import type {
  AudioElement,
  CanvasElement,
  ImageElement,
  QuizQuestion,
  ShapeElement,
  Slide,
  TextElement,
  VideoElement,
  VocabItem,
  YoutubeElement,
} from "./types";

export const INK = "#16181d";
export const MUTED = "#5a6472";
export const CANVAS_ASPECT = 16 / 9;

let counter = 0;
/** Short unique id for a canvas element (local, no heavy imports). */
export function cid(prefix = "el"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---- element builders ----

export function textElement(p: Partial<TextElement> & Pick<TextElement, "x" | "y" | "w" | "h">): TextElement {
  return {
    id: cid("tx"),
    type: "text",
    z: p.z ?? 1,
    text: p.text ?? "",
    fontSize: p.fontSize ?? 4,
    bold: p.bold,
    italic: p.italic,
    align: p.align ?? "left",
    color: p.color ?? INK,
    font: p.font ?? "body",
    bg: p.bg,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
  };
}

export function imageElement(p: Partial<ImageElement> & Pick<ImageElement, "x" | "y" | "w" | "h">): ImageElement {
  return {
    id: cid("img"),
    type: "image",
    z: p.z ?? 1,
    src: p.src,
    svg: p.svg,
    alt: p.alt,
    radius: p.radius ?? 4,
    opacity: p.opacity ?? 100,
    eduSimUrl: p.eduSimUrl,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
  };
}

export function shapeElement(p: Partial<ShapeElement> & Pick<ShapeElement, "x" | "y" | "w" | "h">): ShapeElement {
  return {
    id: cid("sh"),
    type: "shape",
    z: p.z ?? 1,
    shape: p.shape ?? "rect",
    fill: p.fill ?? "#d2f6ec",
    opacity: p.opacity ?? 100,
    radius: p.radius,
    stroke: p.stroke,
    strokeWidth: p.strokeWidth,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
  };
}

export function youtubeElement(
  p: Partial<YoutubeElement> & Pick<YoutubeElement, "videoId" | "x" | "y" | "w" | "h">,
): YoutubeElement {
  return {
    id: cid("yt"),
    type: "youtube",
    z: p.z ?? 1,
    videoId: p.videoId,
    title: p.title,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
  };
}

export function audioElement(
  p: Partial<AudioElement> & Pick<AudioElement, "src" | "x" | "y" | "w" | "h">,
): AudioElement {
  return {
    id: cid("au"),
    type: "audio",
    z: p.z ?? 1,
    src: p.src,
    title: p.title,
    artworkSvg: p.artworkSvg,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
  };
}

export function videoElement(
  p: Partial<VideoElement> & Pick<VideoElement, "src" | "x" | "y" | "w" | "h">,
): VideoElement {
  return {
    id: cid("vid"),
    type: "video",
    z: p.z ?? 1,
    src: p.src,
    title: p.title,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
  };
}

/** Next z-index above everything currently on the slide. */
export function topZ(els: CanvasElement[]): number {
  return els.reduce((m, e) => Math.max(m, e.z), 0) + 1;
}

// ---- YouTube link parsing ----

/** Extract a YouTube video id from a URL or bare id; null if it isn't one. */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s; // already a bare id
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1, 12);
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    /* not a URL */
  }
  return null;
}

// ---- EduSim link parsing ----

/**
 * Validate/normalise a pasted EduSim (simulation) link so it can be encoded into
 * a QR code. Accepts a full URL or a bare host/path; returns the canonical URL
 * string, or null if it isn't a usable http(s) link.
 */
export function normalizeEduSimUrl(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

// ---- auto-layout: turn a generated/template slide into canvas elements ----

function bodyText(slide: Slide): string {
  const lines: string[] = [];
  if (slide.body) lines.push(slide.body);
  for (const b of slide.bullets ?? []) lines.push(`•  ${b}`);
  for (const v of slide.vocabulary ?? []) lines.push(`**${v.term}:** ${v.definition}`);
  if (slide.activity) {
    lines.push(`**${slide.activity.title || "Activity"}**`);
    if (slide.activity.instructions) lines.push(slide.activity.instructions);
  }
  for (const q of slide.discussionQuestions ?? []) lines.push(`•  ${q}`);
  for (const q of slide.quiz ?? []) {
    lines.push(`**${q.question}**`);
    (q.options ?? []).forEach((o, i) => lines.push(`    ${String.fromCharCode(97 + i)})  ${o}`));
  }
  return lines.join("\n");
}

const ACCENT = "#14a892"; // brand-500
const CARD_BORDER = "#c9d3e0"; // neutral outline that reads on light & dark themes

// ---- purpose templates: distinct layouts per slide type ----

// "Key words" grid — each term in its own outlined card (transparent fill so the
// deck theme shows through; text stays themed via the ink/muted sentinels).
function vocabCards(items: VocabItem[], top: number): CanvasElement[] {
  const out: CanvasElement[] = [];
  let z = 5;
  const n = Math.min(items.length, 6);
  const cols = n <= 1 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  const gap = 3;
  const regionH = 94 - top;
  const cellW = (88 - gap * (cols - 1)) / cols;
  const cellH = (regionH - gap * (rows - 1)) / rows;
  const padX = 2.6;

  items.slice(0, n).forEach((v, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 6 + col * (cellW + gap);
    const y = top + row * (cellH + gap);
    out.push(
      shapeElement({ x, y, w: cellW, h: cellH, z: z++, shape: "rect", fill: "transparent", stroke: CARD_BORDER, strokeWidth: 0.3, radius: 2 }),
    );
    const termH = Math.min(cellH * 0.4, 7);
    out.push(
      textElement({
        text: v.term,
        x: x + padX,
        y: y + cellH * 0.1,
        w: cellW - padX * 2,
        h: termH,
        fontSize: fitFontSize(v.term, cellW - padX * 2, termH, 3.6, 2),
        bold: true,
        font: "display",
        z: z++,
      }),
    );
    const defY = y + cellH * 0.1 + termH;
    const defH = cellH - (defY - y) - cellH * 0.08;
    out.push(
      textElement({
        text: v.definition,
        x: x + padX,
        y: defY,
        w: cellW - padX * 2,
        h: defH,
        fontSize: fitFontSize(v.definition, cellW - padX * 2, defH, 2.8, 1.5),
        color: MUTED,
        z: z++,
      }),
    );
  });
  return out;
}

// "Quick check" — one question with each option in its own outlined box.
function quizCard(q: QuizQuestion, top: number): CanvasElement[] {
  const out: CanvasElement[] = [];
  let z = 5;
  const qH = 13;
  out.push(
    textElement({
      text: q.question,
      x: 6,
      y: top,
      w: 88,
      h: qH,
      fontSize: fitFontSize(q.question, 88, qH, 3.6, 2.2),
      bold: true,
      z: z++,
    }),
  );
  const opts = q.options.slice(0, 5);
  const startY = top + qH + 2;
  const gap = 2.5;
  const rowH = Math.min(11, (94 - startY - gap * (opts.length - 1)) / opts.length);
  opts.forEach((o, i) => {
    const y = startY + i * (rowH + gap);
    out.push(
      shapeElement({ x: 6, y, w: 88, h: rowH, z: z++, shape: "rect", fill: "transparent", stroke: CARD_BORDER, strokeWidth: 0.3, radius: 1.6 }),
    );
    out.push(
      textElement({
        text: `${String.fromCharCode(65 + i)})  ${o}`,
        x: 9,
        y: y + rowH * 0.22,
        w: 82,
        h: rowH * 0.7,
        fontSize: fitFontSize(o, 82, rowH * 0.7, 3.2, 1.8),
        z: z++,
      }),
    );
  });
  return out;
}

/** A slide's visual: an image/diagram from its own fields, or one supplied
 *  directly (e.g. a just-resolved YouTube video) by the generation pipeline. */
export type SlideVisual =
  | { kind: "image"; src: string; alt?: string }
  | { kind: "svg"; svg: string; alt?: string }
  | { kind: "youtube"; videoId: string; title?: string };

function readVisual(slide: Slide): SlideVisual | null {
  if (slide.imageUrl) return { kind: "image", src: slide.imageUrl, alt: slide.imageAlt || slide.imagePrompt };
  if (slide.diagramSvg) return { kind: "svg", svg: slide.diagramSvg, alt: slide.imageAlt };
  return null;
}

type Box = { x: number; y: number; w: number; h: number; z: number };

function visualElementFrom(v: SlideVisual, box: Box): CanvasElement {
  if (v.kind === "image") return imageElement({ ...box, src: v.src, alt: v.alt });
  if (v.kind === "svg") return imageElement({ ...box, svg: v.svg, alt: v.alt });
  return youtubeElement({ ...box, videoId: v.videoId, title: v.title });
}

/**
 * Pick the largest font size (in cqh = % of canvas height) at which `text` fits
 * inside a box of the given width/height (percent of the 16:9 canvas), so slide
 * content never overflows or gets clipped. Approximate but conservative.
 */
export function fitFontSize(text: string, wPct: number, hPct: number, max = 4, min = 1.7): number {
  const W = Math.max(4, wPct - 4); // allow for padding
  const H = Math.max(4, hPct - 4);
  const lines = text.split("\n");
  for (let f = max; f >= min; f -= 0.1) {
    const charsPerLine = Math.max(1, Math.floor(W / (0.32 * f)));
    let rows = 0;
    for (const ln of lines) {
      const len = ln.replace(/\*/g, "").trim().length || 1; // ignore markdown markers
      rows += Math.max(1, Math.ceil(len / charsPerLine));
    }
    if (rows * (1.35 * f) <= H) return Math.round(f * 10) / 10;
  }
  return min;
}

/**
 * Build a clean, non-overflowing layout for a slide. An optional `extraVisual`
 * (e.g. a just-resolved YouTube video) fills the visual slot. This is recomputed
 * whenever a slide's visual changes, so text is always sized for its real box —
 * the title never gets squeezed into a narrow column after the fact.
 */
export function slideToElements(slide: Slide, extraVisual?: SlideVisual): CanvasElement[] {
  const els: CanvasElement[] = [];
  let z = 1;
  const visual = readVisual(slide) ?? extraVisual ?? null;
  const title = slide.title || "Title";

  if (slide.layout === "title") {
    if (visual) {
      // Title block on the left, hero visual on the right.
      els.push(shapeElement({ x: 6, y: 27, w: 9, h: 1.4, z: z++, shape: "rect", fill: ACCENT }));
      els.push(
        textElement({
          text: title,
          x: 6,
          y: 31,
          w: 45,
          h: 26,
          fontSize: fitFontSize(title, 45, 26, 7.5, 4),
          bold: true,
          font: "display",
          z: z++,
        }),
      );
      if (slide.subtitle) {
        els.push(
          textElement({
            text: slide.subtitle,
            x: 6,
            y: 59,
            w: 45,
            h: 14,
            fontSize: fitFontSize(slide.subtitle, 45, 14, 4, 2.4),
            color: MUTED,
            z: z++,
          }),
        );
      }
      els.push(visualElementFrom(visual, { x: 52, y: 28, w: 42, h: 42, z: z++ }));
    } else {
      els.push(
        textElement({
          text: title,
          x: 8,
          y: 30,
          w: 84,
          h: 24,
          fontSize: fitFontSize(title, 84, 24, 9, 4),
          bold: true,
          align: "center",
          font: "display",
          z: z++,
        }),
      );
      if (slide.subtitle) {
        els.push(
          textElement({
            text: slide.subtitle,
            x: 12,
            y: 56,
            w: 76,
            h: 12,
            fontSize: fitFontSize(slide.subtitle, 76, 12, 4.4, 2.4),
            align: "center",
            color: MUTED,
            z: z++,
          }),
        );
      }
    }
    return els;
  }

  // Content slide — the title always spans the full width across the top.
  els.push(
    textElement({
      text: title,
      x: 6,
      y: 5,
      w: 88,
      h: 14,
      fontSize: fitFontSize(title, 88, 14, 6, 3.2),
      bold: true,
      font: "display",
      z: z++,
    }),
  );
  let top = 21;
  if (slide.subtitle) {
    els.push(
      textElement({
        text: slide.subtitle,
        x: 6,
        y: 19,
        w: 88,
        h: 7,
        fontSize: fitFontSize(slide.subtitle, 88, 7, 3.4, 2.2),
        color: MUTED,
        z: z++,
      }),
    );
    top = 28;
  }

  // Purpose templates (only when no slide-level visual would be displaced).
  if (!visual && slide.layout === "vocabulary" && slide.vocabulary?.length) {
    for (const e of vocabCards(slide.vocabulary, top)) els.push(e);
    return els;
  }
  if (!visual && slide.layout === "quiz" && slide.quiz?.length === 1 && (slide.quiz[0].options?.length ?? 0) >= 2) {
    for (const e of quizCard(slide.quiz[0], top)) els.push(e);
    return els;
  }

  const body = bodyText(slide);
  const h = 94 - top;
  if (visual) {
    if (body) {
      els.push(textElement({ text: body, x: 6, y: top, w: 48, h, fontSize: fitFontSize(body, 48, h, 3.4, 1.7), z: z++ }));
    }
    // Square %-box ≈ 16:9 real aspect, so a generated 16:9 image fills it exactly.
    const vh = Math.min(37, h);
    els.push(visualElementFrom(visual, { x: 57, y: top + (h - vh) / 2, w: 37, h: vh, z: z++ }));
  } else if (body) {
    const lines = body.split("\n");
    const dense = lines.length > 6 || body.length > 360;
    if (dense) {
      // Two balanced columns use the horizontal space and avoid a tall, clipped block.
      const mid = Math.ceil(lines.length / 2);
      const left = lines.slice(0, mid).join("\n");
      const right = lines.slice(mid).join("\n");
      const f = Math.min(fitFontSize(left, 42, h, 3.4, 1.7), fitFontSize(right, 42, h, 3.4, 1.7));
      els.push(textElement({ text: left, x: 6, y: top, w: 42, h, fontSize: f, z: z++ }));
      els.push(textElement({ text: right, x: 52, y: top, w: 42, h, fontSize: f, z: z++ }));
    } else {
      els.push(textElement({ text: body, x: 6, y: top, w: 88, h, fontSize: fitFontSize(body, 88, h, 3.8, 1.8), z: z++ }));
    }
  }

  return els;
}

/** Ensure a slide carries a canvas layout (seed one from its content if absent). */
export function ensureElements(slide: Slide): Slide {
  if (slide.elements && slide.elements.length) return slide;
  return { ...slide, elements: slideToElements(slide) };
}
