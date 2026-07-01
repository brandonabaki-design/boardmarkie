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
  subject: string;
  yearGroup: string;
  slideCount: number;
  objectiveCount: number;
  standards: string[];
}

// "Slide 3", "Slide 3:", "SLIDE 3 -", optionally with a title on the same line.
const SLIDE_RE = /^\s*slide\s+\d+\s*[:.)\-–—]?\s*(.*)$/i;

// A trailing "(Grade 3)" / "(Year 7)" / "(KS2)" parenthetical on the lesson title.
const GRADE_PAREN_RE = /\(([^)]*\b(?:grade|year|kg|ks\s*\d|reception|stage|foundation)\b[^)]*)\)\s*$/i;

// Common bullet / numbering markers to strip from the front of a content line.
const BULLET_MARKER_RE = /^\s*(?:[-*•·▪◦‣]|\d+[.)]|[a-z][.)])\s+/i;

interface RawBlock {
  fromMarker: boolean; // introduced by a "Slide N" line?
  label: string; // text after "Slide N:" on the marker line (often a section name)
  lines: string[];
}

function splitBlocks(text: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  let current: RawBlock | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    const m = line.match(SLIDE_RE);
    if (m) {
      // Keep the "Slide N:" label separate — it's a section name ("Title Slide",
      // "Hook / Introduction"), not necessarily the real slide title.
      current = { fromMarker: true, label: m[1].trim(), lines: [] };
      blocks.push(current);
      continue;
    }
    if (!current) {
      // Content before the first "Slide N" marker — implicit block (may be a
      // metadata preamble, or the whole thing if there are no markers at all).
      current = { fromMarker: false, label: "", lines: [] };
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

// ---- AI-free detection of grade / subject / standards from the text ----------

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Subject → distinctive keywords. Specific science strands are listed before the
// generic "Science" so a clear signal wins; scoring counts keyword occurrences.
const SUBJECT_KEYWORDS: { subject: string; words: string[] }[] = [
  { subject: "Biology", words: ["photosynthesis", "cell", "cells", "organism", "ecosystem", "gene", "genes", "dna", "evolution", "bacteria", "enzyme", "respiration", "mitosis", "plant", "plants", "animal", "animals", "habitat", "food chain", "food web", "leaf", "leaves", "roots", "oxygen", "species", "reproduction", "digestive", "circulatory", "photosynthesise"] },
  { subject: "Chemistry", words: ["atom", "atoms", "molecule", "molecules", "chemical reaction", "element", "elements", "compound", "acid", "acids", "periodic table", "chemical bond", "chemical", "ions", "solution", "mixture", "electron", "proton", "neutron"] },
  { subject: "Physics", words: ["force", "forces", "gravity", "velocity", "acceleration", "friction", "electricity", "magnetism", "circuit", "voltage", "momentum", "newton", "kinetic energy", "potential energy", "wavelength"] },
  { subject: "Earth & Space", words: ["planet", "planets", "solar system", "galaxy", "moon", "earthquake", "volcano", "volcanoes", "rock cycle", "water cycle", "erosion", "tectonic", "atmosphere", "orbit", "universe", "fossil", "mineral", "weathering"] },
  { subject: "Mathematics", words: ["fraction", "fractions", "equation", "equations", "algebra", "geometry", "multiply", "multiplication", "divide", "division", "decimal", "decimals", "percentage", "integer", "angle", "angles", "probability", "ratio", "numerator", "denominator", "perimeter"] },
  { subject: "English/Language Arts", words: ["paragraph", "essay", "noun", "nouns", "verb", "verbs", "adjective", "adverb", "grammar", "punctuation", "metaphor", "simile", "narrative", "comprehension", "spelling", "syllable", "protagonist", "prefix", "suffix"] },
  { subject: "History", words: ["ancient", "empire", "revolution", "civilization", "civilisation", "dynasty", "medieval", "colonial", "monarch", "treaty", "timeline", "century", "world war"] },
  { subject: "Geography", words: ["continent", "continents", "landform", "landforms", "climate", "population", "longitude", "latitude", "biome", "capital city", "map skills", "natural resources"] },
  { subject: "Computer Science", words: ["algorithm", "coding", "programming", "variable", "variables", "boolean", "debug", "software", "binary", "python", "javascript", "loop"] },
  { subject: "Engineering", words: ["design process", "prototype", "blueprint", "mechanism", "gears", "engineering", "structural"] },
  { subject: "Health & PE", words: ["nutrition", "fitness", "hygiene", "wellness", "physical activity", "heart rate", "mental health", "balanced diet"] },
  { subject: "Arts", words: ["painting", "sculpture", "color wheel", "colour wheel", "melody", "rhythm", "orchestra", "watercolour", "still life"] },
  { subject: "World Languages", words: ["conjugation", "conjugate", "vocabulaire", "bonjour", "hola", "mandarin", "arabic vocabulary"] },
  { subject: "Social Studies", words: ["citizen", "citizens", "government", "democracy", "economy", "community helpers", "civic", "voting"] },
  { subject: "Science", words: ["experiment", "hypothesis", "observation", "scientist", "states of matter", "living things", "investigate", "sunlight", "energy", "matter"] },
];

const SCIENCE_SPECIFIC = new Set(["Biology", "Chemistry", "Physics", "Earth & Space"]);

function gradeToNumber(label: string): number | null {
  const l = label.toLowerCase();
  if (/\b(k|kg|kindergarten|reception|pre-?k|foundation)\b/.test(l)) return 0;
  const m = l.match(/\b(\d{1,2})\b/);
  return m ? parseInt(m[1], 10) : null;
}

function isElementary(label: string): boolean {
  const n = gradeToNumber(label);
  return n !== null && n <= 5;
}

/** Best-guess grade band from anywhere in the text (a friendly label, or ""). */
export function detectGrade(text: string): string {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/\bgrades?\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})\b/i))) return `Grades ${m[1]}–${m[2]}`;
  if ((m = text.match(/\bgrade\s+(\d{1,2})\b/i))) return `Grade ${m[1]}`;
  if ((m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+grade(?:rs?)?\b/i))) return `Grade ${m[1]}`;
  if ((m = text.match(/\byears?\s+(\d{1,2})\b/i))) return `Year ${m[1]}`;
  if ((m = text.match(/\b(?:key stage|ks)\s*([1-5])\b/i))) return `KS${m[1]}`;
  if (/\bkindergarten\b/i.test(text)) return "Kindergarten";
  if (/\breception\b/i.test(text)) return "Reception";
  return "";
}

/** Best-guess subject from keyword hits (mapped to the controlled list), or "". */
export function detectSubject(text: string, gradeLabel = ""): string {
  const hay = ` ${text.toLowerCase()} `;
  let best = "";
  let bestScore = 0;
  for (const { subject, words } of SUBJECT_KEYWORDS) {
    let score = 0;
    for (const w of words) {
      if (w.includes(" ")) {
        for (let i = hay.indexOf(w); i !== -1; i = hay.indexOf(w, i + w.length)) score++;
      } else {
        const hits = hay.match(new RegExp(`\\b${escapeRe(w)}\\b`, "g"));
        if (hits) score += hits.length;
      }
    }
    if (score > bestScore) {
      best = subject;
      bestScore = score;
    }
  }
  if (bestScore < 2) return ""; // need at least a little evidence
  // For young grades, prefer the general "Science" over a specific strand.
  if (SCIENCE_SPECIFIC.has(best) && gradeLabel && isElementary(gradeLabel)) return "Science";
  return best;
}

// Curriculum-standard code patterns across common frameworks (kept strict so
// everyday numbers like "8-10" or "COVID-19" don't get mistaken for standards).
const STANDARD_PATTERNS: RegExp[] = [
  /\bCCSS\.[A-Z0-9.\-]+/gi, // CCSS.ELA-LITERACY.RL.3.1
  /\b(?:K|\d{1,2}|MS|HS)-(?:PS|LS|ESS|ETS)\d?-\d+\b/g, // NGSS: 3-LS2-1, MS-LS1-6
  /\b(?:RL|RI|RF|SL|RH|RST|WHST|W|L)\.[K\d]+\.\d+[a-z]?\b/gi, // CCSS ELA e.g. RL.3.1
  /\b[K\d]+\.(?:OA|NBT|NF|MD|RP|NS|EE|SP|G)\.[A-Z]?\.?\d+[a-z]?\b/gi, // CCSS math e.g. 4.NF.B.3
];
// NB: we deliberately don't match a bare "NGSS <word>" — it caught prose like
// "NGSS concepts". Real NGSS codes are caught by the DCI pattern above.

/** All curriculum-standard codes found anywhere in the text (deduped). */
export function detectStandards(text: string): string[] {
  const out = new Set<string>();
  for (const re of STANDARD_PATTERNS) {
    const matches = text.match(re);
    if (matches) for (const m of matches) out.add(m.trim());
  }
  return [...out];
}

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

function pickLayout(index: number, title: string, bullets: string[], label = ""): SlideLayout {
  if (index === 0 && looksLikeTitleSlide(title, bullets)) return "title";
  const t = `${title} ${label}`.toLowerCase();
  if (/\b(objective|learning goal|i can|success criteria)\b/.test(t)) return "objectives";
  if (/\b(activit|hands-on|task)/.test(t)) return "activity";
  if (/\b(discuss|turn[\s-]?and[\s-]?talk|think[\s-]?pair)/.test(t)) return "discussion";
  if (/\b(exit ticket|recap|plenary|wrap[\s-]?up|summary|review|conclusion)\b/.test(t)) return "plenary";
  return "content";
}

// Labeled fields some outlines (e.g. Gemini) use inside a slide block.
const FIELD_RE = /^(heading|title|subtitle|sub-title|visual idea|visual|image idea|image)\s*:\s*(.*)$/i;
// Structural container labels whose own line carries no slide content.
const CONTAINER_LABEL_RE =
  /^(bullet points?|talking points?|key points?|main points?|content|body|teacher notes?|speaker notes?|notes?)\s*:?\s*(.*)$/i;

/**
 * Turn one slide block into a title/subtitle/bullets, understanding both the
 * simple form (first line = title, rest = bullets) and the labeled form
 * (Heading:/Title:/Subtitle:/Bullet Points:/Visual Idea:). `label` is the
 * "Slide N: …" section name, used only as a fallback title.
 */
function parseSlideBlock(
  lines: string[],
  label: string,
): { title: string; subtitle: string; bullets: string[]; imagePrompt: string } {
  let heading = "";
  let titleField = "";
  let subtitle = "";
  let visual = "";
  let sawField = false;
  const content: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    const fm = line.match(FIELD_RE);
    if (fm) {
      sawField = true;
      const key = fm[1].toLowerCase();
      const val = fm[2].trim();
      if (key === "heading") heading ||= val;
      else if (key === "title") titleField ||= val;
      else if (key.startsWith("sub")) subtitle ||= val;
      else visual ||= val; // "visual idea" / "image"
      continue;
    }
    const cm = line.match(CONTAINER_LABEL_RE);
    if (cm) {
      sawField = true;
      const val = cm[2].trim();
      if (val) content.push(cleanBullet(val));
      continue;
    }
    content.push(cleanBullet(line));
  }

  let title = heading || titleField;
  if (!title && !sawField) title = content.shift() ?? ""; // simple form: first line is the title
  if (!title) title = label;
  return { title: title.trim(), subtitle: subtitle.trim(), bullets: content.filter(Boolean), imagePrompt: visual.trim() };
}

/**
 * Parse a metadata preamble (the block before the first "Slide N") for grade,
 * topic, learning objectives, and standards.
 */
function parsePreamble(lines: string[]): { grade: string; topic: string; objectives: string[]; standards: string[] } {
  let grade = "";
  let topic = "";
  const objectives: string[] = [];
  const standards: string[] = [];
  let section: "none" | "standards" | "objectives" = "none";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(?:target )?grade level\s*:\s*(.+)$/i))) {
      grade = detectGrade(m[1]) || m[1].trim();
      section = "none";
      continue;
    }
    if ((m = line.match(/^(?:topic|subject\/topic|lesson topic)\s*:\s*(.+)$/i))) {
      topic = m[1].trim();
      section = "none";
      continue;
    }
    if (/^(?:educational |curriculum )?standards\b/i.test(line)) {
      section = "standards";
      continue;
    }
    if (/^(?:learning |lesson )?objectives\b/i.test(line)) {
      section = "objectives";
      continue;
    }
    // A "…Slide Outline" / "Slides" / "Presentation" header ends the preamble
    // sections (so it isn't captured as an objective/standard).
    if (/^(?:powerpoint\s+)?slides?(?:\s+outline)?\b|^(?:presentation|lesson)\s+outline\b|^slide[-\s]?by[-\s]?slide\b/i.test(line)) {
      section = "none";
      continue;
    }
    if (section === "objectives") {
      if (/^(by the end|students will|learners will|swbat|the student)\b/i.test(line)) continue; // intro line
      objectives.push(cleanBullet(line).replace(/[.:;]+$/, "").trim());
    } else if (section === "standards") {
      const codes = detectStandards(line);
      if (codes.length) {
        for (const c of codes) standards.push(c);
        continue;
      }
      const colon = line.indexOf(":");
      const lbl = (colon > 0 ? line.slice(0, colon) : line).trim();
      if (lbl && lbl.length <= 80 && /[a-z]/i.test(lbl)) standards.push(lbl);
    }
  }
  return { grade, topic, objectives: objectives.filter(Boolean), standards };
}

/**
 * Parse pasted outline text into ready-to-edit slides. Returns null if no usable
 * content was found. Standards detected on a "Standards" slide are collected too.
 */
export function parseOutline(text: string): {
  slides: Slide[];
  title: string;
  topic: string;
  subject: string;
  yearGroup: string;
  objectives: string[];
  standards: string[];
} | null {
  const blocks = splitBlocks(text);
  const hasMarkers = blocks.some((b) => b.fromMarker);
  const standards = new Set<string>();
  const objectives: string[] = [];
  const slides: Slide[] = [];

  let lessonTitle = "";
  let topic = "";
  let yearGroup = "";

  for (const block of blocks) {
    const lines = tidy(block.lines);

    // Metadata preamble (before the first "Slide N") — parse, don't make a slide.
    if (!block.fromMarker && hasMarkers) {
      if (!lines.length) continue;
      const pre = parsePreamble(lines);
      if (pre.grade && !yearGroup) yearGroup = pre.grade;
      if (pre.topic && !topic) topic = pre.topic;
      for (const o of pre.objectives) objectives.push(o);
      for (const s of pre.standards) standards.add(s);
      continue;
    }
    if (!lines.length && !block.label) continue;

    const parsed = parseSlideBlock(lines, block.label);
    if (!parsed.title && !parsed.bullets.length) continue;

    const index = slides.length;
    let title = parsed.title;

    // First slide: lift the lesson title + any "(Grade N)" parenthetical.
    if (index === 0) {
      const gm = title.match(GRADE_PAREN_RE);
      if (gm) {
        if (!yearGroup) yearGroup = gm[1].trim();
        title = title.replace(GRADE_PAREN_RE, "").trim();
      }
      lessonTitle = title;
    }

    // Collect curriculum standards from a standards-style slide.
    if (STANDARDS_TITLE_RE.test(parsed.title)) {
      for (const b of parsed.bullets) {
        const code = leadingStandardCode(b);
        if (code) standards.add(code);
      }
    }

    const layout = pickLayout(index, title, parsed.bullets, block.label);
    const slide: Slide = { id: cid("sl"), layout, title };
    if (parsed.subtitle) slide.subtitle = parsed.subtitle;
    if (layout !== "title" && parsed.bullets.length) slide.bullets = parsed.bullets;
    // Seed a stock-image query so the optional free media pass has a target;
    // no image is embedded unless the teacher opts in.
    if (layout !== "title") slide.imageQuery = titleToQuery(title);
    // A "Visual Idea:" line becomes a rich prompt if the teacher later AI-generates.
    if (parsed.imagePrompt) slide.imagePrompt = parsed.imagePrompt;
    slides.push(slide);
  }

  if (!slides.length) return null;

  // Fill gaps by scanning the whole text (grade from anywhere, subject by
  // keywords, plus any standard codes written inline, not just on a standards slide).
  if (!yearGroup) yearGroup = detectGrade(text);
  for (const code of detectStandards(text)) standards.add(code);
  const subject = detectSubject(text, yearGroup);
  const title = lessonTitle || topic || slides[0].title;

  return {
    slides,
    title,
    topic: topic || title,
    subject,
    yearGroup,
    objectives: [...new Set(objectives)],
    standards: [...standards],
  };
}

/** Lightweight preview for the import dialog without building the full Lesson. */
export function previewOutline(text: string, opts: ImportOptions = {}): ImportPreview | null {
  const parsed = parseOutline(text);
  if (!parsed) return null;
  return {
    title: parsed.title,
    subject: opts.subject?.trim() || parsed.subject,
    yearGroup: opts.yearGroup?.trim() || parsed.yearGroup,
    slideCount: parsed.slides.length,
    objectiveCount: parsed.objectives.length,
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
      subject: opts.subject?.trim() || parsed.subject,
      topic: parsed.topic,
      yearGroup: opts.yearGroup?.trim() || parsed.yearGroup,
      region: opts.region?.trim() || "",
      durationMinutes: 45,
      summary: "",
      objectives: parsed.objectives,
      vocabulary: [],
      ...(parsed.standards.length ? { standards: parsed.standards } : {}),
    },
    slides: parsed.slides,
  };
}
