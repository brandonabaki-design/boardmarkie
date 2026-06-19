"use client";

import { useMemo, useState } from "react";
import { Presentation, Layers, ClipboardList, Sparkles } from "lucide-react";
import { REGIONS, SUBJECTS, TONES, regionById } from "@/lib/curricula";
import type { GenerateRequest, GenerationMode } from "@/lib/types";
import { Field, Segmented, Select, Spinner, TextArea, Toggle } from "./ui";

const EXAMPLES: Record<GenerationMode, string[]> = {
  lesson: ["The water cycle", "Fractions of amounts", "Causes of World War I", "Photosynthesis"],
  series: ["Introduction to Shakespeare", "The Roman Empire", "Algebra basics", "Ecosystems"],
  worksheet: ["Times tables practice", "Punctuation: apostrophes", "Balancing equations", "Map skills"],
};

export function GeneratorForm({
  initialMode = "lesson",
  loading,
  onSubmit,
}: {
  initialMode?: GenerationMode;
  loading: boolean;
  onSubmit: (req: GenerateRequest) => void;
}) {
  const [mode, setMode] = useState<GenerationMode>(initialMode);
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[2]);
  const [regionId, setRegionId] = useState(REGIONS[0].id);
  const [yearGroup, setYearGroup] = useState(REGIONS[0].yearGroups[6]);
  const [tone, setTone] = useState(TONES[0]);
  const [notes, setNotes] = useState("");
  const [durationMinutes, setDuration] = useState(60);
  const [slideCount, setSlideCount] = useState(9);
  const [lessonCount, setLessonCount] = useState(6);
  const [questionCount, setQuestionCount] = useState(10);
  const [includeStandards, setIncludeStandards] = useState(true);
  const [autoImages, setAutoImages] = useState(false);

  const region = useMemo(() => regionById(regionId), [regionId]);

  const onRegionChange = (id: string) => {
    setRegionId(id);
    const r = regionById(id);
    if (!r.yearGroups.includes(yearGroup)) {
      setYearGroup(r.yearGroups[Math.min(6, r.yearGroups.length - 1)]);
    }
  };

  const submit = () => {
    if (!topic.trim() || loading) return;
    onSubmit({
      mode,
      topic: topic.trim(),
      subject,
      yearGroup,
      region: region.label,
      tone,
      notes: notes.trim() || undefined,
      durationMinutes,
      slideCount,
      lessonCount,
      questionCount,
      includeStandards,
      autoImages,
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          What are we planning today?
        </h1>
        <p className="mt-2 text-muted">
          Describe it once — Boardmarkie builds the rest.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 card-shadow sm:p-7">
        <Segmented<GenerationMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "lesson", label: "Lesson", icon: <Presentation size={16} /> },
            { value: "series", label: "Series", icon: <Layers size={16} /> },
            { value: "worksheet", label: "Worksheet", icon: <ClipboardList size={16} /> },
          ]}
        />

        <div className="mt-6 space-y-5">
          <Field label="Topic" hint="be as specific as you like">
            <TextArea
              rows={2}
              value={topic}
              placeholder={`e.g. ${EXAMPLES[mode][0]}`}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES[mode].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setTopic(ex)}
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  {ex}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject">
              <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
                {SUBJECTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tone">
              <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Curriculum">
              <Select value={regionId} onChange={(e) => onRegionChange(e.target.value)}>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Year group">
              <Select value={yearGroup} onChange={(e) => setYearGroup(e.target.value)}>
                {region.yearGroups.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
            </Field>
          </div>

          {mode === "lesson" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lesson length">
                <Select value={durationMinutes} onChange={(e) => setDuration(Number(e.target.value))}>
                  {[30, 45, 60, 90, 120].map((d) => (
                    <option key={d} value={d}>
                      {d} minutes
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Number of slides">
                <Select value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))}>
                  {[5, 7, 9, 11, 13, 15].map((d) => (
                    <option key={d} value={d}>
                      {d} slides
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          {mode === "lesson" && (
            <div className="space-y-4 rounded-xl border border-line bg-paper/50 p-4">
              <Toggle
                label="Align to curriculum standards"
                hint="Finds the matching standard for the subject, year & curriculum and adds it to the lesson"
                checked={includeStandards}
                onChange={setIncludeStandards}
              />
              <Toggle
                label="Generate images while creating"
                hint="Illustrates the slides automatically (needs your image proxy + key in Settings)"
                checked={autoImages}
                onChange={setAutoImages}
              />
            </div>
          )}

          {mode === "series" && (
            <Field label="Number of lessons in the unit">
              <Select value={lessonCount} onChange={(e) => setLessonCount(Number(e.target.value))}>
                {[3, 4, 5, 6, 8, 10, 12].map((d) => (
                  <option key={d} value={d}>
                    {d} lessons
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {mode === "worksheet" && (
            <Field label="Number of questions">
              <Select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}>
                {[5, 8, 10, 12, 15, 20].map((d) => (
                  <option key={d} value={d}>
                    {d} questions
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Anything else?" hint="optional">
            <TextArea
              rows={2}
              value={notes}
              placeholder="e.g. link to climate change, include a group debate, low literacy class…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <button
            type="button"
            onClick={submit}
            disabled={!topic.trim() || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner /> Generating…
              </>
            ) : (
              <>
                <Sparkles size={18} /> Generate {mode === "series" ? "unit" : mode}
              </>
            )}
          </button>
          <p className="text-center text-xs text-muted">
            Tip: press <kbd className="rounded border border-line bg-paper px-1">⌘</kbd>+
            <kbd className="rounded border border-line bg-paper px-1">Enter</kbd> to generate
          </p>
        </div>
      </div>
    </div>
  );
}
