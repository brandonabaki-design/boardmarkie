# EduSim + shared libraries

This folds the standalone **EduSim Hub** (the `html-viewer` app) into Boardmarkie
as native Next.js routes, backed by **Supabase**, and adds a shared lesson
library. Everything stays a static export (`output: "export"`) — Supabase is
called from the browser with the public anon key, gated by Row-Level Security.

## What's included

- **Canvas “Add EduSim” tool** — in the slide editor toolbar (next to
  Text/Image/Shape/Video): paste a simulation link → it embeds a scannable QR as
  an image element (renders + exports to PPTX/PDF/print, and syncs, unchanged).
- **EduSim library** (`/sims`) — browse every published simulation (shared across
  all teachers), filter by grade/subject/sort.
- **EduSim viewer** (`/sim/?id=<uuid>`) — full-screen sandboxed render of a sim,
  with a QR overlay + details. This is what every QR/link resolves to.
- **EduSim editor** (`/sims/new`, `/sims/edit/?id=`) — paste the HTML from Gemini;
  Claude **auto-categorizes** it (grade, subject, concepts, standards,
  description); live sandboxed preview; publish (or keep as a private draft).
- **My Sims** (`/sims/me`) — author dashboard (publish/draft, edit, delete).
- **Lesson → EduSim wizard** — the **EduSim** button in the lesson editor copies
  the lesson (+ a ready-made prompt), opens Gemini, takes the returned HTML,
  auto-categorizes + saves it, and drops a dedicated **“Try the Simulation”**
  QR slide into the deck.
- **Shared lesson library** (`/lessons`) — the **Share** button publishes a lesson
  to a world-readable catalogue; any teacher can open a shared lesson as a fresh
  local copy to adapt (`/create/?shared=<id>`).
- **Sign-in** — Supabase (Google + email magic link), `src/lib/supabaseAuth.ts`.

## Key files

| Concern | File |
|---|---|
| Supabase client + link helpers | `src/lib/supabase.ts` |
| Sign-in (Google + magic link) | `src/lib/supabaseAuth.ts` |
| Simulations data layer | `src/lib/sims.ts` |
| Shared lessons data layer | `src/lib/lessonsLib.ts` |
| Auto-categorize (Claude) | `extractSimMetadata` in `src/lib/client.ts` + `simExtractSchema` in `src/lib/schemas.ts` |
| QR generation | `src/lib/qr.ts` |
| Untrusted-HTML sandbox | `src/components/app/SandboxedHtml.tsx` |
| Canvas QR element | `eduSimUrl` on `ImageElement` (`types.ts`), `normalizeEduSimUrl` (`canvas.ts`), the EduSim tool in `CanvasEditor.tsx` |
| DB schema (run once) | `supabase/schema.sql` |

## One-time Supabase setup

The committed defaults in `src/lib/supabase.ts` point at the existing EduSim Hub
Supabase project, so simulations work out of the box. To finish enabling
**publishing** and the **shared lesson library** on Boardmarkie's domain:

1. **Run the schema.** Supabase Dashboard → SQL Editor → paste `supabase/schema.sql`
   → Run. (Idempotent; adds the `lessons` table + RLS to the existing project.)
2. **Allow Boardmarkie's redirect URL.** Supabase → Authentication → URL
   Configuration → add your app origin to **Site URL** / **Redirect URLs**, e.g.
   `https://brandonabaki-design.github.io/boardmarkie/` (and `http://localhost:3000/`
   for local dev). Sign-in returns the user to the page they started from, so the
   origin must be allow-listed.
3. **Enable Google** (Authentication → Providers) if not already; email magic
   link works out of the box.
4. **(Optional) point at a different project.** Set repo *Variables*
   `SUPABASE_URL` / `SUPABASE_ANON_KEY` (Settings → Secrets and variables →
   Actions → Variables). The anon key is not a secret (RLS enforces access).

## Single sign-on (Supabase) — Firebase retired

The whole app now uses **one Supabase account** (Google OAuth or email magic
link). Firebase has been removed.

- `src/lib/auth.ts` — Supabase-backed, but keeps the lesson app's existing API
  (`AppUser` / `onAuthChange` / `getCurrentUser` / `signInWithGoogle` /
  `signOutUser`, plus `signInWithEmail`). Shares the single `supabase` client with
  `src/lib/supabaseAuth.ts` (the EduSim hook), so one session covers everything.
- `src/lib/sync.ts` — per-user library sync now writes to the Supabase `lessons`
  table (RLS: `author_id = auth.uid()`), via the same `storage.ts` hook pattern.
  Each artifact is one row; `is_published=false` = private (your library only),
  `true` = shared to `/lessons`. Saves omit `is_published`, so they never
  un-publish. Live cross-device updates use Supabase Realtime (`subscribeArtifacts`).
- `src/components/app/SyncPanel.tsx` (Settings → Sync) is now a Supabase
  sign-in/account panel — no per-user config needed.
- `getFirebaseConfig`/`setFirebaseConfig` remain in `storage.ts` but are unused
  (harmless); the `firebase` npm dependency has been removed.

**Hosted ("school") mode caveat:** `backend.ts` `getIdToken()` now returns the
Supabase access token, so if you enable hosted mode the proxy
(`vercel-proxy/api/_auth.js`) must verify a **Supabase JWT** instead of a Firebase
ID token. Bring-your-own-key builds (the default GitHub Pages deploy) are
unaffected.

### Not yet done
- **Shared raster images.** Big AI-generated `data:` images are still stripped
  before any cloud write (doc-size + cross-account portability), so they stay on
  the device that made them. To share them, add a public-read Supabase **Storage**
  bucket (e.g. `lesson-images`), upload on save/publish, and rewrite `data:` URLs
  to Storage URLs. Text, layouts, SVG diagrams and URL media already sync/share.
