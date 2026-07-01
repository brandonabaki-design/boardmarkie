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

export type CanvasElementType = "text" | "image" | "shape" | "youtube" | "audio" | "video";

interface CanvasElementBase {
  id: string;
  type: CanvasElementType;
  x: number; // % from left of canvas
  y: number; // % from top of canvas
  w: number; // % width
  h: number; // % height
  z: number; // stacking order (higher = front)
  linkUrl?: string; // clickable link (opens in Present/view mode + exports as a hyperlink)
}

export interface TextElement extends CanvasElementBase {
  type: "text";
  text: string;
  // Optional rich inline formatting (sanitized HTML) for per-selection bold/
  // italic/size. When present it's the source of truth for on-screen rendering;
  // `text` is kept as a markdown mirror for exports/search/legacy.
  html?: string;
  fontSize: number; // % of canvas height (rendered via cqh units)
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  color?: string; // hex
  font?: "display" | "body";
  // Background plate behind the text for readability. A hex colour, or
  // "transparent" for an explicit none. Undefined = auto: a subtle plate is shown
  // only when a subject background theme is active (so themes never hurt reading).
  bg?: string;
}

export interface ImageElement extends CanvasElementBase {
  type: "image";
  src?: string; // data: or remote URL (raster)
  svg?: string; // sanitized SVG diagram markup (alternative to src)
  alt?: string;
  radius?: number; // corner rounding %
  opacity?: number; // 0–100
  eduSimUrl?: string; // set when this image is an EduSim QR code (links to a simulation)
}

export interface ShapeElement extends CanvasElementBase {
  type: "shape";
  shape: "rect" | "ellipse";
  fill: string; // hex, or "transparent"
  opacity?: number; // 0–100
  radius?: number; // corner radius in cqh (rect only)
  stroke?: string; // border colour (hex)
  strokeWidth?: number; // border width in cqh
}

export interface YoutubeElement extends CanvasElementBase {
  type: "youtube";
  videoId: string;
  title?: string;
}

export interface AudioElement extends CanvasElementBase {
  type: "audio";
  src: string; // audio file URL (e.g. a NotebookLM overview uploaded to storage)
  title?: string;
  artworkSvg?: string; // optional decorative SVG behind the player (e.g. a podcast cover)
}

export interface VideoElement extends CanvasElementBase {
  type: "video";
  src: string; // uploaded video file URL (e.g. a NotebookLM video overview)
  title?: string;
}

export type CanvasElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | YoutubeElement
  | AudioElement
  | VideoElement;

export interface Lesson {
  id: string;
  kind: "lesson";
  createdAt: number;
  updatedAt?: number; // last edit time; used for cross-device sync conflict resolution
  meta: LessonMeta;
  slides: Slide[];
  theme?: string; // deck theme id (see src/lib/themes.ts); defaults to "classic"
  // Subject background theme (see src/lib/backgroundThemes.ts). Undefined/"auto"
  // auto-selects by subject; "none" disables; otherwise an explicit theme id.
  backgroundTheme?: string;
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
  updatedAt?: number; // last edit time; used for cross-device sync conflict resolution
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
  updatedAt?: number; // last edit time; used for cross-device sync conflict resolution
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
  outline?: OutlineSlide[]; // approved outline to expand into a full lesson
}

// A lightweight, editable lesson plan produced before full generation
// (the "Refine" step of the create wizard).
export interface OutlineSlide {
  title: string;
  layout: SlideLayout;
  summary: string;
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
