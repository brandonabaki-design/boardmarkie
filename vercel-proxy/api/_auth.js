// Shared auth + CORS for Boardmarkie's hosted ("school") backend.
//
// The app signs in with Supabase (single sign-on), so we verify the caller's
// Supabase access token by introspecting it against the project's Auth API
// (/auth/v1/user). This needs no JWT secret and works regardless of the token's
// signing scheme (HS256 or asymmetric). A legacy Firebase ID-token path is kept
// as a fallback for older deployments. Optionally restricts to email domains.
//
// Set these env vars on the Vercel project to turn gating on:
//   SUPABASE_URL           e.g. https://xxxx.supabase.co   (REQUIRED for Supabase auth)
//   SUPABASE_ANON_KEY      the project's public anon/publishable key
//   ALLOWED_EMAIL_DOMAINS  e.g. aisa.edu,students.aisa.edu  (blank = any account)
//   FIREBASE_PROJECT_ID    (legacy only — used if SUPABASE_URL is not set)
//
// Files prefixed with "_" are not exposed as routes by Vercel.

import crypto from "crypto";

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

// ---- Supabase: validate the access token via the Auth API ----
async function verifySupabase(req, supabaseUrl) {
  const apikey = (process.env.SUPABASE_ANON_KEY || "").trim();
  if (!apikey) return { ok: false, status: 500, error: "Server missing SUPABASE_ANON_KEY." };

  const token = bearer(req);
  if (!token) return { ok: false, status: 401, error: "Sign in required." };

  let r;
  try {
    r = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey },
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

// ---- Legacy Firebase ID-token verification (used only if SUPABASE_URL unset) ----
const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let certCache = { certs: null, exp: 0 };

async function getCerts() {
  const now = Date.now();
  if (certCache.certs && now < certCache.exp) return certCache.certs;
  const r = await fetch(CERT_URL);
  if (!r.ok) throw new Error("cert fetch failed");
  const certs = await r.json();
  const cc = r.headers.get("cache-control") || "";
  const m = cc.match(/max-age=(\d+)/);
  const ttl = m ? parseInt(m[1], 10) * 1000 : 3600 * 1000;
  certCache = { certs, exp: now + ttl };
  return certs;
}

function b64urlToBuf(s) {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return Buffer.from(t, "base64");
}
function decodeSegment(s) {
  return JSON.parse(b64urlToBuf(s).toString("utf8"));
}

async function verifyFirebase(req, projectId) {
  const token = bearer(req);
  if (!token) return { ok: false, status: 401, error: "Sign in required." };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, status: 401, error: "Malformed token." };

  let header, payload;
  try {
    header = decodeSegment(parts[0]);
    payload = decodeSegment(parts[1]);
  } catch {
    return { ok: false, status: 401, error: "Malformed token." };
  }
  if (header.alg !== "RS256" || !header.kid) {
    return { ok: false, status: 401, error: "Unexpected token algorithm." };
  }

  let certs;
  try {
    certs = await getCerts();
  } catch {
    return { ok: false, status: 502, error: "Could not fetch verification keys." };
  }
  const certPem = certs[header.kid];
  if (!certPem) return { ok: false, status: 401, error: "Unknown token key." };

  try {
    const pub = new crypto.X509Certificate(certPem).publicKey;
    const v = crypto.createVerify("RSA-SHA256");
    v.update(`${parts[0]}.${parts[1]}`);
    v.end();
    if (!v.verify(pub, b64urlToBuf(parts[2]))) {
      return { ok: false, status: 401, error: "Bad token signature." };
    }
  } catch {
    return { ok: false, status: 401, error: "Token verification failed." };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) return { ok: false, status: 401, error: "Token audience mismatch." };
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    return { ok: false, status: 401, error: "Token issuer mismatch." };
  }
  if (!payload.sub) return { ok: false, status: 401, error: "Token missing subject." };
  if (typeof payload.exp !== "number" || payload.exp < now - 60) {
    return { ok: false, status: 401, error: "Token expired — please sign in again." };
  }
  if (typeof payload.iat !== "number" || payload.iat > now + 300) {
    return { ok: false, status: 401, error: "Token not yet valid." };
  }
  const email = String(payload.email || "").toLowerCase();
  if (!payload.email_verified || !email) {
    return { ok: false, status: 403, error: "A verified email is required." };
  }
  if (!checkDomain(email)) {
    return { ok: false, status: 403, error: "Your account isn't permitted to use this app." };
  }
  return { ok: true, user: { uid: payload.sub, email } };
}

// Returns { ok:true, user:{ uid, email } } or { ok:false, status, error }.
export async function verifyAuth(req) {
  const supabaseUrl = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  if (supabaseUrl) return verifySupabase(req, supabaseUrl);
  const projectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
  if (projectId) return verifyFirebase(req, projectId);
  return { ok: false, status: 500, error: "Server missing SUPABASE_URL." };
}

// True when the project is configured for gating. Endpoints call verifyAuth only
// when this is on, so a bring-your-own-key deploy (no auth env) is unaffected.
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
