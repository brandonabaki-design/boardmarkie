// Helpers for the freeform canvas editor: building elements, laying a generated
// slide out onto the canvas, and parsing YouTube links. Coordinates are always
// PERCENTAGES of the 16:9 canvas (0–100). Kept dependency-light on purpose so it
// can be imported anywhere without pulling in the Anthropic SDK.

import type {
  CanvasElement,
  ImageElement,
  ShapeElement,
  Slide,
  TextElement,
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
