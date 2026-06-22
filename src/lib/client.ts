"use client";

import Anthropic from "@anthropic-ai/sdk";
import { NO_KEY_MESSAGE } from "./anthropic";
import { getApiKey, getModel } from "./storage";
import { diagramSchema, lessonSchema, seriesSchema, worksheetSchema } from "./schemas";
import {
  lessonSystemPrompt,
  lessonUserPrompt,
  seriesSystemPrompt,
  seriesUserPrompt,
  worksheetSystemPrompt,
  worksheetUserPrompt,
  editSystemPrompt,
  editUserPrompt,
  diagramSystemPrompt,
  diagramUserPrompt,
} from "./prompts";
import { runStructured, toLesson, toSeries, toWorksheet } from "./generate";
import type { Artifact, EditRequest, GenerateRequest, Lesson } from "./types";

function err(message: string, status?: number): Error & { status?: number } {
  const e = new Error(message) as Error & { status?: number };
  if (status) e.status = status;
  return e;
}

/**
 * Build an Anthropic client that runs in the browser with the user's own key.
 * dangerouslyAllowBrowser is intended exactly for bring-your-own-key apps like
 * this one — the key is the user's, entered locally, and sent straight to
 * Anthropic over HTTPS.
 */
function browserClient(): Anthropic {
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

export async function generateArtifact(input: GenerateRequest): Promise<Artifact> {
  const client = browserClient();
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
  const client = browserClient();
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
  const client = browserClient();
  const raw = await runStructured<{ title?: string; svg?: string; alt?: string }>({
    client,
    system: diagramSystemPrompt(),
    user: diagramUserPrompt(input),
    schema: diagramSchema,
    maxTokens: 8000,
    effort: "low",
    model: getModel(),
  });

  const svg = sanitizeSvg(typeof raw.svg === "string" ? raw.svg : "");
  if (!svg) throw err("The diagram couldn't be generated. Try again.");

  return {
    title: typeof raw.title === "string" ? raw.title : "",
    svg,
    alt: typeof raw.alt === "string" ? raw.alt : "",
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
