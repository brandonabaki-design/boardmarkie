"use client";

import Anthropic from "@anthropic-ai/sdk";
import { DIAGRAM_MODEL, NO_KEY_MESSAGE } from "./anthropic";
import { getApiKey, getModel } from "./storage";
import { diagramSchema, lessonSchema, outlineSchema, seriesSchema, worksheetSchema } from "./schemas";
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
