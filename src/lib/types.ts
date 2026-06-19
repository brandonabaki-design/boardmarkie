// Core data model for Boardmarkie — AI lesson generator for teachers.

export type GenerationMode = "lesson" | "series" | "worksheet";

export interface LessonMeta {
  title: string;
  subject: string;
  topic: string;
  yearGroup: string;
  region: string;
  durationMinutes: number;
  summary: string;
  objectives: string[];
  vocabulary: VocabItem[];
  standards?: string[]; // curriculum standards this lesson aligns to
}

export interface VocabItem {
  term: string;
  definition: string;
}

export type SlideLayout =
  | "title"
  | "objectives"
  | "content"
  | "vocabulary"
  | "activity"
  | "discussion"
  | "video"
  | "quiz"
  | "plenary";

export interface SlideActivity {
  title: string;
  instructions: string;
  durationMinutes: number;
  grouping: string; // e.g. "Individual", "Pairs", "Small groups", "Whole class"
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  bullets?: string[];
  body?: string;
  teacherNotes?: string;
  vocabulary?: VocabItem[];
  activity?: SlideActivity;
  discussionQuestions?: string[];
  quiz?: QuizQuestion[];
  imagePrompt?: string;
  imageAlt?: string;
  imageUrl?: string; // generated illustration, stored as a data: URL
  diagramSvg?: string; // Claude-generated, sanitized SVG diagram markup
  youtube?: { title: string; searchQuery: string };
}

export interface Lesson {
  id: string;
  kind: "lesson";
  createdAt: number;
  meta: LessonMeta;
  slides: Slide[];
}

// ---- Worksheet ----

export type QuestionType =
  | "short"
  | "long"
  | "mcq"
  | "fill"
  | "truefalse"
  | "matching";

export interface WorksheetQuestion {
  number: number;
  prompt: string;
  type: QuestionType;
  options?: string[];
  answer?: string;
  marks?: number;
}

export interface WorksheetSection {
  title: string;
  instructions?: string;
  questions: WorksheetQuestion[];
}

export interface WorksheetMeta {
  title: string;
  subject: string;
  topic: string;
  yearGroup: string;
  region: string;
  instructions: string;
}

export interface Worksheet {
  id: string;
  kind: "worksheet";
  createdAt: number;
  meta: WorksheetMeta;
  sections: WorksheetSection[];
}

// ---- Lesson series ----

export interface SeriesLesson {
  number: number;
  title: string;
  objective: string;
  summary: string;
  keyActivities: string[];
}

export interface SeriesMeta {
  title: string;
  subject: string;
  topic: string;
  yearGroup: string;
  region: string;
  summary: string;
}

export interface LessonSeries {
  id: string;
  kind: "series";
  createdAt: number;
  meta: SeriesMeta;
  lessons: SeriesLesson[];
}

export type Artifact = Lesson | Worksheet | LessonSeries;

// ---- Request payloads ----

export interface GenerateRequest {
  mode: GenerationMode;
  topic: string;
  subject: string;
  yearGroup: string;
  region: string;
  durationMinutes?: number;
  slideCount?: number;
  lessonCount?: number;
  questionCount?: number;
  includeAnswers?: boolean;
  tone?: string;
  notes?: string;
  includeStandards?: boolean; // find & include curriculum standards (lessons)
  autoImages?: boolean; // generate slide illustrations during creation
}

export type EditAction =
  | "make_fun"
  | "simplify"
  | "advance"
  | "shorten"
  | "expand"
  | "add_slide"
  | "rewrite";

export interface EditRequest {
  lesson: Lesson;
  action: EditAction;
  slideId?: string; // when editing a single slide
  instruction?: string; // free-form for "rewrite"
}
