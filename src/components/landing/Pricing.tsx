import Link from "next/link";
import { Check } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    price: "£0",
    cadence: "forever",
    tagline: "Try the whole workflow.",
    features: [
      "10 full lessons / month",
      "Unlimited worksheets",
      "All curricula & year groups",
      "Export to PDF & PowerPoint",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "£7",
    cadence: "/ month",
    tagline: "For the everyday planner.",
    features: [
      "Unlimited lessons & units",
      "One-click differentiation",
      "Google Slides export",
      "Priority generation",
      "Save your full library",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "School",
    price: "Custom",
    cadence: "",
    tagline: "For departments & MATs.",
    features: [
      "Everything in Pro",
      "Shared team library",
      "Curriculum mapping",
      "Admin & invoicing",
      "Onboarding support",
    ],
    cta: "Talk to us",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-brand-600">Pricing</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Start free. Upgrade when it saves you Sundays.
        </h2>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`relative flex flex-col rounded-2xl border p-7 ${
              t.highlight
                ? "border-brand-300 bg-white card-shadow ring-1 ring-brand-200"
                : "border-line bg-white"
            }`}
          >
            {t.highlight && (
              <span className="absolute -top-3 left-7 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                Most popular
              </span>
            )}
            <h3 className="font-display text-lg font-bold text-ink">{t.name}</h3>
            <p className="mt-1 text-sm text-muted">{t.tagline}</p>
            <div className="mt-5 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold text-ink">{t.price}</span>
              <span className="pb-1 text-sm text-muted">{t.cadence}</span>
            </div>

            <ul className="mt-6 flex-1 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                  <Check size={18} className="mt-0.5 shrink-0 text-brand-600" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/create"
              className={`mt-7 rounded-full px-5 py-3 text-center text-sm font-semibold transition-colors ${
                t.highlight
                  ? "bg-brand-600 text-white hover:bg-brand-700"
                  : "border border-line bg-white text-ink hover:border-brand-300"
              }`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        Self-hosting? Boardmarkie is open and runs on your own Anthropic API key.
      </p>
    </section>
  );
}
