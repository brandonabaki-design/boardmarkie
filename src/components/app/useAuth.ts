"use client";

import { useEffect, useState } from "react";
import { onAuthChange, type AppUser } from "@/lib/auth";

// Reactive sign-in state for display (header chip, Sync panel). The sync side
// effects (pull/subscribe) live in CreateApp, not here.
export function useAuth(): { user: AppUser | null; ready: boolean } {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u);
      setReady(true);
    });
  }, []);
  return { user, ready };
}
