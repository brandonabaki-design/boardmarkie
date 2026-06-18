const STATS = [
  { value: "500k+", label: "lessons planned" },
  { value: "~5 hrs", label: "saved per teacher / week" },
  { value: "4", label: "curricula supported" },
  { value: "60s", label: "from topic to deck" },
];

export function Stats() {
  return (
    <section className="border-y border-line bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-3xl font-extrabold text-brand-700 sm:text-4xl">
              {s.value}
            </div>
            <div className="mt-1 text-sm text-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
