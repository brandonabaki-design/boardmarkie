// Supabase client for the EduSim simulation library (and, going forward, the
// shared lesson library + sign-in). The app stays a static export: Supabase is
// called directly from the browser with the PUBLIC anon key — access is gated by
// Row-Level Security, so the key is safe to ship (never the service_role key).
//
// Values are overridable at build time via NEXT_PUBLIC_SUPABASE_URL /
// NEXT_PUBLIC_SUPABASE_ANON_KEY (e.g. GitHub Actions vars); otherwise the
// committed defaults below are used.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ojifqcnsvbvkvpvwmovr.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_87Sk_zzm6QLFeDfi3E_woQ_Kw3rCzyx";

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    // We're not hash-routed (unlike the original Vite app), so let supabase-js
    // pick up the ?code= on the OAuth/magic-link redirect itself.
    detectSessionInUrl: true,
  },
});

/** App base path ("" locally, "/boardmarkie" on GitHub Pages). */
export function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

/**
 * Canonical shareable link to an in-app simulation viewer. trailingSlash is on,
 * so the route is `/sim/` and the id rides in the query string (works on a
 * static host with no server rewrites). Falls back to a relative URL during SSG.
 */
export function eduSimLink(id: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${basePath()}/sim/?id=${encodeURIComponent(id)}`;
}
