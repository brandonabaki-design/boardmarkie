"use client";

import { useState } from "react";
import { LogIn, Cloud } from "lucide-react";
import { Logo } from "@/components/Logo";
import { signInWithGoogle } from "@/lib/auth";
import { allowedDomains } from "@/lib/backend";
import { Spinner } from "./ui";

// Full-screen gate shown in hosted ("school") mode until a permitted account is
// signed in. The app's onAuthChange listener flips to the real UI on success.
export function SignInWall() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const domains = allowedDomains();
  const domainHint = domains.map((d) => `@${d}`).join(" or ");

  const handle = async () => {
    setError(null);
    setBusy(true);
    try {
      // Full-page OAuth redirect. On return, CreateApp's onAuthChange swaps in the
      // app (and signs out + warns if the email domain isn't permitted).
      await signInWithGoogle();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 text-center card-shadow">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Sign in to Boardmarkie</h1>
        <p className="mt-2 text-sm text-muted">
          {domainHint
            ? `Use your ${domainHint} account to start creating lessons.`
            : "Sign in with Google to start creating lessons."}
        </p>

        <button
          onClick={handle}
          disabled={busy}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Spinner /> : <LogIn size={18} />} Sign in with Google
        </button>

        {error && <p className="mt-3 text-xs text-coral">{error}</p>}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Cloud size={13} /> Everything you make syncs to your account across devices.
        </p>
      </div>
    </div>
  );
}
