"use client";

import { useState } from "react";
import { X, Copy, Check, Sparkles, ExternalLink, QrCode } from "lucide-react";
import type { Lesson, Slide } from "@/lib/types";
import { cid, textElement, imageElement, MUTED } from "@/lib/canvas";
import { qrToSvg } from "@/lib/qr";
import { extractSimMetadata } from "@/lib/client";
import { createSimulation } from "@/lib/sims";
import { eduSimLink } from "@/lib/supabase";
import { useSupabaseUser } from "@/lib/supabaseAuth";
import { SimSignIn } from "./SimSignIn";
import { Spinner, TextArea } from "./ui";

// The AISA "EduSim" gem on Gemini — turns a lesson into a student-facing,
// simulation-based learning experience (it codes the simulation HTML for you).
const EDUSIM_GEM_URL = "https://gemini.google.com/gem/11QD4AkTJjpXVgEGw8SJ74nq99ntDfv8V?usp=sharing";

// Serialise a lesson to clean, paste-ready text for the EduSim gem.
function lessonToText(lesson: Lesson): string {
  const m = lesson.meta;
  const out: string[] = [];
  out.push(`# ${m.title}`);
  out.push(`${m.subject} · ${m.yearGroup} · ${m.durationMinutes} min · ${m.region}`);
  if (m.summary) out.push("", m.summary);
  if (m.objectives?.length) {
    out.push("", "## Learning objectives");
    m.objectives.forEach((o) => out.push(`- ${o}`));
  }
  if (m.vocabulary?.length) {
    out.push("", "## Key vocabulary");
    m.vocabulary.forEach((v) => out.push(`- ${v.term}: ${v.definition}`));
  }
  out.push("", "## Slides");
  lesson.slides.forEach((s, i) => {
    out.push("", `### ${i + 1}. ${s.title} [${s.layout}]`);
    if (s.subtitle) out.push(s.subtitle);
    if (s.body) out.push(s.body);
    (s.bullets ?? []).forEach((b) => out.push(`- ${b}`));
    (s.vocabulary ?? []).forEach((v) => out.push(`- ${v.term}: ${v.definition}`));
    if (s.activity)
      out.push(
        `Activity — ${s.activity.title} (${s.activity.grouping}, ${s.activity.durationMinutes} min): ${s.activity.instructions}`,
      );
    (s.discussionQuestions ?? []).forEach((q) => out.push(`- ${q}`));
    (s.quiz ?? []).forEach((q) => {
      out.push(`Q: ${q.question}`);
      (q.options ?? []).forEach((o) => out.push(`   - ${o}`));
      if (q.answer) out.push(`   Answer: ${q.answer}`);
    });
    if (s.teacherNotes) out.push(`Teacher notes: ${s.teacherNotes}`);
  });
  return out.join("\n");
}

// A dedicated "Try the Simulation" slide carrying the QR for the unique link.
function buildEduSimSlide(link: string, qrSvg: string, simTitle: string): Slide {
  return {
    id: cid("sl"),
    layout: "content",
    title: "Try the Simulation",
    elements: [
      textElement({
        text: "Try the Simulation 🔬",
        x: 6, y: 8, w: 88, h: 12,
        fontSize: 7, bold: true, font: "display", align: "center", z: 1,
      }),
      textElement({
        text: `Scan to launch: ${simTitle}`,
        x: 12, y: 22, w: 76, h: 8,
        fontSize: 3.2, color: MUTED, align: "center", z: 2,
      }),
      // Square in real pixels on the 16:9 canvas (24·16 ≈ 43·9) so the QR never distorts.
      imageElement({ svg: qrSvg, eduSimUrl: link, alt: "EduSim QR code", x: 38, y: 32, w: 24, h: 43, z: 3 }),
      textElement({
        text: link,
        x: 8, y: 80, w: 84, h: 6,
        fontSize: 2.2, color: MUTED, align: "center", z: 4,
      }),
    ],
  };
}

export function EduSimWizard({
  lesson,
  onClose,
  onInsert,
}: {
  lesson: Lesson;
  onClose: () => void;
  onInsert: (slide: Slide) => void;
}) {
  const { user, loading: authLoading } = useSupabaseUser();
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");

  const copyJson = async () => {
    const payload = lessonToText(lesson);
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Couldn't copy automatically — select the lesson and copy it manually.");
    }
  };

  const create = async () => {
    if (!user) return;
    if (!html.trim()) {
      setError("Paste the HTML Gemini gave you first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      setStep("Reading the simulation…");
      const meta = await extractSimMetadata(html, {
        topic: lesson.meta.topic,
        subject: lesson.meta.subject,
        yearGroup: lesson.meta.yearGroup,
      });

      setStep("Saving to the shared library…");
      const id = await createSimulation({
        title: meta.title || lesson.meta.title,
        description: meta.description || lesson.meta.summary || null,
        grade_level: meta.grade_level || null,
        subject: meta.subject || null,
        concepts: meta.concepts.length ? meta.concepts : lesson.meta.topic ? [lesson.meta.topic] : [],
        standards: meta.standards.length ? meta.standards : lesson.meta.standards ?? [],
        html,
        is_published: true,
        author_id: user.id,
      });

      setStep("Generating the QR code…");
      const link = eduSimLink(id);
      const qrSvg = await qrToSvg(link);

      onInsert(buildEduSimSlide(link, qrSvg, meta.title || lesson.meta.title));
      onClose();
    } catch (e) {
      setError((e as Error)?.message || "Something went wrong creating the EduSim.");
      setBusy(false);
      setStep("");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-line bg-white p-6 card-shadow">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <QrCode size={20} className="text-brand-600" /> Create an EduSim
          </h2>
          <button onClick={onClose} disabled={busy} className="text-muted hover:text-ink disabled:opacity-40">
            <X size={20} />
          </button>
        </div>

        {!authLoading && !user ? (
          <div className="mt-5">
            <p className="mb-4 text-sm text-muted">
              Sign in once to publish simulations to the shared library that all teachers can use.
            </p>
            <SimSignIn heading="Sign in to publish your EduSim" />
          </div>
        ) : (
          <>
            <ol className="mt-5 space-y-4 text-sm">
              <li>
                <p className="font-semibold text-ink">1. Copy your lesson, then open EduSim</p>
                <p className="mt-0.5 text-muted">
                  Copies this lesson as clean text. Paste it into AISA&apos;s EduSim gem on Gemini and it codes an
                  interactive simulation for your students.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={copyJson}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
                  >
                    {copied ? <Check size={15} className="text-brand-600" /> : <Copy size={15} />}
                    {copied ? "Copied!" : "Copy lesson"}
                  </button>
                  <a
                    href={EDUSIM_GEM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
                  >
                    <ExternalLink size={15} className="text-brand-600" /> Open EduSim
                  </a>
                </div>
              </li>

              <li>
                <p className="font-semibold text-ink">2. Paste the HTML Gemini gives you</p>
                <TextArea
                  rows={6}
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  placeholder="Paste the full HTML here…"
                  spellCheck={false}
                  className="mt-2 font-mono text-xs"
                />
              </li>

              <li>
                <p className="font-semibold text-ink">3. We do the rest</p>
                <p className="mt-0.5 text-muted">
                  Auto-detect the grade, subject, topics &amp; standards, save it with a unique link, and drop a QR slide
                  into this deck.
                </p>
              </li>
            </ol>

            {error && <p className="mt-3 text-xs text-coral">{error}</p>}

            <button
              onClick={create}
              disabled={busy || !html.trim()}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? <Spinner /> : <Sparkles size={16} />}
              {busy ? step || "Working…" : "Create EduSim & add QR slide"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
