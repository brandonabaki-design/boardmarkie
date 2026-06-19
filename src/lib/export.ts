"use client";

import type { Artifact, Lesson, Slide } from "./types";

const BRAND = "0D9488"; // teal-600
const INK = "1B1B1F";
const MUTE = "5B6472";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "boardmarkie";
}

export function downloadJSON(artifact: Artifact): void {
  const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = "meta" in artifact ? artifact.meta.title : "boardmarkie";
  a.download = `${slugify(name)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open the browser print dialog (used for "Export PDF" / "Print"). */
export function printDocument(): void {
  window.print();
}

// ---- visual helpers (export runs client-side, so DOM APIs are available) ----

interface VisualData {
  dataUrl: string; // a raster (PNG/JPEG) data URL, embeddable by pptxgenjs
  w: number; // natural pixel width  (used only for aspect ratio)
  h: number; // natural pixel height
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

/**
 * Rasterise model-generated SVG to a PNG data URL. pptxgenjs's native SVG
 * support is unreliable, whereas a PNG embeds cleanly in PowerPoint, Keynote
 * and Google Slides. Aspect ratio comes from the SVG's viewBox.
 */
async function svgToPng(svg: string, targetW = 1600): Promise<VisualData> {
  const m = svg.match(/viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
  const aspect = m ? Number(m[2]) / Number(m[1]) : 0.75;
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 0.75;
  const w = targetW;
  const h = Math.max(1, Math.round(targetW * safeAspect));
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#FFFFFF"; // flatten any transparency to white
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL("image/png"), w, h };
}

/** A slide's visual as an embeddable raster + natural size, or null if none. */
async function slideVisual(slide: Slide): Promise<VisualData | null> {
  try {
    if (slide.imageUrl) {
      const img = await loadImage(slide.imageUrl);
      return { dataUrl: slide.imageUrl, w: img.naturalWidth || 1600, h: img.naturalHeight || 900 };
    }
    if (slide.diagramSvg) return await svgToPng(slide.diagramSvg);
  } catch {
    /* Skip the visual rather than failing the whole export. */
  }
  return null;
}

/** Scale natural px (w0,h0) to fit within a box (inches), preserving aspect. */
function fitBox(w0: number, h0: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / w0, maxH / h0);
  return { w: w0 * scale, h: h0 * scale };
}

type Para = { text: string; options?: Record<string, unknown> };

export async function exportLessonToPptx(lesson: Lesson): Promise<void> {
  const PptxGen = (await import("pptxgenjs")).default;
  const pptx = new PptxGen();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.author = "Boardmarkie";
  pptx.title = lesson.meta.title;

  for (const slide of lesson.slides) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    // accent bar
    s.addShape("rect" as never, { x: 0, y: 0, w: 0.22, h: 7.5, fill: { color: BRAND } });

    const visual = await slideVisual(slide);

    // Drop a visual into a box, centered and aspect-fit (no stretching).
    const placeVisual = (v: VisualData, boxX: number, boxY: number, boxW: number, boxH: number) => {
      const { w, h } = fitBox(v.w, v.h, boxW, boxH);
      s.addImage({ data: v.dataUrl, x: boxX + (boxW - w) / 2, y: boxY + (boxH - h) / 2, w, h });
    };

    if (slide.layout === "title") {
      const titleW = visual ? 6.2 : 11.7;
      s.addText(slide.title, {
        x: 0.8, y: 2.4, w: titleW, h: 1.6, fontSize: 40, bold: true, color: INK, fontFace: "Arial",
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, { x: 0.8, y: 4.0, w: titleW, h: 1.2, fontSize: 20, color: MUTE, fontFace: "Arial" });
      }
      s.addText(`${lesson.meta.subject}  •  ${lesson.meta.yearGroup}`, {
        x: 0.8, y: 6.3, w: titleW, h: 0.4, fontSize: 14, color: BRAND, fontFace: "Arial",
      });
      if (lesson.meta.standards && lesson.meta.standards.length) {
        s.addText(`Aligned to: ${lesson.meta.standards.join("   •   ")}`, {
          x: 0.8, y: 6.75, w: titleW, h: 0.6, fontSize: 11, color: MUTE, fontFace: "Arial",
        });
      }
      if (visual) placeVisual(visual, 7.2, 1.3, 5.5, 4.9);
    } else {
      const textW = visual ? 6.9 : 11.9;
      s.addText(slide.title, {
        x: 0.7, y: 0.4, w: textW, h: 0.9, fontSize: 28, bold: true, color: INK, fontFace: "Arial",
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, { x: 0.7, y: 1.2, w: textW, h: 0.5, fontSize: 16, color: MUTE, fontFace: "Arial" });
      }

      const paras: Para[] = [];
      const push = (text: string, opts: Record<string, unknown> = {}) =>
        paras.push({ text, options: { fontSize: 18, color: INK, fontFace: "Arial", breakLine: true, paraSpaceAfter: 6, ...opts } });

      if (slide.body) push(slide.body);
      for (const b of slide.bullets ?? []) push(b, { bullet: { code: "2022" }, indentLevel: 0 });

      for (const v of slide.vocabulary ?? []) {
        push(`${v.term}: `, { bold: true, color: BRAND, breakLine: false });
        push(v.definition, { breakLine: true });
      }

      if (slide.activity) {
        push(`Activity — ${slide.activity.title}`, { bold: true, color: BRAND });
        push(slide.activity.instructions);
        const meta = [slide.activity.grouping, slide.activity.durationMinutes ? `${slide.activity.durationMinutes} min` : ""]
          .filter(Boolean)
          .join("  •  ");
        if (meta) push(meta, { italic: true, color: MUTE, fontSize: 14 });
      }

      for (const q of slide.discussionQuestions ?? []) push(q, { bullet: { code: "2022" } });

      for (const q of slide.quiz ?? []) {
        push(q.question, { bold: true });
        for (const o of q.options) push(o, { bullet: { code: "25CB" }, indentLevel: 1, fontSize: 16 });
      }

      if (slide.youtube?.searchQuery) {
        push(`📺 Video: ${slide.youtube.title || slide.youtube.searchQuery}`, { color: BRAND, fontSize: 15 });
      }

      if (paras.length) {
        s.addText(paras as never, { x: 0.7, y: 1.8, w: textW, h: 5.3, valign: "top" });
      }

      if (visual) {
        // Visual-only slide → big and centered; otherwise the right column.
        if (paras.length === 0) placeVisual(visual, 0.7, 1.8, 11.9, 5.3);
        else placeVisual(visual, 7.7, 1.7, 5.0, 5.3);
      }
    }

    if (slide.teacherNotes) s.addNotes(slide.teacherNotes);
  }

  await pptx.writeFile({ fileName: `${slugify(lesson.meta.title)}.pptx` });
}
