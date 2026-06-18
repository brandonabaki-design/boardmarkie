import Link from "next/link";
import { ArrowUpRight, Presentation, Layers, ClipboardList } from "lucide-react";

const MODES = [
  {
    icon: Presentation,
    badge: "Lesson",
    title: "Single lessons",
    body: "A complete, paced slide deck for one lesson — hook, teaching, vocabulary, activity, discussion and plenary.",
    href: "/create?mode=lesson",
    accent: "from-brand-50 to-mint",
    chip: "bg-brand-600",
  },
  {
    icon: Layers,
    badge: "Series",
    title: "Lesson series",
    body: "A connected unit of up to 12 lessons that progress logically — perfect for a half-term scheme of work.",
    href: "/create?mode=series",
    accent: "from-amber/10 to-paper",
    chip: "bg-amber",
  },
  {
    icon: ClipboardList,
    badge: "Worksheet",
    title: "Worksheets",
    body: "Printable practice with mixed question types and a complete answer key. Free and unlimited.",
    href: "/create?mode=worksheet",
    accent: "from-grape/10 to-white",
    chip: "bg-grape",
  },
];

export function Modes() {
  return (
    <section id="modes" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-brand-600">
          What you can make
        </p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Three ways to plan, one calm workflow
        </h2>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {MODES.map((m) => (
          <Link
            key={m.title}
            href={m.href}
            className={`elevate group relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br ${m.accent} p-7`}
          >
            <span className={`inline-flex items-center gap-1.5 rounded-full ${m.chip} px-3 py-1 text-xs font-semibold text-white`}>
              <m.icon size={13} /> {m.badge}
            </span>
            <h3 className="mt-5 font-display text-xl font-bold text-ink">{m.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-ink">
              Try it
              <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
