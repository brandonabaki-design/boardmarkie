"use client";

import type { Artifact, Lesson } from "./types";

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

    if (slide.layout === "title") {
      s.addText(slide.title, {
        x: 0.8, y: 2.6, w: 11.7, h: 1.6, fontSize: 40, bold: true, color: INK, fontFace: "Arial",
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, { x: 0.8, y: 4.2, w: 11.7, h: 1, fontSize: 20, color: MUTE, fontFace: "Arial" });
      }
      s.addText(`${lesson.meta.subject}  •  ${lesson.meta.yearGroup}`, {
        x: 0.8, y: 6.4, w: 11.7, h: 0.5, fontSize: 14, color: BRAND, fontFace: "Arial",
      });
    } else {
      s.addText(slide.title, {
        x: 0.7, y: 0.4, w: 11.9, h: 0.9, fontSize: 28, bold: true, color: INK, fontFace: "Arial",
      });
      if (slide.subtitle) {
        s.addText(slide.subtitle, { x: 0.7, y: 1.2, w: 11.9, h: 0.5, fontSize: 16, color: MUTE, fontFace: "Arial" });
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
        s.addText(paras as never, { x: 0.7, y: 1.8, w: 11.9, h: 5.3, valign: "top" });
      }
    }

    if (slide.teacherNotes) s.addNotes(slide.teacherNotes);
  }

  await pptx.writeFile({ fileName: `${slugify(lesson.meta.title)}.pptx` });
}
