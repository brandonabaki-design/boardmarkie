"use client";

import { useState } from "react";
import { Cloud, LogIn, LogOut, ShieldCheck, RefreshCw } from "lucide-react";
import { useAuth } from "./useAuth";
import { signInWithGoogle, signInWithEmail, signOutUser } from "@/lib/auth";
import { syncOnce } from "@/lib/sync";
import { Spinner } from "./ui";

type Busy = "" | "google" | "email" | "signout" | "sync";

// One account for the whole app: lessons, EduSim simulations and the shared
// libraries all sign in here (Supabase — Google or email magic link). No setup.
export function SyncPanel() {
  const { user, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<Busy>("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (kind: Busy, fn: () => Promise<unknown>, ok?: string) => {
    setMsg(null);
    setBusy(kind);
    try {
      await fn();
      if (ok) setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy("");
    }
  };

  const sendMagic = async () => {
    if (!email.trim()) return;
    setMsg(null);
    setBusy("email");
    try {
      await signInWithEmail(email.trim());
      setSent(true);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <p className="text-sm text-muted">
        Sign in once to use the whole app with a single account — your lessons sync across devices, and
        you can publish & open EduSim simulations and shared lessons. Sign-in lasts until you sign out.
      </p>

      {user ? (
        <div className="mt-4 rounded-2xl border border-line p-4">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 text-base font-bold text-brand-700">
                {(user.name[0] || "?").toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-brand-700">
              <Cloud size={13} /> Synced
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => run("sync", syncOnce, "Synced.")}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper disabled:opacity-50"
            >
              {busy === "sync" ? <Spinner /> : <RefreshCw size={15} />} Sync now
            </button>
            <button
              onClick={() => run("signout", signOutUser)}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper disabled:opacity-50"
            >
              {busy === "signout" ? <Spinner /> : <LogOut size={15} />} Sign out
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <button
            onClick={() => run("google", signInWithGoogle)}
            disabled={!ready || !!busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {busy === "google" ? <Spinner /> : <LogIn size={16} />} Sign in with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or email a magic link <span className="h-px flex-1 bg-line" />
          </div>

          {sent ? (
            <p className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
              Check your inbox — we sent a sign-in link to <strong>{email}</strong>.
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand-400"
              />
              <button
                onClick={sendMagic}
                disabled={!!busy || !email.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper disabled:opacity-50"
              >
                {busy === "email" ? <Spinner /> : null} Send link
              </button>
            </div>
          )}
        </div>
      )}

      {msg && (
        <p className={`mt-3 text-xs ${msg.ok ? "font-medium text-brand-700" : "text-coral"}`}>
          {msg.ok ? "✅ " : "❌ "}
          {msg.text}
        </p>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-mint px-3.5 py-3 text-xs text-brand-900">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
        Your API keys never sync — only your lessons. Big AI-generated raster images stay on the device
        that made them (text, layouts, diagrams, web/GIF images and YouTube all sync).
      </div>
    </div>
  );
}
