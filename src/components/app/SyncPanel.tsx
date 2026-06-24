"use client";

import { useState } from "react";
import {
  Cloud,
  LogIn,
  LogOut,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "./useAuth";
import { signInWithGoogle, signOutUser } from "@/lib/auth";
import { getFirebaseConfig, setFirebaseConfig } from "@/lib/storage";
import { parseFirebaseConfig, firebaseConfigured } from "@/lib/firebase";
import { syncOnce } from "@/lib/sync";
import { Spinner } from "./ui";

const RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Each signed-in user can read & write only their own data.
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}`;

type Busy = "" | "signin" | "signout" | "sync" | "save";

export function SyncPanel() {
  const { user, ready } = useAuth();
  // SyncPanel only mounts client-side (inside the open Settings modal), so it's
  // safe to read localStorage in the lazy initialisers.
  const [configText, setConfigText] = useState<string>(() => {
    const cfg = getFirebaseConfig();
    return cfg ? JSON.stringify(cfg, null, 2) : "";
  });
  const [configured, setConfigured] = useState<boolean>(() => firebaseConfigured());
  const [busy, setBusy] = useState<Busy>("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const saveConfig = () => {
    const parsed = parseFirebaseConfig(configText);
    if (!parsed) {
      setMsg({
        ok: false,
        text: "Couldn't read that — paste the whole firebaseConfig object from the Firebase console.",
      });
      return;
    }
    const had = getFirebaseConfig();
    setFirebaseConfig(parsed);
    setConfigured(true);
    setConfigText(JSON.stringify(parsed, null, 2));
    if (had && had.projectId !== parsed.projectId) {
      setMsg({ ok: true, text: "Saved. Reloading to switch Firebase projects…" });
      setTimeout(() => window.location.reload(), 900);
    } else {
      setMsg({ ok: true, text: "Sync config saved — sign in below to start syncing." });
    }
  };

  const run = async (kind: Busy, fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    setBusy(kind);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy("");
    }
  };

  const copyRules = async () => {
    try {
      await navigator.clipboard.writeText(RULES);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; the text is selectable below */
    }
  };

  return (
    <div>
      <p className="text-sm text-muted">
        Sign in with Google to sync your saved lessons across devices. Your work lives in{" "}
        <span className="font-semibold text-ink">your own Firebase project</span> (free), and Firestore
        security rules keep it private to your account. Sign-in lasts until you sign out — no weekly
        re-login.
      </p>

      {/* Account state */}
      {user ? (
        <div className="mt-4 rounded-2xl border border-line p-4">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 text-base font-bold text-brand-700">
                {(user.name[0] || "?").toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-brand-700">
              <Cloud size={13} /> Synced
            </span>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => run("sync", syncOnce, "Synced.")}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper disabled:opacity-50"
            >
              {busy === "sync" ? <Spinner /> : <RefreshCw size={15} />} Sync now
            </button>
            <button
              onClick={() => run("signout", signOutUser, "Signed out (your work stays on this device).")}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper disabled:opacity-50"
            >
              {busy === "signout" ? <Spinner /> : <LogOut size={15} />} Sign out
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => run("signin", signInWithGoogle, "Signed in — your lessons will sync.")}
          disabled={!configured || !ready || !!busy}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          title={configured ? "" : "Add your Firebase config below first"}
        >
          {busy === "signin" ? <Spinner /> : <LogIn size={16} />} Sign in with Google
        </button>
      )}

      {msg && (
        <p className={`mt-3 text-xs ${msg.ok ? "font-medium text-brand-700" : "text-coral"}`}>
          {msg.ok ? "✅ " : "❌ "}
          {msg.text}
        </p>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-mint px-3.5 py-3 text-xs text-brand-900">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
        Your API keys never sync — only your lessons. Big AI-generated raster images stay on the device
        that made them (text, layouts, diagrams, web/GIF images and YouTube all sync).
      </div>

      {/* Setup */}
      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-sm font-bold text-ink">One-time setup</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs text-muted">
          <li>
            Create a free project at{" "}
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-700 hover:underline"
            >
              console.firebase.google.com
            </a>
            .
          </li>
          <li>
            Add a <span className="font-semibold text-ink">Web app</span> (the{" "}
            <code className="rounded bg-paper px-1">&lt;/&gt;</code> icon) and copy its{" "}
            <code className="rounded bg-paper px-1">firebaseConfig</code> object into the box below.
          </li>
          <li>
            <span className="font-semibold text-ink">Authentication → Sign-in method</span> → enable{" "}
            <span className="font-semibold text-ink">Google</span>.
          </li>
          <li>
            <span className="font-semibold text-ink">Firestore Database → Create database</span>.
          </li>
          <li>Paste the security rules below into Firestore → Rules → Publish.</li>
          <li>
            <span className="font-semibold text-ink">Authentication → Settings → Authorized domains</span>{" "}
            → add the domain you open Boardmarkie on.
          </li>
        </ol>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-ink">Firebase config</span>
          <textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            placeholder={'{\n  "apiKey": "AIza…",\n  "authDomain": "your-app.firebaseapp.com",\n  "projectId": "your-app",\n  "appId": "1:…:web:…"\n}'}
            spellCheck={false}
            rows={7}
            className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 font-mono text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button
          onClick={saveConfig}
          disabled={busy === "save"}
          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper"
        >
          <Check size={15} /> Save config
        </button>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Firestore security rules</span>
            <button
              onClick={copyRules}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:bg-paper"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-1.5 overflow-auto rounded-xl border border-line bg-paper p-3 text-[11px] leading-relaxed text-ink">
            {RULES}
          </pre>
        </div>

        <a
          href="https://firebase.google.com/docs/firestore/security/get-started"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
        >
          Firestore rules guide <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}
