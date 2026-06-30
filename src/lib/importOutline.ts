// Deterministic, AI-free import of a pasted lesson outline (e.g. from MagicSchool)
// into a Boardmarkie Lesson. No API key, no Claude call — purely parses the text.
//
// Expected shape (tolerant): blocks introduced by a "Slide N" line, the first
// non-empty line of a block is the slide title, the rest become bullet points.
//
//   Slide 1
//   Photosynthesis: How Plants Make Their Own Food (Grade 3)
//
//   Slide 2
//   What Is Photosynthesis?
//   Photosynthesis is how plants make their own food.
//   ...

import type { Lesson, Slide, SlideLayout } from "./types";
import { cid } from "./canvas";

export interface ImportOptions {
  subject?: string;
  yearGroup?: string;
  region?: string;
}

export interface ImportPreview {
  title: string;
  yearGroup: string;
  slideCount: number;
  standards: string[];
}

// "Slide 3", "Slide 3:", "SLIDE 3 -", optionally with a title on the same line.
const SLIDE_RE = /^\s*slide\s+\d+\s*[:.)\-–—]?\s*(.*)$/i;

// A trailing "(Grade 3)" / "(Year 7)" / "(KS2)" parenthetical on the lesson title.
const GRADE_PAREN_RE = /\(([^)]*\b(?:grade|year|kg|ks\s*\d|reception|stage|foundation)\b[^)]*)\)\s*$/i;

// Common bullet / numbering markers to strip from the front of a content line.
const BULLET_MARKER_RE = /^\s*(?:[-*•·▪◦‣]|\d+[.)]|[a-z][.)])\s+/i;

interface RawBlock {
  lines: string[];
}

function splitBlocks(text: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  let current: RawBlock | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    const m = line.match(SLIDE_RE);
    if (m) {
      current = { lines: [] };
      blocks.push(current);
      const inline = m[1].trim(); // title on the same line as "Slide N", if any
      if (inline) current.lines.push(inline);
      continue;
    }
    if (!current) {
      // Content before the first "Slide N" marker — start an implicit first block.
      current = { lines: [] };
      blocks.push(current);
    }
    current.lines.push(line);
  }
  return blocks;
}

// Drop blank lines at the edges; collapse runs of blanks in the middle to one.
function tidy(lines: string[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    const t = l.trim();
    if (!t) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    out.push(t);
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

function cleanBullet(line: string): string {
  return line.replace(BULLET_MARKER_RE, "").trim();
}

// Pull a leading curriculum-standard code out of a line like
// "3-LS2-1: Construct an argument…" or "CCSS.ELA-LITERACY.RL.3.1 — …".
function leadingStandardCode(line: string): string | null {
  const m = line.match(/^([A-Za-z0-9][A-Za-z0-9.\-]{2,28})\s*[:：.\-–—]\s+\S/);
  if (!m) return null;
  const code = m[1];
  if (!/\d/.test(code)) return null; // must contain a digit
  if (!/[.\-]/.test(code)) return null; // must look code-like (dot or dash)
  return code;
}

const STANDARDS_TITLE_RE = /\b(standard|standards|ngss|common core|ccss|curriculum|teks|c3|cefr|objectives?)\b/i;

function looksLikeTitleSlide(title: string, bullets: string[]): boolean {
  // A standalone heading with no body — the typical first/cover slide.
  return bullets.length === 0 && title.length > 0;
}

// A short, search-friendly query derived from a slide title (drops parentheticals,
// trailing punctuation and leading question words). Used only if the teacher opts
// into the free image/GIF search after importing.
function titleToQuery(title: string): string {
  const q = title
    .replace(/\([^)]*\)/g, " ")
    .replace(/[?:.!]+\s*$/, "")
    .replace(/^\s*(what|why|how|where|who|when|which|whose)\b[\s']*(is|are|do|does|did|the|a|an|was|were)?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return q || title.trim();
}

function pickLayout(index: number, title: string, bullets: string[]): SlideLayout {
  if (index === 0 && looksLikeTitleSlide(title, bullets)) return "title";
  const t = title.toLowerCase();
  if (/\bobjective|learning goal|i can\b|success criteria/.test(t)) return "objectives";
  if (/\bactivit|hands-on|task\b/.test(t)) return "activity";
  if (/\bdiscuss|turn[\s-]?and[\s-]?talk|think[\s-]?pair/.test(t)) return "discussion";
  if (/\bexit ticket|recap|plenary|wrap[\s-]?up|summary|review\b/.test(t)) return "plenary";
  return "content";
}

/**
 * Parse pasted outline text into ready-to-edit slides. Returns null if no usable
 * content was found. Standards detected on a "Standards" slide are collected too.
 */
export function parseOutline(text: string): { slides: Slide[]; title: string; yearGroup: string; standards: string[] } | null {
  const blocks = splitBlocks(text);
  const standards = new Set<string>();
  const slides: Slide[] = [];

  let lessonTitle = "";
  let yearGroup = "";

  blocks.forEach((block) => {
    const lines = tidy(block.lines);
    if (!lines.length) return;

    const rawTitle = lines[0];
    const rest = lines.slice(1).filter((l) => l !== "");
    const bullets = rest.map(cleanBullet).filter(Boolean);

    const index = slides.length;
    let title = rawTitle;

    // First slide: lift the lesson title + any "(Grade N)" parenthetical.
    if (index === 0) {
      const gm = rawTitle.match(GRADE_PAREN_RE);
      if (gm) {
        yearGroup = gm[1].trim();
        title = rawTitle.replace(GRADE_PAREN_RE, "").trim();
      }
      lessonTitle = title;
    }

    // Collect curriculum standards from a standards-style slide.
    if (STANDARDS_TITLE_RE.test(rawTitle)) {
      for (const b of bullets) {
        const code = leadingStandardCode(b);
        if (code) standards.add(code);
      }
    }

    const layout = pickLayout(index, title, bullets);
    const slide: Slide = { id: cid("sl"), layout, title };
    if (layout !== "title" && bullets.length) slide.bullets = bullets;
    // Seed a stock-image query so the optional free media pass has a target;
    // no image is embedded unless the teacher opts in.
    if (layout !== "title") slide.imageQuery = titleToQuery(title);
    slides.push(slide);
  });

  if (!slides.length) return null;
  return { slides, title: lessonTitle || slides[0].title, yearGroup, standards: [...standards] };
}

/** Lightweight preview for the import dialog without building the full Lesson. */
export function previewOutline(text: string, opts: ImportOptions = {}): ImportPreview | null {
  const parsed = parseOutline(text);
  if (!parsed) return null;
  return {
    title: parsed.title,
    yearGroup: opts.yearGroup?.trim() || parsed.yearGroup,
    slideCount: parsed.slides.length,
    standards: parsed.standards,
  };
}

/**
 * Build a complete Lesson from pasted outline text — no AI involved. Caller
 * supplies optional subject / grade / region to fill the lesson metadata.
 */
export function lessonFromOutline(text: string, opts: ImportOptions = {}): Lesson | null {
  const parsed = parseOutline(text);
  if (!parsed) return null;
  const now = Date.now();
  return {
    id: cid("lesson"),
    kind: "lesson",
    createdAt: now,
    updatedAt: now,
    meta: {
      title: parsed.title,
      subject: opts.subject?.trim() || "",
      topic: parsed.title,
      yearGroup: opts.yearGroup?.trim() || parsed.yearGroup,
      region: opts.region?.trim() || "",
      durationMinutes: 45,
      summary: "",
      objectives: [],
      vocabulary: [],
      ...(parsed.standards.length ? { standards: parsed.standards } : {}),
    },
    slides: parsed.slides,
  };
}
