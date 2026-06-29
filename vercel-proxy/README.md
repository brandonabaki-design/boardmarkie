# Boardmarkie backend proxy (Vercel — US region)

A tiny, **zero-dependency** set of serverless functions. It started as just an
image proxy (Google geo-blocks Gemini in some countries; Vercel functions egress
from the US) and now also powers **hosted ("school") mode**: it holds the API
keys and requires Google sign-in, so end users never enter a key.

## Endpoints

| Route | Purpose |
| --- | --- |
| `/api/anthropic/v1/messages` | Authed reverse proxy to Claude (the app's Anthropic SDK points `baseURL` here). |
| `/api/openai-chat` | Ask Boardmarkie (GPT-4o). |
| `/api/openai-image` | gpt-image-1 image generation. |
| `/api/image` | Google Imagen image generation. |
| `/api/imagesearch` | Photo search (Openverse + Pixabay + Unsplash) and `kind=gif` (Giphy). |
| `/api/youtube`, `/api/fetch-image` | Video lookup + image fetch helpers. |

`api/_auth.js` is a shared helper (Supabase token verification + CORS, with a
legacy Firebase fallback); files starting with `_` aren't exposed as routes.

## Deploy (no terminal needed)

1. Go to **https://vercel.com** and **sign up with GitHub**.
2. **Add New… → Project**, then **import** your `boardmarkie` repo.
3. **Root Directory:** click **Edit** and set it to `vercel-proxy`.
4. **Branch:** Vercel deploys the repo's default branch. If the proxy is on a
   feature branch, set **Settings → Git → Production Branch** accordingly (or
   merge to `main`).
5. Add environment variables (below), then **Deploy**.

Your base URL will be `https://<project-name>.vercel.app/api`.

## Environment variables (Settings → Environment Variables)

**Bring-your-own-key mode (default):** none required — keys are sent per request
from the app, and search works keyless via Openverse.

**Hosted ("school") mode** — set these to host the keys + require sign-in:

| Variable | Required | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Shared Claude key (lesson generation). |
| `FIREBASE_PROJECT_ID` **or** `SUPABASE_URL` | yes | **Either one turns auth ON** for every endpoint. Existing deployments already have `FIREBASE_PROJECT_ID` — that's enough; you don't have to change it. |
| `SUPABASE_URL` | optional | Defaults to the committed project URL. Set only to point at a different Supabase project. |
| `SUPABASE_ANON_KEY` | optional | Defaults to the committed public anon key. Set only with a custom `SUPABASE_URL`. |
| `ALLOWED_EMAIL_DOMAINS` | recommended | Comma-separated, e.g. `aisa.edu,students.aisa.edu`. Blank = any signed-in account. |

> Token verification always uses Supabase now (the app's single sign-on). The
> Supabase URL + anon key are public and baked in, so **upgrading is just a code
> redeploy — no env changes**. `FIREBASE_PROJECT_ID` is kept only as an "auth ON"
> switch; keep at least one of it / `SUPABASE_URL` set so the keys aren't left open.
| `OPENAI_API_KEY` | optional | Ask Boardmarkie + GPT image. |
| `GEMINI_API_KEY` | optional | Google Imagen image generation. |
| `PIXABAY_API_KEY` / `UNSPLASH_ACCESS_KEY` | optional | Extra photo sources (Openverse always works without a key). |
| `GIPHY_API_KEY` | optional | GIF search. |

After setting/changing env vars, **redeploy** so they take effect. Verify with a
browser GET, e.g. `https://<project>.vercel.app/api/anthropic` → `{"ok":true,…}`.

> Security: while auth is ON, every request must carry a valid Supabase session
> token whose email matches `ALLOWED_EMAIL_DOMAINS`. This is what keeps the shared
> keys from being used by anyone who finds the URL — set the domain allow-list
> before sharing the app.
>
> Migrating from Firebase auth? Just **redeploy** this proxy — token verification
> now uses Supabase (public URL/key baked in), no env changes needed. An OLD proxy
> build still verifying Firebase rejects every call with `401 "Unexpected token
> algorithm."`, so confirm the latest commit is the live deployment.

## Region

`vercel.json` pins functions to `iad1` (US) — a Gemini-supported region.

## CORS

`api/_auth.js → setCors()` reflects the browser's requested headers (so the
Anthropic SDK's `Authorization` + `x-stainless-*` headers pass preflight) and
allows any origin. To lock it to your site, change the `Access-Control-Allow-Origin`
there to your origin (e.g. `https://brandonabaki-design.github.io`).
