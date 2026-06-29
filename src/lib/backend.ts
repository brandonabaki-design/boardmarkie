"use client";

// Hosted ("school") mode.
//
// In hosted mode a shared backend (the Vercel proxy) holds all the API keys and
// requires Google sign-in, so end users never enter a key and can't use the
// creation tools until signed in. It's enabled by a BUILD-TIME env var
// (NEXT_PUBLIC_BACKEND_URL), so an existing bring-your-own-key deploy or local
// dev — where that env isn't set — keeps working exactly as before.
//
// The backend base is the proxy's /api root, e.g. https://yourapp.vercel.app/api.
// Per-feature endpoints hang off it: /anthropic, /openai-chat, /openai-image,
// /image, /imagesearch.

import { supabase } from "./supabase";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");

const ALLOWED_DOMAINS = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

function err(message: string, status?: number): Error & { status?: number } {
  const e = new Error(message) as Error & { status?: number };
  if (status) e.status = status;
  return e;
}

export function isHostedMode(): boolean {
  return !!BACKEND;
}

export function getBackendBase(): string {
  return BACKEND;
}

export function backendEndpoint(name: string): string {
  return `${BACKEND}/${name}`;
}

// A fresh Supabase access token (JWT) for the signed-in user (auto-refreshed).
// Throws a 401 if nobody is signed in, which surfaces the sign-in wall.
// NOTE: in hosted mode the proxy (vercel-proxy/api/_auth.js) must verify the
// Supabase JWT instead of a Firebase ID token — see docs/EDUSIM.md.
export async function getIdToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw err("Please sign in to use Boardmarkie.", 401);
  return token;
}

export async function authHeader(): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await getIdToken()}` };
}

// Client-side convenience for the sign-in gate UX. Real enforcement is on the
// backend (it verifies the token's email domain); this just gives a friendly
// message before a wrong-domain account ever hits the API.
export function allowedDomains(): string[] {
  return ALLOWED_DOMAINS;
}

export function emailAllowed(email: string): boolean {
  if (!ALLOWED_DOMAINS.length) return true;
  const domain = (email.split("@")[1] || "").toLowerCase();
  return ALLOWED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}
