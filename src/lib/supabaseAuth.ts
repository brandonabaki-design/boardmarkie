"use client";

// Supabase-backed sign-in for the EduSim library. This is the canonical auth the
// whole app will consolidate onto (Google OAuth + email magic link). For now the
// lesson app still uses Firebase; the migration will repoint it at this hook.

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, basePath } from "./supabase";

export interface SupaUser {
  id: string;
  email: string;
  name: string;
}

function toUser(u: User | null): SupaUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    u.email?.split("@")[0] ||
    "Teacher";
  return { id: u.id, email: u.email ?? "", name: name as string };
}

// Ensure a `profiles` row exists for the signed-in user (seeds author names in
// the library). Best-effort; RLS/offline failures must not break the session.
async function ensureProfile(u: User) {
  const display_name = toUser(u)?.name ?? "Teacher";
  await supabase
    .from("profiles")
    .upsert({ id: u.id, display_name }, { onConflict: "id", ignoreDuplicates: true })
    .then(
      () => {},
      () => {},
    );
}

/** Subscribe to the current Supabase user. No provider needed. */
export function useSupabaseUser() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(toUser(data.session?.user ?? null));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session?.user ?? null));
      if (session?.user) ensureProfile(session.user);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

// Return the sign-in round-trip to the page the user started from (so signing in
// on /create stays on /create, and on /sims stays on /sims). basePath() is
// already part of window.location.pathname under GitHub Pages.
function redirectTo(): string {
  if (typeof window === "undefined") return basePath();
  return `${window.location.origin}${window.location.pathname}`;
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
}

export function signInWithEmail(email: string) {
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
}

export async function signOut() {
  await supabase.auth.signOut();
}
