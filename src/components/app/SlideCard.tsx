"use client";

import { useState } from "react";
import {
  Presentation,
  Target,
  BookOpen,
  Users,
  MessagesSquare,
  Video,
  HelpCircle,
  Flag,
  FileText,
  Image as ImageIcon,
  Wand2,
  Smile,
  GraduationCap,
  X,
  ExternalLink,
  Sparkles,
  PenTool,
} from "lucide-react";
import type { EditAction, Slide, SlideLayout } from "@/lib/types";
import { Spinner } from "./ui";

const LAYOUT_META: Record<SlideLayout, { label: string; icon: typeof FileText; tint: string }> = {
  title: { label: "Title", icon: Presentation, tint: "bg-brand-50 text-brand-700" },
  objectives: { label: "Objectives", icon: Target, tint: "bg-sky/10 text-sky" },
  content: { label: "Teaching", icon: FileText, tint: "bg-paper text-ink" },
  vocabulary: { label: "Vocabulary", icon: BookOpen, tint: "bg-grape/10 text-grape" },
  activity: { label: "Activity", icon: Users, tint: "bg-amber/10 text-amber" },
  discussion: { label: "Discussion", icon: MessagesSquare, tint: "bg-brand-50 text-brand-700" },
  video: { label: "Video", icon: Video, tint: "bg-coral/10 text-coral" },
  quiz: { label: "Quiz", icon: HelpCircle, tint: "bg-sky/10 text-sky" },
  plenary: { label: "Plenary", icon: Flag, tint: "bg-brand-50 text-brand-700" },
};

function youtubeUrl(q: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
function imageSearchUrl(q: string) {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
}

export function SlideCard({
  slide,
  index,
  total,
  busy,
  onEditSlide,
  onGenerateImage,
  onGenerateDiagram,
  mediaBusy,
}: {
  slide: Slide;
  index: number;
  total: number;
  busy: boolean;
  onEditSlide: (slideId: string, action: EditAction, instruction?: string) => void;
  onGenerateImage: (slideId: string) => void;
  onGenerateDiagram: (slideId: string) => void;
  mediaBusy: "image" | "diagram" | null;
}) {
  const meta = LAYOUT_META[slide.layout] ?? LAYOUT_META.content;
  const Icon = meta.icon;
  const [menuOpen, setMenuOpen] = useState(false);
  const [instruction, setInstruction] = useState("");

  const act = (action: EditAction, ins?: string) => {
    setMenuOpen(false);
    setInstruction("");
    onEditSlide(slide.id, action, ins);
  };

  return (
    <article className="print-page group relative scroll-mt-24 rounded-2xl border border-line bg-white p-6 card-shadow sm:p-8">
      <header className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.tint}`}>
          <Icon size={13} /> {meta.label}
        </span>
        <span className="text-xs font-medium text-muted">
          Slide {index + 1} / {total}
        </span>
      </header>

      <h3 className={`mt-4 font-display font-extrabold tracking-tight text-ink ${slide.layout === "title" ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
        {slide.title}
      </h3>
      {slide.subtitle && <p className="mt-1.5 text-base text-muted">{slide.subtitle}</p>}

      <div className="mt-5 space-y-4">
        {slide.body && <p className="text-[15px] leading-relaxed text-ink">{slide.body}</p>}

        {slide.bullets && slide.bullets.length > 0 && (
          <ul className="space-y-2">
            {slide.bullets.map((b, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                {b}
              </li>
            ))}
          </ul>
        )}

        {slide.vocabulary && slide.vocabulary.length > 0 && (
          <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {slide.vocabulary.map((v, i) => (
              <div key={i} className="grid grid-cols-[minmax(90px,28%)_1fr] gap-3 px-4 py-3">
                <dt className="font-semibold text-brand-700">{v.term}</dt>
                <dd className="text-sm text-ink">{v.definition}</dd>
              </div>
            ))}
          </dl>
        )}

        {slide.activity && (
          <div className="rounded-xl bg-amber/[0.08] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Users size={16} className="text-amber" />
              <span className="font-semibold text-ink">{slide.activity.title}</span>
              {slide.activity.grouping && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-muted">
                  {slide.activity.grouping}
                </span>
              )}
              {slide.activity.durationMinutes > 0 && (
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-muted">
                  {slide.activity.durationMinutes} min
                </span>
              )}
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">{slide.activity.instructions}</p>
          </div>
        )}

        {slide.discussionQuestions && slide.discussionQuestions.length > 0 && (
          <ul className="space-y-2">
            {slide.discussionQuestions.map((q, i) => (
              <li key={i} className="flex gap-2.5 rounded-lg bg-mint px-3.5 py-2.5 text-[15px] text-brand-900">
                <MessagesSquare size={16} className="mt-0.5 shrink-0 text-brand-600" />
                {q}
              </li>
            ))}
          </ul>
        )}

        {slide.quiz && slide.quiz.length > 0 && (
          <ol className="space-y-3">
            {slide.quiz.map((q, i) => (
              <li key={i} className="rounded-xl border border-line p-4">
                <p className="font-semibold text-ink">
                  {i + 1}. {q.question}
                </p>
                {q.options.length > 0 && (
                  <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {q.options.map((o, oi) => (
                      <li
                        key={oi}
                        className={`rounded-lg px-3 py-1.5 text-sm ${
                          o === q.answer ? "bg-brand-50 font-medium text-brand-800" : "bg-paper text-ink"
                        }`}
                      >
                        {o}
                      </li>
                    ))}
                  </ul>
                )}
                {q.answer && q.options.length === 0 && (
                  <p className="mt-2 text-sm text-brand-700">
                    <span className="font-semibold">Answer:</span> {q.answer}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}

        {(slide.imagePrompt || slide.imageUrl || slide.diagramSvg) && (
          <div className="space-y-3">
            {slide.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.imageUrl}
                alt={slide.imageAlt || slide.imagePrompt || "Lesson illustration"}
                className="w-full rounded-xl border border-line"
              />
            )}

            {slide.diagramSvg && (
              <div
                role="img"
                aria-label={slide.imageAlt || "Diagram"}
                className="overflow-hidden rounded-xl border border-line bg-white p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full"
                // SVG is sanitized when generated (scripts / handlers stripped)
                dangerouslySetInnerHTML={{ __html: slide.diagramSvg }}
              />
            )}

            {slide.imagePrompt && !slide.imageUrl && !slide.diagramSvg && (
              <p className="flex items-start gap-3 rounded-xl border border-dashed border-line bg-paper/60 px-4 py-3 text-sm text-muted">
                <ImageIcon size={18} className="mt-0.5 shrink-0 text-muted" />
                <span>
                  <span className="font-semibold text-ink">Image idea: </span>
                  {slide.imagePrompt}
                </span>
              </p>
            )}

            <div className="no-print flex flex-wrap items-center gap-2">
              <button
                onClick={() => onGenerateImage(slide.id)}
                disabled={busy || !slide.imagePrompt}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
              >
                {mediaBusy === "image" ? <Spinner /> : <Sparkles size={14} className="text-brand-600" />}
                {slide.imageUrl ? "Regenerate image" : "Generate image"}
              </button>
              <button
                onClick={() => onGenerateDiagram(slide.id)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
              >
                {mediaBusy === "diagram" ? <Spinner /> : <PenTool size={14} className="text-brand-600" />}
                {slide.diagramSvg ? "Redraw diagram" : "Draw diagram"}
              </button>
              {slide.imagePrompt && (
                <a
                  href={imageSearchUrl(slide.imagePrompt)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-brand-700"
                >
                  find a photo <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}

        {slide.youtube?.searchQuery && (
          <a
            href={youtubeUrl(slide.youtube.searchQuery)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-coral/[0.08] px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-coral/[0.14]"
          >
            <Video size={18} className="text-coral" />
            {slide.youtube.title || slide.youtube.searchQuery}
            <ExternalLink size={13} className="text-muted" />
          </a>
        )}
      </div>

      {slide.teacherNotes && (
        <div className="mt-5 rounded-xl border-l-4 border-brand-300 bg-brand-50/60 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Teacher notes</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{slide.teacherNotes}</p>
        </div>
      )}

      {/* per-slide edit control */}
      <div className="no-print absolute right-4 top-4">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink opacity-0 shadow-sm backdrop-blur transition-all hover:border-brand-300 group-hover:opacity-100 disabled:opacity-50"
        >
          {busy ? <Spinner /> : <Wand2 size={14} className="text-brand-600" />}
          Improve
        </button>

        {menuOpen && (
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-line bg-white p-2 card-shadow">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-muted">Improve this slide</span>
              <button onClick={() => setMenuOpen(false)} className="text-muted hover:text-ink">
                <X size={14} />
              </button>
            </div>
            <QuickAction icon={Smile} label="Make it more fun" onClick={() => act("make_fun")} />
            <QuickAction icon={GraduationCap} label="Simplify" onClick={() => act("simplify")} />
            <QuickAction icon={GraduationCap} label="Stretch & challenge" onClick={() => act("advance")} />
            <div className="mt-1 border-t border-line p-2">
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && instruction.trim()) act("rewrite", instruction.trim());
                }}
                placeholder="Or tell it what to change…"
                className="w-full rounded-lg border border-line px-2.5 py-2 text-sm outline-none focus:border-brand-400"
              />
              <button
                onClick={() => instruction.trim() && act("rewrite", instruction.trim())}
                disabled={!instruction.trim()}
                className="mt-2 w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Smile;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
    >
      <Icon size={16} className="text-brand-600" />
      {label}
    </button>
  );
}
