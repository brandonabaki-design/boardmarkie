// NotebookLM companion: turn a lesson into source files + a tailored prompt the
// teacher pastes into Google NotebookLM to generate a podcast, video or
// flashcards. Pure data/strings (no JSX) so it can be imported anywhere.

import type { Lesson } from "./types";

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
    `(.pptx) and the lesson-details JSON. ` +
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

/** Clean, NotebookLM-friendly lesson details for download as a JSON source. */
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
