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

## Cross-device sync (Firebase) — optional, keeps the app static
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
