import type Anthropic from "@anthropic-ai/sdk";
import { MODEL, supportsEffort } from "./anthropic";
import { jsonFormat } from "./schemas";
import type {
  GenerateRequest,
  Lesson,
  LessonSeries,
  Slide,
  VocabItem,
  Worksheet,
} from "./types";

export function rid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

interface RunArgs {
  client: Anthropic;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  model?: string;
}

/**
 * Calls Claude with a JSON-schema structured output and returns the parsed
 * object. Streaming is used so large generations don't hit request timeouts.
 */
export async function runStructured<T = unknown>({
  client,
  system,
  user,
  schema,
  maxTokens = 16000,
  effort = "medium",
  model = MODEL,
}: RunArgs): Promise<T> {
  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system,
    // `effort` is rejected by Haiku; only send it to models that support it.
    output_config: supportsEffort(model)
      ? { effort, format: jsonFormat(schema) }
      : { format: jsonFormat(schema) },
    messages: [{ role: "user", content: user }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("The request was declined. Try rephrasing your topic.");
  }

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");

  return parseJson<T>(text);
}

export function parseJson<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Fallback: extract the outermost JSON object if wrapped in prose/fences.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error("Could not parse the model's response.");
  }
}

// ---- raw → clean mappers ----

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function cleanVocab(v: unknown): VocabItem[] {
  return arr<{ term?: unknown; definition?: unknown }>(v)
    .map((x) => ({ term: str(x?.term), definition: str(x?.definition) }))
    .filter((x) => x.term.length > 0);
}

interface RawSlide {
  layout?: string;
  title?: unknown;
  subtitle?: unknown;
  bullets?: unknown;
  body?: unknown;
  teacherNotes?: unknown;
  vocabulary?: unknown;
  activity?: { title?: unknown; instructions?: unknown; durationMinutes?: unknown; grouping?: unknown };
  discussionQuestions?: unknown;
  quiz?: unknown;
  imagePrompt?: unknown;
  imageAlt?: unknown;
  youtube?: { title?: unknown; searchQuery?: unknown };
}

const LAYOUTS = new Set([
  "title",
  "objectives",
  "content",
  "vocabulary",
  "activity",
  "discussion",
  "video",
  "quiz",
  "plenary",
]);

function cleanSlide(raw: RawSlide): Slide {
  const layout = (typeof raw.layout === "string" && LAYOUTS.has(raw.layout)
    ? raw.layout
    : "content") as Slide["layout"];

  const slide: Slide = { id: rid("sl"), layout, title: str(raw.title) || "Untitled slide" };

  if (str(raw.subtitle)) slide.subtitle = str(raw.subtitle);

  const bullets = arr<unknown>(raw.bullets).map(str).filter(Boolean);
  if (bullets.length) slide.bullets = bullets;

  if (str(raw.body)) slide.body = str(raw.body);
  if (str(raw.teacherNotes)) slide.teacherNotes = str(raw.teacherNotes);

  const vocab = cleanVocab(raw.vocabulary);
  if (vocab.length) slide.vocabulary = vocab;

  if (raw.activity && str(raw.activity.title)) {
    const d = Number(raw.activity.durationMinutes);
    slide.activity = {
      title: str(raw.activity.title),
      instructions: str(raw.activity.instructions),
      durationMinutes: Number.isFinite(d) ? d : 0,
      grouping: str(raw.activity.grouping),
    };
  }

  const discuss = arr<unknown>(raw.discussionQuestions).map(str).filter(Boolean);
  if (discuss.length) slide.discussionQuestions = discuss;

  const quiz = arr<{ question?: unknown; options?: unknown; answer?: unknown }>(raw.quiz)
    .map((q) => ({
      question: str(q?.question),
      options: arr<unknown>(q?.options).map(str).filter(Boolean),
      answer: str(q?.answer),
    }))
    .filter((q) => q.question.length > 0);
  if (quiz.length) slide.quiz = quiz;

  if (str(raw.imagePrompt)) slide.imagePrompt = str(raw.imagePrompt);
  if (str(raw.imageAlt)) slide.imageAlt = str(raw.imageAlt);

  if (raw.youtube && (str(raw.youtube.title) || str(raw.youtube.searchQuery))) {
    slide.youtube = { title: str(raw.youtube.title), searchQuery: str(raw.youtube.searchQuery) };
  }

  return slide;
}

interface RawLesson {
  title?: unknown;
  summary?: unknown;
  objectives?: unknown;
  vocabulary?: unknown;
  standards?: unknown;
  slides?: unknown;
}

export function toLesson(raw: RawLesson, req: GenerateRequest): Lesson {
  const slides = arr<RawSlide>(raw.slides).map(cleanSlide);
  return {
    id: rid("lesson"),
    kind: "lesson",
    createdAt: Date.now(),
    meta: {
      title: str(raw.title) || req.topic,
      subject: req.subject,
      topic: req.topic,
      yearGroup: req.yearGroup,
      region: req.region,
      durationMinutes: req.durationMinutes ?? 60,
      summary: str(raw.summary),
      objectives: arr<unknown>(raw.objectives).map(str).filter(Boolean),
      vocabulary: cleanVocab(raw.vocabulary),
      standards: arr<unknown>(raw.standards).map(str).filter(Boolean),
    },
    slides: slides.length ? slides : [{ id: rid("sl"), layout: "title", title: req.topic }],
  };
}

interface RawWorksheet {
  title?: unknown;
  instructions?: unknown;
  sections?: unknown;
}

export function toWorksheet(raw: RawWorksheet, req: GenerateRequest): Worksheet {
  let n = 0;
  const sections = arr<{ title?: unknown; instructions?: unknown; questions?: unknown }>(raw.sections).map(
    (sec) => ({
      title: str(sec?.title) || "Questions",
      instructions: str(sec?.instructions) || undefined,
      questions: arr<{
        prompt?: unknown;
        type?: unknown;
        options?: unknown;
        answer?: unknown;
        marks?: unknown;
      }>(sec?.questions).map((q) => {
        n += 1;
        const marks = Number(q?.marks);
        const allowed = ["short", "long", "mcq", "fill", "truefalse", "matching"];
        const type = (allowed.includes(String(q?.type)) ? q?.type : "short") as Worksheet["sections"][number]["questions"][number]["type"];
        return {
          number: n,
          prompt: str(q?.prompt),
          type,
          options: arr<unknown>(q?.options).map(str).filter(Boolean),
          answer: str(q?.answer) || undefined,
          marks: Number.isFinite(marks) && marks > 0 ? marks : undefined,
        };
      }),
    }),
  );

  return {
    id: rid("ws"),
    kind: "worksheet",
    createdAt: Date.now(),
    meta: {
      title: str(raw.title) || `${req.topic} — Worksheet`,
      subject: req.subject,
      topic: req.topic,
      yearGroup: req.yearGroup,
      region: req.region,
      instructions: str(raw.instructions),
    },
    sections,
  };
}

interface RawSeries {
  title?: unknown;
  summary?: unknown;
  lessons?: unknown;
}

export function toSeries(raw: RawSeries, req: GenerateRequest): LessonSeries {
  let n = 0;
  const lessons = arr<{
    title?: unknown;
    objective?: unknown;
    summary?: unknown;
    keyActivities?: unknown;
  }>(raw.lessons).map((l) => {
    n += 1;
    return {
      number: n,
      title: str(l?.title) || `Lesson ${n}`,
      objective: str(l?.objective),
      summary: str(l?.summary),
      keyActivities: arr<unknown>(l?.keyActivities).map(str).filter(Boolean),
    };
  });

  return {
    id: rid("series"),
    kind: "series",
    createdAt: Date.now(),
    meta: {
      title: str(raw.title) || `${req.topic} — Unit`,
      subject: req.subject,
      topic: req.topic,
      yearGroup: req.yearGroup,
      region: req.region,
      summary: str(raw.summary),
    },
    lessons,
  };
}
