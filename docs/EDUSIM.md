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

## Auth today (and the planned consolidation)

The user-chosen end state is **one sign-in on Supabase, Firebase retired**. This
change set delivers the full EduSim feature + shared lesson library *additively*:

- **Lesson private library + cross-device sync** still run on **Firebase**
  (`src/lib/auth.ts`, `sync.ts`, `firebase.ts`) — untouched and working.
- **EduSim + shared-lesson publishing/browse** run on **Supabase**
  (`src/lib/supabaseAuth.ts`).

So a teacher may sign in twice (once per backend) until consolidation. Remaining
work to reach the single-sign-in end state:

1. Repoint the lesson app's `useAuth`/`AppUser` at `supabaseAuth` (keep the
   `AppUser` shape so callers barely change).
2. Move per-user lesson sync from Firestore to Supabase (a `lessons`-style
   per-user store, or reuse the shared table with an `is_published=false` draft
   state), replacing `sync.ts`’s Firestore calls; keep `storage.ts`’s hook
   pattern (it’s backend-agnostic).
3. Host shared raster images in **Supabase Storage** (today base64 raster is
   stripped before upload, as it was before Firestore) so AI images survive
   cross-account. Suggested: a public-read `lesson-images` bucket; upload on
   publish and rewrite `data:` URLs to Storage URLs.
4. Update hosted-mode token verification in `vercel-proxy/api/_auth.js` to accept
   Supabase JWTs instead of Firebase ID tokens.
5. Remove Firebase deps once nothing imports them.
