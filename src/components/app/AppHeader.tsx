"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { HeaderAccount } from "./HeaderAccount";

// One consistent top bar across the whole app (editor + libraries): logo + the
// same primary nav + the account chip. Pages pass their own actions via children
// (e.g. "Add a simulation") — only those differ page to page.
const NAV = [
  { href: "/create/", label: "Create", match: "/create" },
  { href: "/lessons/", label: "Shared lessons", match: "/lessons" },
  { href: "/sims/", label: "EduSim library", match: "/sims" },
];

export function AppHeader({ children }: { children?: ReactNode }) {
  const pathname = usePathname() || "";
  const isActive = (m: string) => pathname === m || pathname.startsWith(`${m}/`);

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          <nav className="hidden items-center gap-0.5 sm:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.match) ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  isActive(n.match) ? "bg-paper text-ink" : "text-muted hover:bg-paper hover:text-ink"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {children}
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}
