"use client";

import { useState } from "react";
import { ChevronDown, LogOut, LogIn } from "lucide-react";
import { useSupabaseUser, signInWithGoogle, signOut } from "@/lib/supabaseAuth";
import { Spinner } from "./ui";

// The account control shared by every app page's top bar — avatar initials +
// a small menu (sign out), or a Sign in button. One Supabase session app-wide.
export function HeaderAccount() {
  const { user, loading } = useSupabaseUser();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return <span aria-hidden className="h-9 w-9 rounded-full" />;

  if (!user) {
    return (
      <button
        onClick={async () => {
          setBusy(true);
          try {
            await signInWithGoogle();
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300 disabled:opacity-60"
      >
        {busy ? <Spinner className="h-4 w-4" /> : <LogIn size={16} />}
        <span className="hidden sm:inline">Sign in</span>
      </button>
    );
  }

  const initial = (user.name?.[0] || "?").toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={`${user.name}${user.email ? ` (${user.email})` : ""}`}
        aria-label="Account menu"
        className="flex items-center gap-1 rounded-full border border-line bg-white p-1 pr-1.5 transition-colors hover:border-brand-300"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          {initial}
        </span>
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-white p-1.5 card-shadow">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-bold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <div className="my-1 border-t border-line" />
            <button
              onClick={async () => {
                await signOut();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
            >
              <LogOut size={16} className="text-coral" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
