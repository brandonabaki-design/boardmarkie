import {
  Presentation,
  Layers,
  ClipboardList,
  Wand2,
  Globe2,
  Download,
} from "lucide-react";

const FEATURES = [
  {
    icon: Presentation,
    title: "Full lesson decks",
    body: "Title slide, objectives, vocabulary, explanations, activities, discussion and a plenary — pitched to your year group.",
    tint: "bg-brand-50 text-brand-700",
  },
  {
    icon: Layers,
    title: "Connected unit plans",
    body: "Generate a whole scheme of work — up to 12 lessons that build on each other in a logical sequence.",
    tint: "bg-amber/10 text-amber",
  },
  {
    icon: ClipboardList,
    title: "Worksheets & answer keys",
    body: "Printable worksheets with mixed question types and a full marking key — generated free, without limits.",
    tint: "bg-grape/10 text-grape",
  },
  {
    icon: Wand2,
    title: "One-click editing",
    body: "Make it more fun, simplify for support, stretch the highest attainers, shorten, or add a slide — instantly.",
    tint: "bg-coral/10 text-coral",
  },
  {
    icon: Globe2,
    title: "Curriculum aligned",
    body: "Pitch content to the UK, US (Common Core & state standards), Australian or international curricula.",
    tint: "bg-sky/10 text-sky",
  },
  {
    icon: Download,
    title: "Export anywhere",
    body: "Send your deck to PowerPoint or Google Slides, print clean PDFs, or save the raw content as JSON.",
    tint: "bg-brand-50 text-brand-700",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-brand-600">
          Everything you need
        </p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          A whole planning team, in one tab
        </h2>
        <p className="mt-4 text-lg text-muted">
          Boardmarkie handles the heavy lifting so you can focus on the teaching.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="elevate rounded-2xl border border-line bg-white p-6"
          >
            <span className={`inline-grid h-12 w-12 place-items-center rounded-xl ${f.tint}`}>
              <f.icon size={22} />
            </span>
            <h3 className="mt-5 font-display text-lg font-bold text-ink">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
