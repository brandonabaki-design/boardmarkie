import { Wand2, Smile, GraduationCap, Plus } from "lucide-react";

export function Showcase() {
  return (
    <section id="showcase" className="bg-paper">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-brand-600">
              See it in action
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Real slides. Real teacher notes. <span className="marker">Really fast.</span>
            </h2>
            <p className="mt-4 text-lg text-muted">
              Every deck arrives structured and editable. Don&apos;t love a slide?
              Nudge it with a single click and Boardmarkie rewrites it for you.
            </p>

            <ul className="mt-7 space-y-3">
              {[
                { icon: Smile, label: "Make it more fun" },
                { icon: GraduationCap, label: "Differentiate up or down" },
                { icon: Plus, label: "Add a slide or activity" },
                { icon: Wand2, label: "Rewrite to your exact instruction" },
              ].map((x) => (
                <li key={x.label} className="flex items-center gap-3 text-ink">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-brand-600 card-shadow">
                    <x.icon size={18} />
                  </span>
                  <span className="font-medium">{x.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <AppPreview />
        </div>
      </div>
    </section>
  );
}

function AppPreview() {
  const thumbs = ["Title", "Objectives", "What is a biome?", "Vocabulary", "Activity", "Discuss", "Quiz", "Plenary"];
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white card-shadow">
      {/* window bar */}
      <div className="flex items-center gap-1.5 border-b border-line bg-paper px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-coral/60" />
        <span className="h-3 w-3 rounded-full bg-amber/60" />
        <span className="h-3 w-3 rounded-full bg-brand-400/70" />
        <span className="ml-3 rounded-md bg-white px-2 py-0.5 text-xs text-muted">
          boardmarkie.app/create
        </span>
      </div>

      <div className="grid grid-cols-[88px_1fr]">
        {/* rail */}
        <div className="hidden flex-col gap-2 border-r border-line bg-paper/60 p-3 sm:flex">
          {thumbs.map((t, i) => (
            <div
              key={t}
              className={`rounded-md border px-2 py-1.5 text-[10px] font-medium ${
                i === 2 ? "border-brand-300 bg-white text-brand-700" : "border-line bg-white/70 text-muted"
              }`}
            >
              {i + 1}. {t}
            </div>
          ))}
        </div>

        {/* slide */}
        <div className="p-5">
          <div className="rounded-xl border border-line bg-white p-6">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
                Geography · Year 8
              </span>
              <span className="rounded-full bg-line px-2.5 py-0.5 text-[11px] font-semibold text-muted">
                Slide 3
              </span>
            </div>
            <h3 className="mt-3 font-display text-2xl font-extrabold text-ink">
              What is a biome?
            </h3>
            <ul className="mt-4 space-y-2 text-[15px] text-ink">
              <li className="flex gap-2"><span className="text-brand-500">●</span> A large region defined by its climate, plants and animals.</li>
              <li className="flex gap-2"><span className="text-brand-500">●</span> Examples: rainforest, desert, tundra, grassland.</li>
              <li className="flex gap-2"><span className="text-brand-500">●</span> Each biome supports life adapted to its conditions.</li>
            </ul>
            <div className="mt-4 rounded-lg bg-mint px-4 py-3 text-sm text-brand-900">
              <span className="font-semibold">Teacher note: </span>
              Ask students to name a biome they&apos;ve seen in a film, then map it.
            </div>
          </div>

          {/* edit toolbar */}
          <div className="mt-4 flex flex-wrap gap-2">
            {["✨ Make it fun", "📉 Simplify", "📈 Stretch", "➕ Add slide"].map((b) => (
              <span key={b} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
