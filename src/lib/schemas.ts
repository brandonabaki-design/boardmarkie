// JSON Schemas for Claude structured outputs.
//
// Every object sets additionalProperties:false and lists ALL properties as
// required — this is the most portable form of structured output. The model
// fills non-applicable fields with empty strings / empty arrays, and the API
// route prunes those into clean optional fields before returning to the client.

type JSONSchema = Record<string, unknown>;

const vocabItem: JSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    term: { type: "string", description: "Key word or phrase." },
    definition: {
      type: "string",
      description: "Student-friendly definition of the term.",
    },
  },
  required: ["term", "definition"],
};

const slideSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    layout: {
      type: "string",
      enum: [
        "title",
        "objectives",
        "content",
        "vocabulary",
        "activity",
        "discussion",
        "video",
        "quiz",
        "plenary",
      ],
      description: "The purpose/format of the slide.",
    },
    title: { type: "string", description: "Slide heading." },
    subtitle: {
      type: "string",
      description: "Optional supporting line. Empty string if not needed.",
    },
    bullets: {
      type: "array",
      items: { type: "string" },
      description:
        "Concise teaching points shown on the slide. Empty array if the slide uses another field instead.",
    },
    body: {
      type: "string",
      description:
        "A short paragraph of explanation when bullets aren't suitable. Empty string if unused.",
    },
    teacherNotes: {
      type: "string",
      description:
        "Speaker notes: what the teacher says or does on this slide. Always provide helpful notes.",
    },
    vocabulary: {
      type: "array",
      items: vocabItem,
      description: "Key vocabulary for a vocabulary slide. Empty array otherwise.",
    },
    activity: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", description: "Activity name. Empty if no activity." },
        instructions: {
          type: "string",
          description: "Clear step-by-step instructions for students.",
        },
        durationMinutes: {
          type: "integer",
          description: "Suggested minutes for the activity, or 0 if none.",
        },
        grouping: {
          type: "string",
          description:
            "How students work, e.g. Individual, Pairs, Small groups, Whole class. Empty if none.",
        },
      },
      required: ["title", "instructions", "durationMinutes", "grouping"],
    },
    discussionQuestions: {
      type: "array",
      items: { type: "string" },
      description: "Open questions to spark discussion. Empty array otherwise.",
    },
    quiz: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
            description: "Multiple-choice options (3-4). Empty array for open questions.",
          },
          answer: { type: "string", description: "The correct answer." },
        },
        required: ["question", "options", "answer"],
      },
      description: "Quiz/check-for-understanding questions. Empty array otherwise.",
    },
    imagePrompt: {
      type: "string",
      description:
        "A vivid description of an illustrative image for this slide. Empty string if not needed.",
    },
    imageAlt: {
      type: "string",
      description: "Short alt text for the suggested image. Empty if no image.",
    },
    imageQuery: {
      type: "string",
      description:
        "2-4 plain, SPECIFIC keywords to find a stock PHOTO that depicts this slide's concrete subject via image search (e.g. 'water cycle diagram', 'volcano eruption', 'cheering students'). Name the actual thing to picture, and disambiguate ambiguous words with the subject so search finds the right meaning (e.g. 'plant cell biology' not just 'cell', 'ancient roman colosseum' not just 'rome'). Avoid abstract or generic terms ('learning', 'success'). Empty string if the slide needs no image.",
    },
    gifQuery: {
      type: "string",
      description:
        "1-3 word CONCRETE, VISUAL subject for a fun looping GIF, chosen so a mainstream GIF site (Giphy) is likely to actually have a good match — real-world things, animals, actions, weather, space, or reactions (e.g. 'volcano erupting', 'rain', 'beating heart', 'galaxy', 'celebration', 'thinking'). Use ONLY where a short GIF genuinely adds energy or illustrates the idea; LEAVE EMPTY ('') for abstract points, detailed processes, diagrams, or when a still photo is clearly better. Do NOT force a GIF onto every slide — a few per lesson at most.",
    },
    youtube: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: {
          type: "string",
          description: "Title of a suggested YouTube clip, or empty string.",
        },
        searchQuery: {
          type: "string",
          description: "A YouTube search query to find a suitable clip, or empty string.",
        },
      },
      required: ["title", "searchQuery"],
    },
  },
  required: [
    "layout",
    "title",
    "subtitle",
    "bullets",
    "body",
    "teacherNotes",
    "vocabulary",
    "activity",
    "discussionQuestions",
    "quiz",
    "imagePrompt",
    "imageAlt",
    "imageQuery",
    "gifQuery",
    "youtube",
  ],
};

export const lessonSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "An engaging lesson title." },
    summary: {
      type: "string",
      description: "One or two sentences describing the lesson for the teacher.",
    },
    objectives: {
      type: "array",
      items: { type: "string" },
      description:
        "3–4 learning objectives ('I can…' / 'Students will…') that span three cognitive levels of Bloom's Taxonomy / DOK: at least one lower-order (Remember/Understand · DOK 1), one mid-order (Apply/Analyse · DOK 2), and one higher-order (Evaluate/Create · DOK 3); each starts with a measurable verb, ordered lower→higher.",
    },
    vocabulary: {
      type: "array",
      items: vocabItem,
      description: "Key vocabulary for the whole lesson.",
    },
    standards: {
      type: "array",
      items: { type: "string" },
      description:
        "Official curriculum standard(s) this lesson aligns to for the given subject, year group/grade and region — each as its code plus a short description (e.g. 'NGSS 5-PS1-1: …', 'CCSS.MATH.CONTENT.4.NF.B.3: …', 'National Curriculum KS2 Science: …'). Empty array if standards were not requested.",
    },
    slides: {
      type: "array",
      items: slideSchema,
      description: "The ordered slides that make up the lesson.",
    },
  },
  required: ["title", "summary", "objectives", "vocabulary", "standards", "slides"],
};

// A fast, lightweight lesson outline (titles + layout + one-line summary),
// shown for the teacher to refine before the full lesson is generated.
export const outlineSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "Slide heading." },
          layout: {
            type: "string",
            enum: [
              "title",
              "objectives",
              "content",
              "vocabulary",
              "activity",
              "discussion",
              "video",
              "quiz",
              "plenary",
            ],
            description: "The purpose/format of the slide.",
          },
          summary: { type: "string", description: "One short sentence: what this slide covers." },
        },
        required: ["title", "layout", "summary"],
      },
      description: "The ordered slides that will make up the lesson.",
    },
  },
  required: ["slides"],
};

export const worksheetSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    instructions: {
      type: "string",
      description: "Overall instructions shown at the top of the worksheet.",
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          instructions: { type: "string", description: "Instructions for this section, or empty." },
          questions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                number: { type: "integer" },
                prompt: { type: "string" },
                type: {
                  type: "string",
                  enum: ["short", "long", "mcq", "fill", "truefalse", "matching"],
                },
                options: {
                  type: "array",
                  items: { type: "string" },
                  description: "Options for multiple choice / matching. Empty array otherwise.",
                },
                answer: {
                  type: "string",
                  description: "The answer for the answer key. Empty string if open-ended.",
                },
                marks: { type: "integer", description: "Marks available, or 0." },
              },
              required: ["number", "prompt", "type", "options", "answer", "marks"],
            },
          },
        },
        required: ["title", "instructions", "questions"],
      },
    },
  },
  required: ["title", "instructions", "sections"],
};

export const seriesSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "Title for the unit / scheme of work." },
    summary: { type: "string", description: "Overview of the unit." },
    lessons: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          number: { type: "integer" },
          title: { type: "string" },
          objective: { type: "string", description: "The main objective for this lesson." },
          summary: { type: "string", description: "What the lesson covers." },
          keyActivities: {
            type: "array",
            items: { type: "string" },
            description: "2-4 headline activities for the lesson.",
          },
        },
        required: ["number", "title", "objective", "summary", "keyActivities"],
      },
    },
  },
  required: ["title", "summary", "lessons"],
};

// Accurate, labelled diagrams are produced by Claude as self-contained SVG —
// this stays in the browser-only Claude flow (no image provider needed) and,
// unlike raster models, gets the labels right.
export const diagramSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "Short title for the diagram." },
    svg: {
      type: "string",
      description:
        "A complete, self-contained SVG document (starting with <svg ...> and ending with </svg>) for an accurate, clearly labelled educational diagram. Include a viewBox, legible <text> labels, and simple shapes. No external images, scripts, web fonts, or <foreignObject>.",
    },
    alt: { type: "string", description: "Concise alt text describing the diagram." },
  },
  required: ["title", "svg", "alt"],
};

// Auto-categorise a pasted simulation: infer catalogue metadata from its HTML.
// All fields required (project convention); the mapper validates grade/subject
// against the controlled lists and prunes blanks.
export const simExtractSchema: JSONSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "A short, classroom-friendly title for the simulation." },
    description: {
      type: "string",
      description: "One or two sentences on what students explore/do. Empty string if it cannot be determined.",
    },
    grade_level: {
      type: "string",
      description:
        "Best-fit grade band from the controlled list provided in the user message (e.g. 'K','3','8','Higher Ed'). Empty string if unclear.",
    },
    subject: {
      type: "string",
      description:
        "Best-fit subject from the controlled list provided in the user message (e.g. 'Science','Physics','Mathematics'). Empty string if unclear.",
    },
    concepts: {
      type: "array",
      items: { type: "string" },
      description: "2–5 short topic/concept phrases the simulation teaches (e.g. 'photosynthesis', 'projectile motion').",
    },
    standards: {
      type: "array",
      items: { type: "string" },
      description:
        "Curriculum standard codes if clearly identifiable (e.g. 'NGSS MS-PS1-1', 'CCSS.MATH.CONTENT.4.NF.B.3'). Empty array if none are evident.",
    },
  },
  required: ["title", "description", "grade_level", "subject", "concepts", "standards"],
};

export function jsonFormat(schema: JSONSchema) {
  return { type: "json_schema" as const, schema };
}
