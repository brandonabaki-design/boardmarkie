const STEPS = [
  {
    n: "1",
    title: "Describe your lesson",
    body: "Type a topic, choose a subject, year group and curriculum. Add any notes — like a focus skill or a tone.",
  },
  {
    n: "2",
    title: "Boardmarkie builds it",
    body: "In seconds you get a complete, structured deck with objectives, vocabulary, activities and teacher notes.",
  },
  {
    n: "3",
    title: "Tweak & export",
    body: "Refine any slide with one click, then export to PowerPoint, Google Slides or PDF and walk into class.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-paper">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-600">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            From blank page to brilliant in three steps
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative rounded-2xl border border-line bg-white p-7 card-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-display text-xl font-extrabold text-white">
                {s.n}
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              {i < STEPS.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center md:flex">
                  <span className="hand text-2xl text-brand-400">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
