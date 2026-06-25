"use client";

// Lazy, browser-only Firebase initialisation.
//
// Nothing here touches Firebase at import time, so the static-export build (which
// evaluates modules in Node) never tries to initialise an app without a config.
// `initializeApp` / `getAuth` / `getFirestore` run only when first called in the
// browser, after a config has been resolved.
//
// Config resolution order: the per-browser config saved in Settings (localStorage)
// wins, then a build-time NEXT_PUBLIC_FIREBASE_* fallback (for a hosted deploy
// that ships the config baked in). The Firebase web config is not a secret —
// access is enforced by Firestore security rules + Auth.

import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseConfig, type FirebaseConfig } from "./storage";

// Parse the config object a teacher copies from the Firebase console. Accepts
// strict JSON, a `const firebaseConfig = { ... };` snippet, or a bare JS object
// literal (unquoted keys / single quotes / trailing commas / // comments).
export function parseFirebaseConfig(text: string): FirebaseConfig | null {
  if (!text || !text.trim()) return null;
  const t = text.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let body = t.slice(start, end + 1);

  let obj: Record<string, unknown> | null = null;
  try {
    obj = JSON.parse(body) as Record<string, unknown>;
  } catch {
    try {
      body = body
        .replace(/\/\/[^\n\r]*/g, "") // line comments
        .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":') // bare keys → "key":
        .replace(/'/g, '"') // single → double quotes
        .replace(/,(\s*[}\]])/g, "$1"); // trailing commas
      obj = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  const cfg = (obj ?? {}) as Partial<FirebaseConfig>;
  if (!cfg.apiKey || !cfg.projectId || !cfg.appId) return null;
  return {
    apiKey: String(cfg.apiKey),
    authDomain: String(cfg.authDomain ?? `${cfg.projectId}.firebaseapp.com`),
    projectId: String(cfg.projectId),
    storageBucket: cfg.storageBucket ? String(cfg.storageBucket) : undefined,
    messagingSenderId: cfg.messagingSenderId ? String(cfg.messagingSenderId) : undefined,
    appId: String(cfg.appId),
    measurementId: cfg.measurementId ? String(cfg.measurementId) : undefined,
  };
}

// Build-time fallback (inlined by Next): a single NEXT_PUBLIC_FIREBASE_CONFIG
// JSON blob, or the individual NEXT_PUBLIC_FIREBASE_* fields.
function envConfig(): FirebaseConfig | null {
  const blob = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (blob) {
    const parsed = parseFirebaseConfig(blob);
    if (parsed) return parsed;
  }
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (apiKey && projectId && appId) {
    return {
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
      appId,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
    };
  }
  return null;
}

export function resolveFirebaseConfig(): FirebaseConfig | null {
  return getFirebaseConfig() ?? envConfig();
}

export function firebaseConfigured(): boolean {
  return !!resolveFirebaseConfig();
}

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (app) return app;
  const cfg = resolveFirebaseConfig();
  if (!cfg) return null;
  app = getApps().length ? getApp() : initializeApp(cfg);
  return app;
}

export function getAuthInstance(): Auth | null {
  const a = getFirebaseApp();
  return a ? getAuth(a) : null;
}

let db: Firestore | null = null;

export function getDb(): Firestore | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (db) return db;
  // Artifacts carry many optional (undefined) fields; ignore them on write
  // rather than throwing "Unsupported field value: undefined".
  try {
    db = initializeFirestore(a, { ignoreUndefinedProperties: true });
  } catch {
    db = getFirestore(a); // already initialised on this app
  }
  return db;
}
