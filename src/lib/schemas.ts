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
      description: "Learning objectives written as 'I can…' or 'Students will…' statements.",
    },
    vocabulary: {
      type: "array",
      items: vocabItem,
      description: "Key vocabulary for the whole lesson.",
    },
    slides: {
      type: "array",
      items: slideSchema,
      description: "The ordered slides that make up the lesson.",
    },
  },
  required: ["title", "summary", "objectives", "vocabulary", "slides"],
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

export function jsonFormat(schema: JSONSchema) {
  return { type: "json_schema" as const, schema };
}
