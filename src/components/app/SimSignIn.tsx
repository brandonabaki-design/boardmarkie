"use client";

import { useState } from "react";
import { signInWithGoogle, signInWithEmail } from "@/lib/supabaseAuth";
import { Spinner } from "./ui";

/** Sign-in panel for the EduSim library (Google + email magic link). */
export function SimSignIn({ heading = "Sign in to add a simulation" }: { heading?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const google = async () => {
    setError("");
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  };

  const magic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return;
    setBusy(true);
    const { error } = await signInWithEmail(email.trim());
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-line bg-white p-6 text-center card-shadow">
      <h2 className="font-display text-xl font-bold text-ink">{heading}</h2>
      <p className="mt-1 text-sm text-muted">
        Teachers sign in to publish and rate simulations. Students don&apos;t need an account.
      </p>

      {error && (
        <div className="mt-3 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</div>
      )}

      <button
        type="button"
        onClick={google}
        className="mt-4 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
      >
        Continue with Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      {sent ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
          Check your email — we sent a magic sign-in link to <strong>{email}</strong>.
        </div>
      ) : (
        <form onSubmit={magic} className="flex gap-2">
          <input
            type="email"
            required
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Spinner /> : null} Email link
          </button>
        </form>
      )}
    </div>
  );
}
