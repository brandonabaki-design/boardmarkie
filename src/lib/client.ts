"use client";

import Anthropic from "@anthropic-ai/sdk";
import { DIAGRAM_MODEL, NO_KEY_MESSAGE } from "./anthropic";
import { getApiKey, getModel } from "./storage";
import { diagramSchema, lessonSchema, outlineSchema, seriesSchema, simExtractSchema, worksheetSchema } from "./schemas";
import { GRADE_LEVELS, SUBJECTS } from "./taxonomy";
import {
  lessonSystemPrompt,
  lessonUserPrompt,
  seriesSystemPrompt,
  seriesUserPrompt,
  worksheetSystemPrompt,
  worksheetUserPrompt,
  editSystemPrompt,
  editUserPrompt,
  editWorksheetSystemPrompt,
  editWorksheetUserPrompt,
  outlineSystemPrompt,
  outlineUserPrompt,
  diagramSystemPrompt,
  diagramUserPrompt,
} from "./prompts";
import { runStructured, toLesson, toOutline, toSeries, toWorksheet } from "./generate";
import { isHostedMode, getBackendBase, getIdToken } from "./backend";
import type { Artifact, EditRequest, GenerateRequest, Lesson, OutlineSlide, Worksheet } from "./types";

function err(message: string, status?: number): Error & { status?: number } {
  const e = new Error(message) as Error & { status?: number };
  if (status) e.status = status;
  return e;
}

/**
 * Build an Anthropic client for the current mode.
 *
 * Hosted ("school") mode: the SDK is pointed at our reverse proxy, which holds
 * the shared key and verifies the user's Google sign-in token — so the key is
 * never in the browser and generation requires sign-in.
 *
 * Bring-your-own mode (local/dev, no backend env): the client runs directly in
 * the browser with the user's own key. dangerouslyAllowBrowser is intended
 * exactly for BYO-key apps like this one.
 */
async function browserClient(): Promise<Anthropic> {
  if (isHostedMode()) {
    const token = await getIdToken(); // throws 401 (→ sign-in wall) if signed out
    return new Anthropic({
      baseURL: `${getBackendBase()}/anthropic`,
      apiKey: "hosted", // ignored; the real key is injected by the proxy
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        Authorization: `Bearer ${token}`,
        "anthropic-dangerous-direct-browser-access": "true",
      },
    });
  }
  const apiKey = getApiKey();
  if (!apiKey) throw err(NO_KEY_MESSAGE, 401);
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: { "anthropic-dangerous-direct-browser-access": "true" },
  });
}

function normalize(req: GenerateRequest): GenerateRequest {
  return {
    ...req,
    topic: req.topic.trim(),
    subject: req.subject?.trim() || "General",
    yearGroup: req.yearGroup?.trim() || "Year 7",
    region: req.region?.trim() || "United Kingdom (National Curriculum)",
  };
}

/** A fast, lightweight lesson outline for the teacher to refine before the full
 *  lesson is generated. Uses the user's chosen (default fast) model. */
export async function generateOutline(input: GenerateRequest): Promise<OutlineSlide[]> {
  const client = await browserClient();
  const req = normalize(input);
  const raw = await runStructured<{ slides?: unknown }>({
    client,
    system: outlineSystemPrompt(),
    user: outlineUserPrompt(req),
    schema: outlineSchema,
    maxTokens: 3000,
    model: getModel(),
  });
  return toOutline(raw);
}

export async function generateArtifact(input: GenerateRequest): Promise<Artifact> {
  const client = await browserClient();
  const req = normalize(input);

  if (req.mode === "worksheet") {
    const raw = await runStructured({
      client,
      system: worksheetSystemPrompt(),
      user: worksheetUserPrompt(req),
      schema: worksheetSchema,
      maxTokens: 12000,
      model: getModel(),
    });
    return toWorksheet(raw as never, req);
  }

  if (req.mode === "series") {
    const raw = await runStructured({
      client,
      system: seriesSystemPrompt(),
      user: seriesUserPrompt(req),
      schema: seriesSchema,
      maxTokens: 10000,
      model: getModel(),
    });
    return toSeries(raw as never, req);
  }

  const raw = await runStructured({
    client,
    system: lessonSystemPrompt(),
    user: lessonUserPrompt(req),
    schema: lessonSchema,
    maxTokens: 24000,
    model: getModel(),
  });
  return toLesson(raw as never, req);
}

export async function editLesson(input: EditRequest): Promise<Lesson> {
  const client = await browserClient();
  const { lesson, action, slideId, instruction } = input;

  const slideTitle = slideId ? lesson.slides.find((s) => s.id === slideId)?.title : undefined;

  const lessonForModel = {
    title: lesson.meta.title,
    summary: lesson.meta.summary,
    objectives: lesson.meta.objectives,
    vocabulary: lesson.meta.vocabulary,
    standards: lesson.meta.standards ?? [],
    slides: lesson.slides.map(({ id: _id, ...rest }) => rest),
  };

  const req: GenerateRequest = {
    mode: "lesson",
    topic: lesson.meta.topic,
    subject: lesson.meta.subject,
    yearGroup: lesson.meta.yearGroup,
    region: lesson.meta.region,
    durationMinutes: lesson.meta.durationMinutes,
  };

  const raw = await runStructured({
    client,
    system: editSystemPrompt(),
    user: editUserPrompt(action, JSON.stringify(lessonForModel), instruction, slideTitle),
    schema: lessonSchema,
    maxTokens: 24000,
    effort: "low",
    model: getModel(),
  });

  const updated = toLesson(raw as never, req);
  updated.id = lesson.id;
  updated.createdAt = lesson.createdAt;
  return updated;
}

export async function editWorksheet(input: { worksheet: Worksheet; instruction: string }): Promise<Worksheet> {
  const client = await browserClient();
  const { worksheet, instruction } = input;

  const worksheetForModel = {
    title: worksheet.meta.title,
    instructions: worksheet.meta.instructions,
    sections: worksheet.sections,
  };

  const req: GenerateRequest = {
    mode: "worksheet",
    topic: worksheet.meta.topic,
    subject: worksheet.meta.subject,
    yearGroup: worksheet.meta.yearGroup,
    region: worksheet.meta.region,
  };

  const raw = await runStructured({
    client,
    system: editWorksheetSystemPrompt(),
    user: editWorksheetUserPrompt(JSON.stringify(worksheetForModel), instruction),
    schema: worksheetSchema,
    maxTokens: 12000,
    effort: "low",
    model: getModel(),
  });

  const updated = toWorksheet(raw as never, req);
  updated.id = worksheet.id;
  updated.createdAt = worksheet.createdAt;
  return updated;
}

export interface DiagramRequest {
  topic: string;
  subject: string;
  yearGroup: string;
  region: string;
  slideTitle?: string;
  instruction?: string;
}

/**
 * Generate an accurate, labelled diagram as SVG via Claude (stays in the
 * browser-only Claude flow — no image provider). Returns sanitized SVG markup.
 */
export async function generateDiagram(
  input: DiagramRequest,
): Promise<{ title: string; svg: string; alt: string }> {
  const client = await browserClient();
  const raw = await runStructured<{ title?: string; svg?: string; alt?: string }>({
    client,
    system: diagramSystemPrompt(),
    user: diagramUserPrompt(input),
    schema: diagramSchema,
    maxTokens: 16000,
    effort: "high",
    think: true,
    model: DIAGRAM_MODEL,
  });

  const svg = sanitizeSvg(typeof raw.svg === "string" ? raw.svg : "");
  if (!svg) throw err("The diagram couldn't be generated. Try again.");

  return {
    title: typeof raw.title === "string" ? raw.title : "",
    svg,
    alt: typeof raw.alt === "string" ? raw.alt : "",
  };
}

// ---- EduSim: auto-categorise a pasted simulation ----

export interface SimMetadata {
  title: string;
  description: string;
  grade_level: string;
  subject: string;
  concepts: string[];
  standards: string[];
}

export interface SimMetadataContext {
  topic?: string;
  subject?: string;
  yearGroup?: string;
}

const cleanStr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const cleanArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(cleanStr).filter(Boolean) : [];

/** Match a model-supplied value to a controlled-vocabulary list (lenient). */
function matchVocab(value: string, list: readonly string[]): string {
  const v = value.trim().toLowerCase();
  if (!v) return "";
  const exact = list.find((o) => o.toLowerCase() === v);
  if (exact) return exact;
  const partial = list.find((o) => {
    const lo = o.toLowerCase();
    return lo.startsWith(v) || v.startsWith(lo) || lo.includes(v) || v.includes(lo);
  });
  return partial ?? "";
}

/**
 * Read the HTML of a pasted simulation and infer catalogue metadata (title,
 * description, grade, subject, concepts, standards) via Claude structured output.
 * grade/subject are validated against the controlled lists. Optional lesson
 * context nudges the model toward the right classification.
 */
export async function extractSimMetadata(
  html: string,
  context: SimMetadataContext = {},
): Promise<SimMetadata> {
  const client = await browserClient();

  const system =
    "You are a meticulous teacher's aide cataloguing interactive classroom simulations. " +
    "Given the HTML source of a simulation, infer concise, accurate metadata so it can be " +
    "filed in a shared library. Choose grade_level and subject ONLY from the controlled lists " +
    "in the user message; if you genuinely cannot tell, return an empty string. Keep concepts to " +
    "2–5 short topic phrases. Include standards only when clearly identifiable.";

  // Cap the HTML so we don't blow the token budget; titles/labels/headings (the
  // most informative parts) almost always sit near the top of the document.
  const trimmed = html.slice(0, 60000);
  const hints = [
    context.topic ? `Lesson topic (hint): ${context.topic}` : "",
    context.subject ? `Lesson subject (hint): ${context.subject}` : "",
    context.yearGroup ? `Lesson grade/year (hint): ${context.yearGroup}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const user =
    `Controlled grade levels: ${GRADE_LEVELS.join(", ")}\n` +
    `Controlled subjects: ${SUBJECTS.join(", ")}\n` +
    (hints ? `${hints}\n` : "") +
    `\nSimulation HTML:\n${trimmed}`;

  const raw = await runStructured<Partial<SimMetadata>>({
    client,
    system,
    user,
    schema: simExtractSchema,
    maxTokens: 1500,
    effort: "low",
    model: getModel(),
  });

  return {
    title: cleanStr(raw.title),
    description: cleanStr(raw.description),
    grade_level: matchVocab(cleanStr(raw.grade_level), GRADE_LEVELS),
    subject: matchVocab(cleanStr(raw.subject), SUBJECTS),
    concepts: cleanArr(raw.concepts).slice(0, 8),
    standards: cleanArr(raw.standards).slice(0, 12),
  };
}

/**
 * Minimal hardening for model-generated SVG that we render as HTML: keep only
 * the <svg>…</svg> document and strip scripts, foreignObject, inline event
 * handlers, and javascript: URLs.
 */
function sanitizeSvg(input: string): string {
  const start = input.indexOf("<svg");
  const end = input.lastIndexOf("</svg>");
  if (start === -1 || end === -1 || end < start) return "";
  let svg = input.slice(start, end + 6);
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  svg = svg.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  svg = svg.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  svg = svg.replace(/(href|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "");
  return svg;
}
