"use client";

// Single sign-on for the whole app (lessons + EduSim + shared libraries) via
// Supabase Auth — Google OAuth and email magic link. Sessions persist locally and
// auto-refresh, so a teacher signs in once. This module keeps the same exported
// shape the lesson app already calls (AppUser / onAuthChange / getCurrentUser /
// signInWithGoogle / signOutUser) and shares the single supabase client with the
// EduSim hook in supabaseAuth.ts, so one session covers everything.

import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
}

function toAppUser(u: User | null): AppUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const pick = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string) : "");
  return {
    uid: u.id,
    name: pick("full_name") || pick("name") || u.email?.split("@")[0] || "Teacher",
    email: u.email || "",
    photoURL: pick("avatar_url") || pick("picture") || "",
  };
}

// Ensure a `profiles` row exists (seeds author names in the shared libraries).
async function ensureProfile(u: User | null): Promise<void> {
  if (!u) return;
  const display_name = toAppUser(u)?.name ?? "Teacher";
  await supabase
    .from("profiles")
    .upsert({ id: u.id, display_name }, { onConflict: "id", ignoreDuplicates: true })
    .then(
      () => {},
      () => {},
    );
}

// Cached user so sync.ts can read the current user synchronously on every save.
let cachedUser: AppUser | null = null;
if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    cachedUser = toAppUser(data.session?.user ?? null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedUser = toAppUser(session?.user ?? null);
    void ensureProfile(session?.user ?? null);
  });
}

export function getCurrentUser(): AppUser | null {
  return cachedUser;
}

// Subscribe to sign-in state. Emits the current user immediately, then on change.
export function onAuthChange(cb: (user: AppUser | null) => void): () => void {
  void supabase.auth.getSession().then(({ data }) => cb(toAppUser(data.session?.user ?? null)));
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
    cb(toAppUser(session?.user ?? null)),
  );
  return () => sub.subscription.unsubscribe();
}

// Return the sign-in round-trip to the page the user started from.
function redirectTo(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

// OAuth is a full-page redirect (not a popup), so these resolve when the redirect
// is *initiated*; the real session arrives after the round-trip via onAuthChange.
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo() },
  });
  if (error) throw new Error(error.message);
}

export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo() },
  });
  if (error) throw new Error(error.message);
}

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}
