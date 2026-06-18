import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-brand-700 px-8 py-16 text-center sm:px-16">
        <div className="dotgrid absolute inset-0 opacity-20" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/40 blur-2xl" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Get your evenings back. Plan your next lesson in under a minute.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
            Join the teachers who let Boardmarkie do the busywork.
          </p>
          <Link
            href="/create"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-brand-700 shadow-sm transition-transform hover:scale-[1.02]"
          >
            Create a lesson free
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
