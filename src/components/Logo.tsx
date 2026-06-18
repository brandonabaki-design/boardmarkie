import Link from "next/link";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`relative inline-grid place-items-center rounded-[30%] bg-brand-600 text-white shadow-sm ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]">
        {/* board check / marker swoosh */}
        <path
          d="M4 13.5l4.2 4.2L20 6"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-white" />
    </span>
  );
}

export function Logo({
  className = "",
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-xl font-extrabold tracking-tight text-ink">
        Board<span className="text-brand-600">markie</span>
      </span>
    </Link>
  );
}
