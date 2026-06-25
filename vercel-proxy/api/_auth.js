// Shared auth + CORS for Boardmarkie's hosted ("school") backend.
//
// Verifies a Firebase ID token (from Google sign-in in the app) WITHOUT the
// firebase-admin SDK — pure Node crypto + Google's public x509 certs — so the
// proxy keeps its zero-dependency, no-build setup. Optionally restricts to one
// or more email domains.
//
// Set these env vars on the Vercel project to turn gating on:
//   FIREBASE_PROJECT_ID    e.g. aisa-present   (REQUIRED to enable auth)
//   ALLOWED_EMAIL_DOMAINS  e.g. aisa.edu,students.aisa.edu  (blank = any Google account)
//
// Files prefixed with "_" are not exposed as routes by Vercel, so this is a
// private helper imported by the endpoint functions.

import crypto from "crypto";

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

// Returns { ok:true, user:{ uid, email } } or { ok:false, status, error }.
export async function verifyAuth(req) {
  const projectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
  if (!projectId) {
    return { ok: false, status: 500, error: "Server missing FIREBASE_PROJECT_ID." };
  }

  const authz = req.headers.authorization || req.headers.Authorization || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
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

  const allowed = String(process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length) {
    const domain = email.split("@")[1] || "";
    const ok = allowed.some((d) => domain === d || domain.endsWith(`.${d}`));
    if (!ok) {
      return { ok: false, status: 403, error: "Your account isn't permitted to use this app." };
    }
  }

  return { ok: true, user: { uid: payload.sub, email } };
}

// True when the project is configured for gating. Endpoints call verifyAuth only
// when this is on, so a bring-your-own-key deploy (no FIREBASE_PROJECT_ID) is
// unaffected.
export function authEnabled() {
  return !!(process.env.FIREBASE_PROJECT_ID || "").trim();
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
