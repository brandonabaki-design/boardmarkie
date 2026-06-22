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
  for (const v of slide.vocabulary ?? []) lines.push(`${v.term}: ${v.definition}`);
  if (slide.activity) {
    lines.push(slide.activity.title || "Activity");
    if (slide.activity.instructions) lines.push(slide.activity.instructions);
  }
  for (const q of slide.discussionQuestions ?? []) lines.push(`•  ${q}`);
  for (const q of slide.quiz ?? []) {
    lines.push(q.question);
    (q.options ?? []).forEach((o, i) => lines.push(`    ${String.fromCharCode(97 + i)})  ${o}`));
  }
  return lines.join("\n");
}

function hasVisual(slide: Slide): boolean {
  return !!(slide.imageUrl || slide.diagramSvg);
}

function visualElement(slide: Slide, box: { x: number; y: number; w: number; h: number; z: number }): ImageElement {
  return imageElement({
    ...box,
    src: slide.imageUrl,
    svg: slide.imageUrl ? undefined : slide.diagramSvg,
    alt: slide.imageAlt || slide.imagePrompt,
  });
}

/** Build a sensible canvas layout from a generated/template slide. */
export function slideToElements(slide: Slide): CanvasElement[] {
  const els: CanvasElement[] = [];
  let z = 1;
  const visual = hasVisual(slide);

  if (slide.layout === "title") {
    els.push(
      textElement({
        text: slide.title || "Title",
        x: 8,
        y: 30,
        w: 84,
        h: 24,
        fontSize: 9,
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
          x: 14,
          y: 56,
          w: 72,
          h: 12,
          fontSize: 4.4,
          align: "center",
          color: MUTED,
          z: z++,
        }),
      );
    }
    if (visual) els.push(visualElement(slide, { x: 34, y: 72, w: 32, h: 22, z: z++ }));
    return els;
  }

  // Title
  els.push(
    textElement({
      text: slide.title || "Title",
      x: 5,
      y: 5,
      w: 90,
      h: 12,
      fontSize: 6,
      bold: true,
      font: "display",
      z: z++,
    }),
  );
  let textY = 20;
  if (slide.subtitle) {
    els.push(
      textElement({ text: slide.subtitle, x: 5, y: 17, w: 90, h: 7, fontSize: 3.4, color: MUTED, z: z++ }),
    );
    textY = 26;
  }

  const body = bodyText(slide);
  if (visual) {
    if (body) {
      els.push(textElement({ text: body, x: 5, y: textY, w: 50, h: 94 - textY, fontSize: 3.4, z: z++ }));
    }
    els.push(visualElement(slide, { x: 58, y: textY, w: 37, h: Math.min(62, 94 - textY), z: z++ }));
  } else if (body) {
    els.push(textElement({ text: body, x: 5, y: textY, w: 90, h: 94 - textY, fontSize: 3.6, z: z++ }));
  }

  return els;
}

/** Ensure a slide carries a canvas layout (seed one from its content if absent). */
export function ensureElements(slide: Slide): Slide {
  if (slide.elements && slide.elements.length) return slide;
  return { ...slide, elements: slideToElements(slide) };
}

/**
 * Put a generated/swapped image onto a slide's canvas: reuse the first image
 * element if there is one (replace its src/svg), otherwise add one in the right
 * column and narrow any full-width text so they don't overlap.
 */
export function placeImageOnSlide(
  slide: Slide,
  media: { src?: string; svg?: string; alt?: string },
): CanvasElement[] {
  const els = (slide.elements && slide.elements.length ? slide.elements : slideToElements(slide)).map(
    (e) => ({ ...e }),
  );
  const existing = els.find((e) => e.type === "image") as ImageElement | undefined;
  if (existing) {
    existing.src = media.src;
    existing.svg = media.svg;
    if (media.alt) existing.alt = media.alt;
    return els;
  }
  // Make room: pull wide text boxes into the left column.
  for (const e of els) {
    if (e.type === "text" && e.x < 10 && e.w > 70) e.w = 50;
  }
  els.push(
    imageElement({
      x: 58,
      y: 24,
      w: 37,
      h: 56,
      z: topZ(els),
      src: media.src,
      svg: media.svg,
      alt: media.alt,
    }),
  );
  return els;
}
