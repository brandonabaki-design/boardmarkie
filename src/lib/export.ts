"use client";

import type { Artifact, ImageElement, Lesson, LessonSeries, Worksheet } from "./types";
import type * as Docx from "docx";
import { ensureElements } from "./canvas";

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
  w: number;
  h: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

function loadImageCors(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

/** Rasterise model-generated SVG to a PNG data URL (pptx SVG support is flaky). */
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
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL("image/png"), w, h };
}

async function encodeRemote(url: string): Promise<VisualData | null> {
  try {
    const img = await loadImageCors(url);
    const w = img.naturalWidth || 1600;
    const h = img.naturalHeight || 900;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), w, h };
  } catch {
    return null;
  }
}

/** Embeddable data URL for an image element (data:/remote raster or SVG diagram). */
async function imageData(el: ImageElement): Promise<string | null> {
  try {
    if (el.svg) return (await svgToPng(el.svg)).dataUrl;
    if (el.src) {
      if (el.src.startsWith("data:")) return el.src;
      const v = await encodeRemote(el.src);
      return v?.dataUrl ?? null;
    }
  } catch {
    /* skip the visual rather than failing the whole export */
  }
  return null;
}

async function ytThumb(id: string): Promise<string | null> {
  const v = await encodeRemote(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
  return v?.dataUrl ?? null;
}

const hex = (c?: string, fallback = "16181d") => (c ?? `#${fallback}`).replace("#", "");

// Strip markdown emphasis to plain text; also drop any stray/unbalanced markers
// so "**" / "*" can never leak into a DOCX.
const stripMd = (s: string) =>
  s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\*+/g, "");

// Split a line into runs by **bold** / *italic* markdown. A toggling parser
// (not pair-matching) so stray/unbalanced markers never appear as literal text.
function mdRuns(line: string): { text: string; bold?: boolean; italic?: boolean }[] {
  const runs: { text: string; bold?: boolean; italic?: boolean }[] = [];
  let buf = "";
  let bold = false;
  let italic = false;
  const flush = () => {
    if (!buf) return;
    runs.push({ text: buf, ...(bold ? { bold: true } : {}), ...(italic ? { italic: true } : {}) });
    buf = "";
  };
  for (let i = 0; i < line.length; ) {
    if (line[i] === "*" && line[i + 1] === "*") {
      flush();
      bold = !bold;
      i += 2;
    } else if (line[i] === "*") {
      flush();
      italic = !italic;
      i += 1;
    } else {
      buf += line[i];
      i += 1;
    }
  }
  flush();
  return runs.length ? runs : [{ text: line }];
}

// Build pptxgenjs text runs (bold/italic per markdown) preserving line breaks.
function mdParas(text: string, bold: boolean, italic: boolean) {
  const out: { text: string; options: Record<string, unknown> }[] = [];
  const lines = text.split("\n");
  lines.forEach((line, li) => {
    const runs = mdRuns(line);
    runs.forEach((r, ri) => {
      out.push({
        text: r.text,
        options: {
          bold: bold || !!r.bold,
          italic: italic || !!r.italic,
          breakLine: ri === runs.length - 1 && li < lines.length - 1,
        },
      });
    });
  });
  return out as never;
}

// ---- PowerPoint: render the slide canvas (elements) natively ----

export async function exportLessonToPptx(lesson: Lesson): Promise<void> {
  const PptxGen = (await import("pptxgenjs")).default;
  const pptx = new PptxGen();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.author = "Boardmarkie";
  pptx.title = lesson.meta.title;

  const W = 13.33;
  const H = 7.5;
  const inX = (p: number) => (p / 100) * W;
  const inY = (p: number) => (p / 100) * H;

  for (const raw of lesson.slides) {
    const slide = ensureElements(raw);
    const s = pptx.addSlide();
    s.background = { color: hex(slide.background, "ffffff") };

    const els = [...(slide.elements ?? [])].sort((a, b) => a.z - b.z);
    for (const el of els) {
      const box = { x: inX(el.x), y: inY(el.y), w: inX(el.w), h: inY(el.h) };

      if (el.type === "text") {
        if (!el.text.trim()) continue;
        s.addText(mdParas(el.text, !!el.bold, !!el.italic), {
          ...box,
          fontSize: Math.max(6, Math.round((el.fontSize / 100) * 540)), // cqh → pt (7.5in = 540pt)
          align: el.align ?? "left",
          valign: "top",
          color: hex(el.color),
          fontFace: "Arial",
        });
      } else if (el.type === "shape") {
        s.addShape((el.shape === "ellipse" ? "ellipse" : "rect") as never, {
          ...box,
          fill: { color: hex(el.fill, "d2f6ec"), transparency: 100 - (el.opacity ?? 100) },
          line: { type: "none" } as never,
        });
      } else if (el.type === "image") {
        const data = await imageData(el);
        if (data) {
          // "contain" shows the whole image (never cropped) — boxes are sized ~16:9 to match.
          s.addImage({ data, ...box, sizing: { type: "contain", w: box.w, h: box.h } });
        }
      } else if (el.type === "youtube") {
        const url = `https://www.youtube.com/watch?v=${el.videoId}`;
        const thumb = await ytThumb(el.videoId);
        if (thumb) {
          s.addImage({ data: thumb, ...box, sizing: { type: "cover", w: box.w, h: box.h }, hyperlink: { url } });
        } else {
          s.addText(`▶ ${el.title || "Watch video"}`, {
            ...box,
            fontSize: 16,
            color: "0c8a78",
            align: "center",
            valign: "middle",
            hyperlink: { url },
          });
        }
      }
    }

    if (slide.teacherNotes) s.addNotes(slide.teacherNotes);
  }

  await pptx.writeFile({ fileName: `${slugify(lesson.meta.title)}.pptx` });
}

// ---- Word (.docx) export ----

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type RunOpts = { bold?: boolean; italics?: boolean; color?: string };

export async function exportLessonToDocx(lesson: Lesson): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const kids: Docx.Paragraph[] = [];
  const para = (text: string, opts: RunOpts = {}) =>
    new Paragraph({ children: [new TextRun({ text: stripMd(text), ...opts })] });
  const bullet = (text: string, level = 0) => new Paragraph({ text: stripMd(text), bullet: { level } });
  const term = (t: string, def: string) =>
    new Paragraph({ children: [new TextRun({ text: `${stripMd(t)}: `, bold: true }), new TextRun(stripMd(def))] });

  kids.push(new Paragraph({ text: lesson.meta.title, heading: HeadingLevel.TITLE }));
  kids.push(
    para(`${lesson.meta.subject}  •  ${lesson.meta.yearGroup}  •  ${lesson.meta.durationMinutes} min`, {
      color: "5B6472",
    }),
  );
  if (lesson.meta.summary) kids.push(para(lesson.meta.summary));

  if (lesson.meta.standards?.length) {
    kids.push(new Paragraph({ text: "Curriculum standards", heading: HeadingLevel.HEADING_2 }));
    lesson.meta.standards.forEach((s) => kids.push(bullet(s)));
  }
  if (lesson.meta.objectives.length) {
    kids.push(new Paragraph({ text: "Learning objectives", heading: HeadingLevel.HEADING_2 }));
    lesson.meta.objectives.forEach((o) => kids.push(bullet(o)));
  }
  if (lesson.meta.vocabulary.length) {
    kids.push(new Paragraph({ text: "Key vocabulary", heading: HeadingLevel.HEADING_2 }));
    lesson.meta.vocabulary.forEach((v) => kids.push(term(v.term, v.definition)));
  }

  lesson.slides.forEach((slide, i) => {
    kids.push(new Paragraph({ text: `${i + 1}. ${slide.title}`, heading: HeadingLevel.HEADING_2 }));
    if (slide.subtitle) kids.push(para(slide.subtitle, { italics: true, color: "5B6472" }));
    if (slide.body) kids.push(para(slide.body));
    (slide.bullets ?? []).forEach((b) => kids.push(bullet(b)));
    (slide.vocabulary ?? []).forEach((v) => kids.push(term(v.term, v.definition)));
    if (slide.activity) {
      kids.push(para(`Activity — ${slide.activity.title}`, { bold: true, color: "0D9488" }));
      if (slide.activity.instructions) kids.push(para(slide.activity.instructions));
    }
    (slide.discussionQuestions ?? []).forEach((q) => kids.push(bullet(q)));
    (slide.quiz ?? []).forEach((q) => {
      kids.push(para(q.question, { bold: true }));
      q.options.forEach((o) => kids.push(bullet(o, 1)));
      if (q.answer) kids.push(para(`Answer: ${q.answer}`, { italics: true, color: "0D9488" }));
    });
    if (slide.teacherNotes) kids.push(para(`Teacher notes: ${slide.teacherNotes}`, { italics: true, color: "5B6472" }));
  });

  const doc = new Document({ creator: "Boardmarkie", title: lesson.meta.title, sections: [{ children: kids }] });
  downloadBlob(await Packer.toBlob(doc), `${slugify(lesson.meta.title)}.docx`);
}

export async function exportWorksheetToDocx(ws: Worksheet): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const kids: Docx.Paragraph[] = [];
  const para = (text: string, opts: RunOpts = {}) =>
    new Paragraph({ children: [new TextRun({ text, ...opts })] });

  kids.push(new Paragraph({ text: ws.meta.title, heading: HeadingLevel.TITLE }));
  kids.push(para(`${ws.meta.subject}  •  ${ws.meta.yearGroup}`, { color: "5B6472" }));
  if (ws.meta.instructions) kids.push(para(ws.meta.instructions));
  kids.push(para("Name: ____________________     Date: ____________"));

  ws.sections.forEach((sec) => {
    kids.push(new Paragraph({ text: sec.title, heading: HeadingLevel.HEADING_2 }));
    if (sec.instructions) kids.push(para(sec.instructions, { italics: true, color: "5B6472" }));
    sec.questions.forEach((q) => {
      kids.push(para(`${q.number}. ${q.prompt}${q.marks ? `   [${q.marks} marks]` : ""}`));
      if ((q.type === "mcq" || q.type === "matching") && q.options?.length) {
        q.options.forEach((o, idx) =>
          kids.push(new Paragraph({ text: `${String.fromCharCode(97 + idx)}) ${o}`, bullet: { level: 0 } })),
        );
      } else if (q.type === "truefalse") {
        kids.push(para("True   /   False"));
      } else {
        const lines = q.type === "long" ? 3 : 1;
        for (let k = 0; k < lines; k++) kids.push(new Paragraph({ text: "" }));
      }
    });
  });

  kids.push(new Paragraph({ text: "Answer Key", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
  ws.sections.forEach((sec) => {
    sec.questions.forEach((q) => {
      if (q.answer) kids.push(para(`${q.number}. ${q.answer}`));
    });
  });

  const doc = new Document({ creator: "Boardmarkie", title: ws.meta.title, sections: [{ children: kids }] });
  downloadBlob(await Packer.toBlob(doc), `${slugify(ws.meta.title)}.docx`);
}

export async function exportSeriesToDocx(series: LessonSeries): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const kids: Docx.Paragraph[] = [];
  const para = (text: string, opts: RunOpts = {}) =>
    new Paragraph({ children: [new TextRun({ text, ...opts })] });

  kids.push(new Paragraph({ text: series.meta.title, heading: HeadingLevel.TITLE }));
  kids.push(para(`${series.meta.subject}  •  ${series.meta.yearGroup}`, { color: "5B6472" }));
  if (series.meta.summary) kids.push(para(series.meta.summary));

  series.lessons.forEach((l) => {
    kids.push(new Paragraph({ text: `Lesson ${l.number}: ${l.title}`, heading: HeadingLevel.HEADING_2 }));
    if (l.objective) kids.push(para(`Objective: ${l.objective}`, { bold: true }));
    if (l.summary) kids.push(para(l.summary));
    l.keyActivities.forEach((a) => kids.push(new Paragraph({ text: a, bullet: { level: 0 } })));
  });

  const doc = new Document({ creator: "Boardmarkie", title: series.meta.title, sections: [{ children: kids }] });
  downloadBlob(await Packer.toBlob(doc), `${slugify(series.meta.title)}.docx`);
}
