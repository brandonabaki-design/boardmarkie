"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import type { AppUser } from "@/lib/auth";
import { Spinner } from "./ui";

// Header chip: shows the signed-in teacher (avatar + first name, click to manage)
// or a "Sign in" button. Sync setup + sign-out live in Settings → Sync.
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

  if (user) {
    const first = user.name.split(" ")[0] || "Account";
    return (
      <button
        onClick={onOpenSync}
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-sm font-semibold text-ink transition-colors hover:border-brand-300"
        title={`Synced as ${user.email || user.name} · manage in Settings`}
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {first.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-[8rem] truncate sm:inline">{first}</span>
      </button>
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
