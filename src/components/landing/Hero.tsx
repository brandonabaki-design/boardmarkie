import Link from "next/link";
import { ArrowRight, Sparkles, Clock, Wand2, FileText } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="dotgrid absolute inset-0 -z-10 opacity-70" />
      <div className="absolute -top-24 left-1/2 -z-10 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-100 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 card-shadow">
            <Sparkles size={14} /> Lesson planning, minus the hours
          </span>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Turn any topic into a{" "}
            <span className="marker">classroom-ready lesson</span> in seconds.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Boardmarkie is the AI lesson generator for teachers. Pick a topic,
            year group and curriculum — get slides, objectives, vocabulary,
            activities, worksheets and whole units, all editable and ready to
            teach.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/create"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-brand-700"
            >
              Create your first lesson
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#showcase"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-6 py-3.5 text-base font-semibold text-ink transition-colors hover:border-brand-300"
            >
              See an example
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={16} className="text-brand-600" /> Saves ~5 hours a week
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wand2 size={16} className="text-brand-600" /> One-click editing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText size={16} className="text-brand-600" /> Export to Slides, PPT & PDF
            </span>
          </div>
        </div>

        <div className="relative animate-fade-up [animation-delay:120ms]">
          <DeckMockup />
        </div>
      </div>
    </section>
  );
}

function DeckMockup() {
  return (
    <div className="relative mx-auto max-w-md">
      {/* back content slide */}
      <div className="absolute -right-4 top-10 w-[88%] rotate-3 rounded-2xl border border-line bg-white p-5 card-shadow">
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-24 rounded-full bg-brand-200" />
          <div className="h-5 w-5 rounded-md bg-paper" />
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="h-2 w-full rounded-full bg-line" />
          <div className="h-2 w-5/6 rounded-full bg-line" />
          <div className="h-2 w-4/6 rounded-full bg-line" />
        </div>
      </div>

      {/* front title slide */}
      <div className="relative rotate-[-2deg] rounded-2xl border border-line bg-white p-6 card-shadow">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            Year 5 · Science
          </span>
          <span className="rounded-full bg-amber/10 px-2.5 py-1 text-[11px] font-semibold text-amber">
            60 min
          </span>
        </div>
        <h3 className="mt-4 font-display text-2xl font-extrabold leading-tight text-ink">
          The Water Cycle 💧
        </h3>
        <p className="mt-1.5 text-sm text-muted">
          How water travels around our planet, again and again.
        </p>

        <div className="mt-5 rounded-xl bg-mint p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
            Learning objectives
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink">
            <li className="flex gap-2">
              <span className="text-brand-500">✓</span> Name the stages of the water cycle
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500">✓</span> Explain evaporation & condensation
            </li>
            <li className="flex gap-2">
              <span className="text-brand-500">✓</span> Label a diagram of the cycle
            </li>
          </ul>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="hand text-xl text-brand-600">ready to teach!</span>
          <span className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white">
            8 slides
          </span>
        </div>
      </div>

      {/* floating chips */}
      <div className="animate-float absolute -left-6 top-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink card-shadow [--r:-6deg]">
        🎯 Differentiated
      </div>
      <div className="animate-float absolute -bottom-5 right-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink card-shadow [--r:5deg] [animation-delay:1.5s]">
        📝 + Worksheet
      </div>
    </div>
  );
}
