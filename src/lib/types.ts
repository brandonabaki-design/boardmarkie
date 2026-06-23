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
  imageQuery?: string; // short keywords for stock-image search
  gifQuery?: string; // concrete, visual keywords for GIF search (when a GIF fits)
  imageUrl?: string; // generated illustration or searched image/GIF URL
  diagramSvg?: string; // Claude-generated, sanitized SVG diagram markup
  youtube?: { title: string; searchQuery: string };
  elements?: CanvasElement[]; // freeform canvas layout (Canva/PPT-style editor)
  background?: string; // slide background colour (hex)
}

// ---- Freeform canvas elements (Canva / PowerPoint-style editor) ----
// Positions and sizes are PERCENTAGES of the slide canvas (0–100) so they scale
// responsively across the editor, thumbnails, Present mode, and exports.

export type CanvasElementType = "text" | "image" | "shape" | "youtube";

interface CanvasElementBase {
  id: string;
  type: CanvasElementType;
  x: number; // % from left of canvas
  y: number; // % from top of canvas
  w: number; // % width
  h: number; // % height
  z: number; // stacking order (higher = front)
}

export interface TextElement extends CanvasElementBase {
  type: "text";
  text: string;
  fontSize: number; // % of canvas height (rendered via cqh units)
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  color?: string; // hex
  font?: "display" | "body";
}

export interface ImageElement extends CanvasElementBase {
  type: "image";
  src?: string; // data: or remote URL (raster)
  svg?: string; // sanitized SVG diagram markup (alternative to src)
  alt?: string;
  radius?: number; // corner rounding %
  opacity?: number; // 0–100
}

export interface ShapeElement extends CanvasElementBase {
  type: "shape";
  shape: "rect" | "ellipse";
  fill: string; // hex
  opacity?: number; // 0–100
}

export interface YoutubeElement extends CanvasElementBase {
  type: "youtube";
  videoId: string;
  title?: string;
}

export type CanvasElement = TextElement | ImageElement | ShapeElement | YoutubeElement;

export interface Lesson {
  id: string;
  kind: "lesson";
  createdAt: number;
  meta: LessonMeta;
  slides: Slide[];
  theme?: string; // deck theme id (see src/lib/themes.ts); defaults to "classic"
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
  readingLevel?: string; // e.g. "At grade level", "Below grade level (simpler)"
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
