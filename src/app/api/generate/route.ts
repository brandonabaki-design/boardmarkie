import { NextRequest, NextResponse } from "next/server";
import { getClient, NO_KEY_MESSAGE } from "@/lib/anthropic";
import { lessonSchema, seriesSchema, worksheetSchema } from "@/lib/schemas";
import {
  lessonSystemPrompt,
  lessonUserPrompt,
  seriesSystemPrompt,
  seriesUserPrompt,
  worksheetSystemPrompt,
  worksheetUserPrompt,
} from "@/lib/prompts";
import { runStructured, toLesson, toSeries, toWorksheet } from "@/lib/generate";
import type { GenerateRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.topic?.trim()) {
    return NextResponse.json({ error: "Please enter a topic." }, { status: 400 });
  }

  const client = getClient(request.headers.get("x-user-key"));
  if (!client) {
    return NextResponse.json({ error: NO_KEY_MESSAGE }, { status: 401 });
  }

  const req: GenerateRequest = {
    mode: body.mode ?? "lesson",
    topic: body.topic.trim(),
    subject: body.subject?.trim() || "General",
    yearGroup: body.yearGroup?.trim() || "Year 7",
    region: body.region?.trim() || "United Kingdom (National Curriculum)",
    durationMinutes: body.durationMinutes,
    slideCount: body.slideCount,
    lessonCount: body.lessonCount,
    questionCount: body.questionCount,
    includeAnswers: body.includeAnswers,
    tone: body.tone,
    notes: body.notes,
  };

  try {
    if (req.mode === "worksheet") {
      const raw = await runStructured({
        client,
        system: worksheetSystemPrompt(),
        user: worksheetUserPrompt(req),
        schema: worksheetSchema,
        maxTokens: 12000,
      });
      return NextResponse.json({ artifact: toWorksheet(raw as never, req) });
    }

    if (req.mode === "series") {
      const raw = await runStructured({
        client,
        system: seriesSystemPrompt(),
        user: seriesUserPrompt(req),
        schema: seriesSchema,
        maxTokens: 10000,
      });
      return NextResponse.json({ artifact: toSeries(raw as never, req) });
    }

    const raw = await runStructured({
      client,
      system: lessonSystemPrompt(),
      user: lessonUserPrompt(req),
      schema: lessonSchema,
      maxTokens: 24000,
    });
    return NextResponse.json({ artifact: toLesson(raw as never, req) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    const status = /api key|authentication|x-api-key|401/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
