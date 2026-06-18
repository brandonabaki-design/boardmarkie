import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted">
              The AI lesson planner that turns a topic into classroom-ready
              slides, worksheets and units in seconds.
            </p>
          </div>

          <FooterCol
            title="Product"
            links={[
              { href: "#features", label: "Features" },
              { href: "#modes", label: "What you can make" },
              { href: "#pricing", label: "Pricing" },
              { href: "/create", label: "Open app" },
            ]}
          />
          <FooterCol
            title="Resources"
            links={[
              { href: "#how", label: "How it works" },
              { href: "#faq", label: "FAQ" },
              { href: "#showcase", label: "Examples" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { href: "#", label: "About" },
              { href: "#", label: "Privacy" },
              { href: "#", label: "Terms" },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-sm text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Boardmarkie. Made for teachers.</p>
          <p>
            Built with <span className="text-brand-600">Claude</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="font-display text-sm font-bold text-ink">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-muted transition-colors hover:text-brand-700">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
