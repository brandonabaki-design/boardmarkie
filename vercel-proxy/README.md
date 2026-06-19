# Boardmarkie image proxy (Vercel — US region)

Same job as [`../worker/`](../worker) — forward image prompts to Google's Imagen
API and add CORS — but deployed on **Vercel**, whose serverless functions run in
a **US region**. Use this instead of the Cloudflare Worker if you're somewhere
Google geo-blocks the Gemini API (the error *"User location is not supported"*).
Cloudflare Workers run close to you, so they can egress from a blocked country;
Vercel functions egress from the US.

## Deploy (no terminal needed)

1. Go to **https://vercel.com** and **sign up with GitHub**.
2. **Add New… → Project**, then **import** your `boardmarkie` repo (grant access
   if Vercel asks).
3. **Root Directory:** click **Edit** and set it to `vercel-proxy`. (Framework
   preset auto-detects as "Other" — leave it.)
4. **Branch:** Vercel deploys your repo's default branch. If the proxy is on a
   feature branch, set **Settings → Git → Production Branch** to that branch
   (or merge it into `main` first).
5. Click **Deploy**.

Your function URL will be:

```
https://<project-name>.vercel.app/api/image
```

Open that URL in a browser — you should see `{"error":"Use POST."}`. That means
it's live (the app talks to it with POST; a browser visit is a GET).

6. In the app: **Settings → Image generation** → set **Image proxy URL** to
   `https://<project-name>.vercel.app/api/image` (keep your Gemini key) → Save.

## Keys

- **Bring-your-own (default):** the teacher's Gemini key is sent per request from
  the app — nothing to set here.
- **Shared key:** add a `GEMINI_API_KEY` environment variable to the Vercel
  project (**Settings → Environment Variables**) and leave the key blank in the
  app's Settings.

## Region

`vercel.json` pins the function to `iad1` (Washington, D.C., USA) — a Gemini-
supported region. Any US region works; Vercel's default is already US.

## Hardening

Set `ALLOW_ORIGIN` in `api/image.js` to your site's origin (e.g.
`https://brandonabaki-design.github.io`) instead of `*`, then redeploy.
