// Shared auth + CORS for Boardmarkie's hosted ("school") backend.
//
// The app signs in with Supabase (single sign-on), so we verify the caller's
// Supabase access token by introspecting it against the project's Auth API
// (/auth/v1/user). This needs no JWT secret and works regardless of the token's
// signing scheme. The Supabase URL + anon key default to the committed PUBLIC
// values (not secrets — access is enforced by RLS), so the proxy works after a
// code redeploy with NO env vars to set; override them only to point at a
// different project. Optionally restricts to email domains.
//
// Env vars on the Vercel project:
//   SUPABASE_URL           optional — defaults to the committed project URL
//   SUPABASE_ANON_KEY      optional — defaults to the committed public anon key
//   ALLOWED_EMAIL_DOMAINS  e.g. aisa.edu,students.aisa.edu  (blank = any account)
//   FIREBASE_PROJECT_ID    legacy — kept only as an "auth ON" switch (see authEnabled)
//
// Files prefixed with "_" are not exposed as routes by Vercel.

// PUBLIC defaults (mirror src/lib/supabase.ts). Safe to ship — RLS enforces access.
const DEFAULT_SUPABASE_URL = "https://ojifqcnsvbvkvpvwmovr.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_87Sk_zzm6QLFeDfi3E_woQ_Kw3rCzyx";

function supabaseUrl() {
  return (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, "");
}
function supabaseAnonKey() {
  return (process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
}

// CORS that reflects the browser's requested headers, so the Anthropic SDK's
// Authorization + x-stainless-* headers pass preflight. ("*" does NOT cover the
// Authorization header per spec, so reflection is the robust choice.)
export function setCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  const requested = req.headers["access-control-request-headers"];
  res.setHeader("Access-Control-Allow-Headers", requested || "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function bearer(req) {
  const authz = req.headers.authorization || req.headers.Authorization || "";
  return authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
}

function checkDomain(email) {
  const allowed = String(process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return true;
  const domain = (email.split("@")[1] || "").toLowerCase();
  return allowed.some((d) => domain === d || domain.endsWith(`.${d}`));
}

// Validate the caller's Supabase access token via the Auth API.
// Returns { ok:true, user:{ uid, email } } or { ok:false, status, error }.
export async function verifyAuth(req) {
  const token = bearer(req);
  if (!token) return { ok: false, status: 401, error: "Sign in required." };

  let r;
  try {
    r = await fetch(`${supabaseUrl()}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey() },
    });
  } catch {
    return { ok: false, status: 502, error: "Could not reach the auth server." };
  }
  if (r.status === 401 || r.status === 403) {
    return { ok: false, status: 401, error: "Session expired — please sign in again." };
  }
  if (!r.ok) return { ok: false, status: 502, error: "Auth verification failed." };

  let u;
  try {
    u = await r.json();
  } catch {
    return { ok: false, status: 502, error: "Auth verification failed." };
  }

  const email = String(u?.email || "").toLowerCase();
  if (!u?.id || !email) return { ok: false, status: 403, error: "A verified email is required." };
  if (!checkDomain(email)) {
    return { ok: false, status: 403, error: "Your account isn't permitted to use this app." };
  }
  return { ok: true, user: { uid: u.id, email } };
}

// True when the project is configured for gating. Endpoints call verifyAuth only
// when this is on, so a bring-your-own-key deploy (no auth env) is unaffected.
// SUPABASE_URL or the legacy FIREBASE_PROJECT_ID act as the "auth ON" switch —
// keep at least one set so the shared keys aren't left open. (Verification always
// uses Supabase; FIREBASE_PROJECT_ID is no longer used for verifying.)
export function authEnabled() {
  return !!((process.env.SUPABASE_URL || "").trim() || (process.env.FIREBASE_PROJECT_ID || "").trim());
}

// Parse a JSON body whether Vercel pre-parsed it (object), left it a string, or
// (rarely) streamed it.
export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}
