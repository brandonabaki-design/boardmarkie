"use client";

// Google sign-in via Firebase Auth. The session uses local persistence, so it
// survives restarts and silently refreshes tokens — a teacher signs in at most
// ~once a week (really, until they explicitly sign out).

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { getAuthInstance } from "./firebase";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
}

function toAppUser(u: User): AppUser {
  return {
    uid: u.uid,
    name: u.displayName || u.email || "Teacher",
    email: u.email || "",
    photoURL: u.photoURL || "",
  };
}

export async function signInWithGoogle(): Promise<AppUser> {
  const auth = getAuthInstance();
  if (!auth) throw new Error("Sync isn't set up yet — add your Firebase config in Settings → Sync.");
  await setPersistence(auth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const res = await signInWithPopup(auth, provider);
    return toAppUser(res.user);
  } catch (e) {
    throw new Error(friendlyAuthError(e));
  }
}

export async function signOutUser(): Promise<void> {
  const auth = getAuthInstance();
  if (auth) await signOut(auth);
}

// Subscribe to sign-in state. Returns an unsubscribe fn. Calls back with null
// immediately when sync isn't configured.
export function onAuthChange(cb: (user: AppUser | null) => void): () => void {
  const auth = getAuthInstance();
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (u) => cb(u ? toAppUser(u) : null));
}

export function getCurrentUser(): AppUser | null {
  const u = getAuthInstance()?.currentUser;
  return u ? toAppUser(u) : null;
}

function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code || "";
  switch (code) {
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/unauthorized-domain":
      return "This site's domain isn't authorised in Firebase. Add it under Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google sign-in isn't enabled. Turn it on under Authentication → Sign-in method → Google.";
    default:
      return (e as Error)?.message || "Sign-in failed.";
  }
}
