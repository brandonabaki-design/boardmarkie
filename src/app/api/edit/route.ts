import { NextRequest, NextResponse } from "next/server";
import { getClient, NO_KEY_MESSAGE } from "@/lib/anthropic";
import { lessonSchema } from "@/lib/schemas";
import { editSystemPrompt, editUserPrompt } from "@/lib/prompts";
import { runStructured, toLesson } from "@/lib/generate";
import type { EditRequest, GenerateRequest, Lesson } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let body: EditRequest;
  try {
    body = (await request.json()) as EditRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const lesson = body.lesson;
  if (!lesson || lesson.kind !== "lesson") {
    return NextResponse.json({ error: "A lesson is required to edit." }, { status: 400 });
  }

  const client = getClient(request.headers.get("x-user-key"));
  if (!client) {
    return NextResponse.json({ error: NO_KEY_MESSAGE }, { status: 401 });
  }

  const slideTitle = body.slideId
    ? lesson.slides.find((s) => s.id === body.slideId)?.title
    : undefined;

  // Send a slimmed-down lesson to the model (ids are regenerated on the way back).
  const lessonForModel = {
    title: lesson.meta.title,
    summary: lesson.meta.summary,
    objectives: lesson.meta.objectives,
    vocabulary: lesson.meta.vocabulary,
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

  try {
    const raw = await runStructured({
      client,
      system: editSystemPrompt(),
      user: editUserPrompt(body.action, JSON.stringify(lessonForModel), body.instruction, slideTitle),
      schema: lessonSchema,
      maxTokens: 24000,
      effort: "low",
    });

    const updated: Lesson = toLesson(raw as never, req);
    // Preserve identity so it replaces the original in the library.
    updated.id = lesson.id;
    updated.createdAt = lesson.createdAt;
    return NextResponse.json({ artifact: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed.";
    const status = /api key|authentication|x-api-key|401/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
