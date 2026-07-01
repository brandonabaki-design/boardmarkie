"use client";

import { useState } from "react";
import { X, Copy, Check, Sparkles, ExternalLink, QrCode, Link2, FlaskConical, Gamepad2, Map, ClipboardCheck } from "lucide-react";
import type { Lesson, Slide } from "@/lib/types";
import { cid, textElement, imageElement, MUTED, normalizeEduSimUrl } from "@/lib/canvas";
import { qrToSvg } from "@/lib/qr";
import { extractSimMetadata } from "@/lib/client";
import { createSimulation } from "@/lib/sims";
import { eduSimLink } from "@/lib/supabase";
import { useSupabaseUser } from "@/lib/supabaseAuth";
import { SIM_TYPES, simBuildDirective, type SimType } from "@/lib/simTypes";
import { SimSignIn } from "./SimSignIn";
import { Spinner, TextArea } from "./ui";

// The AISA gems on Gemini that turn a lesson into a student-facing, interactive
// build (they code the HTML for you). Games use the dedicated EduPlay gem
// (arcade-style playable games); everything else uses the EduSim gem.
const EDUSIM_GEM_URL = "https://gemini.google.com/gem/11QD4AkTJjpXVgEGw8SJ74nq99ntDfv8V?usp=sharing";
const EDUPLAY_GEM_URL = "https://gemini.google.com/gem/1HauuBTu_wAx5JTkkVbqH_zAzrfuQ7kKk?usp=sharing";

const TYPE_ICON: Record<SimType, typeof FlaskConical> = {
  simulation: FlaskConical,
  game: Gamepad2,
  adventure: Map,
  worksheet: ClipboardCheck,
};

// Serialise a lesson to clean, paste-ready text for the EduSim gem, led by a
// directive telling the gem WHICH kind of interactive resource to build.
function lessonToText(lesson: Lesson, simType: SimType): string {
  const m = lesson.meta;
  const out: string[] = [];
  out.push(simBuildDirective(simType), "");
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
      textElement({ text: "Try the Simulation 🔬", x: 6, y: 8, w: 88, h: 12, fontSize: 7, bold: true, font: "display", align: "center", z: 1 }),
      textElement({ text: `Scan to launch: ${simTitle}`, x: 12, y: 22, w: 76, h: 8, fontSize: 3.2, color: MUTED, align: "center", z: 2 }),
      imageElement({ svg: qrSvg, eduSimUrl: link, linkUrl: link, alt: "EduSim QR code", x: 38, y: 32, w: 24, h: 43, z: 3 }),
      textElement({ text: link, linkUrl: link, x: 8, y: 80, w: 84, h: 6, fontSize: 2.2, color: MUTED, align: "center", z: 4 }),
    ],
  };
}

type Tab = "create" | "paste";

export function EduSimModal({
  lesson,
  onClose,
  onEmbed,
  onAddSlide,
}: {
  lesson: Lesson;
  onClose: () => void;
  onEmbed: (svg: string, url: string) => void; // paste-a-link → QR on the current slide
  onAddSlide: (slide: Slide) => void; // create-from-lesson → dedicated QR slide
}) {
  const { user, loading: authLoading } = useSupabaseUser();
  const [tab, setTab] = useState<Tab>("create");

  // create-from-lesson state
  const [simType, setSimType] = useState<SimType>("simulation");
  // Games go to the dedicated EduPlay gem; everything else to the EduSim gem.
  const isGame = simType === "game";
  const gemUrl = isGame ? EDUPLAY_GEM_URL : EDUSIM_GEM_URL;
  const gemName = isGame ? "EduPlay" : "EduSim";
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");

  // paste-a-link state
  const [link, setLink] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkErr, setLinkErr] = useState("");

  const copyLesson = async () => {
    try {
      await navigator.clipboard.writeText(lessonToText(lesson, simType));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Couldn't copy automatically — select the lesson and copy it manually.");
    }
  };

  const create = async () => {
    if (!user || !html.trim()) {
      if (!html.trim()) setError("Paste the HTML the EduSim gem gave you first.");
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
        sim_type: simType,
        concepts: meta.concepts.length ? meta.concepts : lesson.meta.topic ? [lesson.meta.topic] : [],
        standards: meta.standards.length ? meta.standards : lesson.meta.standards ?? [],
        html,
        is_published: true,
        author_id: user.id,
      });
      setStep("Generating the QR code…");
      const url = eduSimLink(id);
      const qrSvg = await qrToSvg(url);
      onAddSlide(buildEduSimSlide(url, qrSvg, meta.title || lesson.meta.title));
      onClose();
    } catch (e) {
      setError((e as Error)?.message || "Something went wrong creating the EduSim.");
      setBusy(false);
      setStep("");
    }
  };

  const addLink = async () => {
    const url = normalizeEduSimUrl(link);
    if (!url) {
      setLinkErr("That doesn't look like a valid link. Paste an EduSim link (https://…).");
      return;
    }
    setLinkErr("");
    setLinkBusy(true);
    try {
      const qrSvg = await qrToSvg(url);
      onEmbed(qrSvg, url);
      onClose();
    } catch {
      setLinkErr("Couldn't generate the QR code. Check the link and try again.");
      setLinkBusy(false);
    }
  };

  const tabBtn = (id: Tab, label: string, Icon: typeof QrCode) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        tab === id ? "bg-white text-brand-700 card-shadow" : "text-muted hover:text-ink"
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-line bg-white p-6 card-shadow">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink">
            <QrCode size={20} className="text-brand-600" /> {gemName}
          </h2>
          <button onClick={onClose} disabled={busy} className="text-muted hover:text-ink disabled:opacity-40">
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-xl border border-line bg-paper p-1">
          {tabBtn("create", "Create from lesson", Sparkles)}
          {tabBtn("paste", "Paste a link", Link2)}
        </div>

        {tab === "create" ? (
          !authLoading && !user ? (
            <div className="mt-5">
              <p className="mb-4 text-sm text-muted">
                Sign in once to publish simulations to the shared library that all teachers can use.
              </p>
              <SimSignIn heading="Sign in to publish your EduSim" />
            </div>
          ) : (
            <>
              <div className="mt-5">
                <p className="text-sm font-semibold text-ink">What should we build?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {SIM_TYPES.map((t) => {
                    const Icon = TYPE_ICON[t.id];
                    const active = simType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSimType(t.id)}
                        className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                          active ? "border-brand-400 bg-brand-50" : "border-line bg-white hover:border-brand-300"
                        }`}
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
                          <Icon size={16} />
                        </span>
                        <span className="text-sm font-bold text-ink">{t.label}</span>
                        <span className="text-[11px] leading-snug text-muted">{t.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ol className="mt-5 space-y-4 text-sm">
                <li>
                  <p className="font-semibold text-ink">1. Copy your lesson, then open {gemName}</p>
                  <p className="mt-0.5 text-muted">
                    Copies this lesson as clean text, led by a note telling the gem to build{" "}
                    {simType === "simulation" ? "a simulation" : simType === "game" ? "a game" : simType === "adventure" ? "a choose-your-own-adventure" : "an interactive worksheet"}.
                    Paste it into AISA&apos;s {gemName} gem on Gemini and it codes the activity for your students.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={copyLesson}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
                    >
                      {copied ? <Check size={15} className="text-brand-600" /> : <Copy size={15} />}
                      {copied ? "Copied!" : "Copy lesson"}
                    </button>
                    <a
                      href={gemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
                    >
                      <ExternalLink size={15} className="text-brand-600" /> Open {gemName}
                    </a>
                  </div>
                </li>
                <li>
                  <p className="font-semibold text-ink">2. Paste the HTML the gem gives you</p>
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
                    Auto-detect the grade, subject, topics &amp; standards, save it with a unique link, and drop a QR
                    slide into this deck.
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
          )
        ) : (
          <div className="mt-5">
            <p className="text-sm text-muted">
              Already have an EduSim link? Paste it and we&apos;ll drop a scannable QR code onto the current slide.
            </p>
            <input
              value={link}
              autoFocus
              onChange={(e) => {
                setLink(e.target.value);
                setLinkErr("");
              }}
              onKeyDown={(e) => e.key === "Enter" && !linkBusy && addLink()}
              placeholder="Paste an EduSim link…"
              className="mt-3 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            {linkErr && <p className="mt-2 text-xs text-coral">{linkErr}</p>}
            <button
              onClick={addLink}
              disabled={!link.trim() || linkBusy}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {linkBusy ? <Spinner /> : <QrCode size={16} />} Add QR code to this slide
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
