<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Boardmarkie — project notes

AI lesson generator for teachers (a Chalkie AI clone). Next.js 16 (App Router),
React 19, TypeScript, Tailwind v4, Anthropic Claude.

## Conventions
- Generation goes through `src/lib/generate.ts` → Claude **structured outputs**
  (JSON Schema in `src/lib/schemas.ts`). Schemas mark every field `required` and
  the raw model output is pruned into clean optional fields by the `to*` mappers.
- Model: `claude-opus-4-8` (see `src/lib/anthropic.ts`). Calls stream via
  `client.messages.stream(...).finalMessage()` to avoid timeouts.
- API key: **bring-your-own**, client-side. `src/lib/client.ts` builds the
  Anthropic client in the browser (`dangerouslyAllowBrowser`) with the key from
  localStorage. There is no server.
- Prompts live in `src/lib/prompts.ts`; curriculum options in `src/lib/curricula.ts`.
- The app is at `/create` (client component, `src/components/app/CreateApp.tsx`);
  the landing page is `/`.
- Saved work + the API key live in browser localStorage (`src/lib/storage.ts`).

## Cross-device sync — now on Supabase (this section describes the old Firebase setup, retired)
> SUPERSEDED: auth + per-user sync moved to Supabase (single sign-on). See the
> "EduSim + shared libraries" and "Single sign-on" notes below and docs/EDUSIM.md.
> The Firebase description below is kept for historical context only.

## Cross-device sync (Firebase, retired) — optional, keeps the app static
- Google sign-in + cross-device library sync run entirely client-side against the
  user's **own Firebase project** (a managed backend), so `output: "export"` stays.
  Nothing here runs at import time; all init is lazy + browser-guarded so the SSG
  build never touches Firebase.
- Layers: `src/lib/firebase.ts` (lazy app/auth/db init; config from localStorage,
  with a `NEXT_PUBLIC_FIREBASE_*` build-time fallback; `ignoreUndefinedProperties`
  on Firestore so artifacts' optional fields don't throw) → `src/lib/auth.ts`
  (Google popup sign-in, `browserLocalPersistence` so sign-in lasts until sign-out)
  → `src/lib/sync.ts` (per-user `users/{uid}/artifacts/{id}`; push/delete/pull/
  `subscribeArtifacts` snapshot listener/`syncOnce` reconcile; last-write-wins by
  `updatedAt`).
- `storage.ts` stays Firebase-free to avoid an import cycle: it exposes
  `setStorageSyncHooks` (sync.ts registers cloud push/delete), local-only writers
  `putArtifactLocal`/`removeArtifactLocal` (sync applies remote changes without
  echoing them back), and a coalesced `LIBRARY_EVENT` the UI listens to.
- **Config is not a secret** (Google ships it in client code); access is enforced
  by Firestore security rules (`request.auth.uid == uid`) + Auth authorized
  domains. Setup UI + rules text live in `src/components/app/SyncPanel.tsx`
  (Settings → Sync). Heavy base64 images are stripped before cloud writes (1MB doc
  cap); text/layout/SVG/URL-media sync, AI-raster images stay on the source device.

## Hosted ("school") mode — optional, gated + shared keys
- Off by default (the app stays bring-your-own-key + static). Turned ON at BUILD
  time by `NEXT_PUBLIC_BACKEND_URL` (the proxy's `/api` root). When on:
  sign-in is **required** to reach `/create`, and all API keys live on the
  backend so users enter nothing. `src/lib/backend.ts` is the single switch
  (`isHostedMode`, `getBackendBase`, `getIdToken`, `emailAllowed`); every client
  lib (`client.ts`, `openai.ts`, `images.ts`, `imageSearch.ts`, `gifSearch.ts`)
  branches on it. Existing BYO/dev builds (env unset) are unaffected.
- Claude keeps using the Anthropic SDK; in hosted mode its `baseURL` points at
  `…/api/anthropic`, an **authed reverse proxy** that injects the server key and
  streams responses straight back — so structured outputs/streaming are
  unchanged. Note: serverless `maxDuration` caps generation at ~60s.
- Auth/gating: `SignInWall` blocks `/create` until signed in; the email domain is
  checked client-side (UX) **and** enforced server-side. The proxy verifies the
  Firebase ID token with no firebase-admin dep — `vercel-proxy/api/_auth.js`
  validates RS256 against Google's x509 certs + `aud`/`iss`/`exp`/`email_verified`
  + `ALLOWED_EMAIL_DOMAINS`. Auth is enabled per-endpoint whenever
  `FIREBASE_PROJECT_ID` is set on the project.
- Proxy env vars (Vercel) + build vars (GitHub Actions `vars.BACKEND_URL`,
  `vars.ALLOWED_EMAIL_DOMAINS`, `secrets.FIREBASE_CONFIG`) are documented in
  `vercel-proxy/README.md`. Settings hides key fields in hosted mode.

## EduSim + shared libraries (Supabase) — see `docs/EDUSIM.md`
- The standalone EduSim Hub (`html-viewer`) is folded in as native routes backed
  by **Supabase** (browser anon key + RLS; stays a static export). `src/lib/
  supabase.ts` (client + `eduSimLink`), `src/lib/sims.ts` (simulations data
  layer), `src/lib/lessonsLib.ts` (shared lessons), `src/lib/supabaseAuth.ts`
  (Google + magic-link sign-in). DB setup: `supabase/schema.sql` (idempotent).
- Routes: `/sims` (library), `/sim/?id=` (sandboxed viewer + QR), `/sims/new|edit`
  (paste-from-Gemini editor with Claude auto-categorize), `/sims/me`, `/lessons`
  (shared lesson catalogue). Untrusted sim HTML renders only via
  `SandboxedHtml.tsx` (`iframe srcdoc`, `sandbox="allow-scripts"`, no same-origin).
- Auto-categorize: `extractSimMetadata` (`client.ts`) + `simExtractSchema`
  (`schemas.ts`) — same structured-output convention as lessons.
- Canvas: the **EduSim** toolbar tool embeds a sim link as a QR (`ImageElement`
  with an `eduSimUrl` marker + SVG QR from `src/lib/qr.ts`); renders/exports with
  no extra code. The lesson **EduSim** button (copy JSON → Gemini → paste →
  auto-create sim → QR slide) and **Share** button (publish lesson) live in
  `CreateApp`.
- **Single sign-on**: the whole app now signs in with ONE Supabase account
  (Google + magic link). `src/lib/auth.ts` is Supabase-backed (keeps the old
  `AppUser`/`onAuthChange`/`getCurrentUser` API), `src/lib/sync.ts` syncs the
  per-user library to the Supabase `lessons` table, and Firebase has been removed.
  Hosted mode now sends a Supabase JWT (proxy must verify it). Sharing big raster
  images via Supabase Storage is the one remaining follow-up — see `docs/EDUSIM.md`.

## Build & deploy
- Static export (`output: "export"` in `next.config.ts`); `basePath`/`assetPrefix`
  come from `PAGES_BASE_PATH` (empty locally, `/boardmarkie` on Pages).
- `.github/workflows/deploy.yml` builds and publishes to GitHub Pages on push.
- To offer a hosted version with a **hidden shared key**: add a server route
  (e.g. `src/app/api/generate/route.ts`) that calls Claude with
  `process.env.ANTHROPIC_API_KEY`, point `client.ts` at it via `fetch`, drop
  `output: "export"`, and deploy to a Node host (e.g. Vercel).

## Checks
- `npm run build` must pass (runs TypeScript + lint).
