// NotebookLM companion: turn a lesson into source files + a tailored prompt the
// teacher pastes into Google NotebookLM to generate a podcast, video or
// flashcards. Pure data/strings (no JSX) so it can be imported anywhere.

import type { Lesson } from "./types";
import { textPdf, type PdfLine } from "./pdf";

export const NOTEBOOKLM_URL = "https://notebooklm.google.com/";

export type NotebookActivity = "podcast" | "video" | "flashcards";

export const NOTEBOOK_ACTIVITIES: { id: NotebookActivity; label: string; description: string }[] = [
  { id: "podcast", label: "Podcast", description: "Two-host audio deep dive" },
  { id: "video", label: "Video", description: "Narrated video overview" },
  { id: "flashcards", label: "Flashcards", description: "Study cards for revision" },
];

function joinList(items: (string | undefined)[] | undefined, max = 10): string {
  const xs = (items ?? []).filter((x): x is string => !!x && x.trim().length > 0).slice(0, max);
  return xs.join("; ");
}

/** A UAE/AISA-localised NotebookLM brief for the chosen output type, grounded in
 *  the uploaded lesson sources. */
export function notebookLmPrompt(activity: NotebookActivity, lesson: Lesson): string {
  const m = lesson.meta;
  const grade = m.yearGroup || "the target grade";
  const subject = m.subject || "the subject";
  const noun = activity === "flashcards" ? "a set of flashcards" : `a ${activity}`;
  const objectives = joinList(m.objectives);
  const vocab = joinList(m.vocabulary?.map((v) => v.term));
  const standards = joinList(m.standards);

  const context =
    `You are creating ${noun} for a ${grade} ${subject} lesson titled "${m.title}"` +
    `${m.topic ? ` (topic: ${m.topic})` : ""} at the American International School in Abu Dhabi (AISA), in the ` +
    `United Arab Emirates. Base it strictly on the lesson materials I've uploaded as sources — the slide deck ` +
    `(.pptx) and the lesson-details PDF. ` +
    (objectives ? `Align it to these learning objectives: ${objectives}. ` : "") +
    (vocab ? `Reinforce the key vocabulary: ${vocab}. ` : "") +
    (standards ? `Where relevant, connect to these standards: ${standards}. ` : "") +
    `Localise it for the UAE: use authentic Emirati/Gulf real-life examples and contexts, and keep everything ` +
    `culturally sensitive and appropriate for a UAE classroom (respect local values, dress, religion and customs).`;

  const specific: Record<NotebookActivity, string> = {
    podcast:
      `Format: an engaging two-host audio "deep dive" podcast, conversational and lively, pitched for ${grade} ` +
      `students. Explain concepts with everyday analogies grounded in UAE life, build understanding step by step, ` +
      `and recap the key vocabulary near the end. Aim for roughly 8–12 minutes.`,
    video:
      `Format: a Video Overview that visually explains the key concepts step by step for ${grade} students. Use ` +
      `clear visuals and on-screen labels, build understanding progressively, weave in UAE-based real-world ` +
      `examples, and keep it concise and engaging.`,
    flashcards:
      `Format: a set of study flashcards. Each card has a clear term or question on the front and a concise, ` +
      `student-friendly answer on the back. Cover the key vocabulary and the core ideas needed to meet the ` +
      `objectives, and add a few "apply it" cards using real UAE scenarios. Keep the language right for ${grade} ` +
      `students.`,
  };

  return `${context}\n\n${specific[activity]}`;
}

/** A NotebookLM-friendly lesson-details PDF (NotebookLM can't ingest JSON, but
 *  reads PDFs cleanly). Lays out the metadata then a slide-by-slide breakdown. */
export function lessonDetailsPdf(lesson: Lesson): Blob {
  const m = lesson.meta;
  const L: PdfLine[] = [];

  L.push({ text: m.title || "Lesson", size: 20, bold: true });
  const head = [m.subject, m.yearGroup, m.region].filter(Boolean).join("   •   ");
  if (head) L.push({ text: head, size: 11, gap: 4 });
  if (m.durationMinutes) L.push({ text: `Duration: ${m.durationMinutes} minutes`, size: 11, gap: 2 });
  if (m.summary) L.push({ text: m.summary, size: 11, gap: 8 });

  const section = (title: string, items: string[]) => {
    if (!items.length) return;
    L.push({ text: title, size: 14, bold: true, gap: 14 });
    for (const it of items) L.push({ text: `-  ${it}`, size: 11, gap: 2 });
  };
  section("Learning objectives", m.objectives ?? []);
  section("Standards", m.standards ?? []);
  section("Key vocabulary", (m.vocabulary ?? []).map((v) => `${v.term}: ${v.definition}`));

  L.push({ text: "Slides", size: 14, bold: true, gap: 16 });
  lesson.slides.forEach((s, i) => {
    L.push({ text: `${i + 1}.  ${s.title || "Untitled"}`, size: 12.5, bold: true, gap: 12 });
    if (s.subtitle) L.push({ text: s.subtitle, size: 11, gap: 1 });
    if (s.body) L.push({ text: s.body, size: 11, gap: 2 });
    for (const b of s.bullets ?? []) L.push({ text: `-  ${b}`, size: 11, gap: 1 });
    for (const v of s.vocabulary ?? []) L.push({ text: `-  ${v.term}: ${v.definition}`, size: 11, gap: 1 });
    if (s.activity) {
      L.push({ text: `Activity: ${s.activity.title || "Activity"}`, size: 11, bold: true, gap: 3 });
      if (s.activity.instructions) L.push({ text: s.activity.instructions, size: 11, gap: 1 });
    }
    for (const q of s.discussionQuestions ?? []) L.push({ text: `Discuss: ${q}`, size: 11, gap: 1 });
    for (const q of s.quiz ?? []) {
      L.push({ text: `Q: ${q.question}`, size: 11, gap: 2 });
      (q.options ?? []).forEach((o, oi) => L.push({ text: `   ${String.fromCharCode(65 + oi)}. ${o}`, size: 11 }));
      if (q.answer) L.push({ text: `Answer: ${q.answer}`, size: 11 });
    }
    if (s.teacherNotes) L.push({ text: `Teacher notes: ${s.teacherNotes}`, size: 10.5, gap: 2 });
  });

  return textPdf(L);
}

/** Clean, structured lesson details (also used for other exports). */
export function lessonDetails(lesson: Lesson) {
  const m = lesson.meta;
  return {
    title: m.title,
    subject: m.subject,
    gradeLevel: m.yearGroup,
    region: m.region,
    durationMinutes: m.durationMinutes,
    summary: m.summary,
    objectives: m.objectives,
    standards: m.standards ?? [],
    vocabulary: m.vocabulary,
    slides: lesson.slides.map((s, i) => ({
      number: i + 1,
      title: s.title,
      subtitle: s.subtitle,
      body: s.body,
      bullets: s.bullets,
      vocabulary: s.vocabulary,
      activity: s.activity,
      discussionQuestions: s.discussionQuestions,
      quiz: s.quiz,
      teacherNotes: s.teacherNotes,
    })),
  };
}
