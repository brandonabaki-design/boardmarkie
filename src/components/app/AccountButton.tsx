"use client";

import { useState } from "react";
import { LogIn, LogOut, Cloud, ChevronDown } from "lucide-react";
import { signOutUser, type AppUser } from "@/lib/auth";
import { Spinner } from "./ui";

// Header chip: the signed-in teacher (avatar + name → a menu with Sync settings
// and Sign out), or a "Sign in" button.
export function AccountButton({
  user,
  configured,
  onSignIn,
  onOpenSync,
}: {
  user: AppUser | null;
  configured: boolean;
  onSignIn: () => Promise<void>;
  onOpenSync: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  if (user) {
    const first = user.name.split(" ")[0] || "Account";
    const avatar = user.photoURL ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
    ) : (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
        {first.charAt(0).toUpperCase()}
      </span>
    );

    return (
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
          title={`Signed in as ${user.email || user.name}`}
        >
          {avatar}
          <span className="hidden max-w-[8rem] truncate sm:inline">{first}</span>
          <ChevronDown size={14} className="text-muted" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-white p-1.5 card-shadow">
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                {avatar}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
              </div>
              <div className="my-1 border-t border-line" />
              <button
                onClick={() => {
                  setOpen(false);
                  onOpenSync();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
              >
                <Cloud size={16} className="text-brand-600" /> Sync settings
              </button>
              <button
                onClick={async () => {
                  setBusy(true);
                  try {
                    await signOutUser();
                  } finally {
                    setBusy(false);
                    setOpen(false);
                  }
                }}
                disabled={busy}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper disabled:opacity-50"
              >
                {busy ? <Spinner className="h-4 w-4" /> : <LogOut size={16} className="text-coral" />} Sign out
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const handle = async () => {
    if (!configured) {
      onOpenSync();
      return;
    }
    setBusy(true);
    try {
      await onSignIn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300 disabled:opacity-60"
      title="Sign in to sync your lessons across devices"
    >
      {busy ? <Spinner className="h-4 w-4" /> : <LogIn size={16} />}
      <span className="hidden sm:inline">Sign in</span>
    </button>
  );
}
