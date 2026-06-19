# Boardmarkie image proxy (Cloudflare Worker)

Boardmarkie's frontend is a **static** site, and image-generation APIs can't be
called directly from a browser (no CORS, and you shouldn't ship keys in static
JS). This ~90-line Worker is the only server-side piece: it adds CORS and
forwards prompts to Google's **Imagen** image API. It does **not** touch the
Claude/lesson flow — that still runs in the browser with the teacher's key.

> ⚠️ **Geo-blocked region?** Google restricts the Gemini API by country, and a
> Cloudflare Worker runs *near you*, so from a blocked region it fails with
> *"User location is not supported."* In that case use [`../vercel-proxy/`](../vercel-proxy)
> instead — Vercel functions run in the US, which Google accepts.

## What you'll need

- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)
- A **Google Gemini API key** — get one at https://aistudio.google.com/apikey
  (image generation requires a key on a billing-enabled Google Cloud project)

## Deploy (one time)

```bash
cd worker
npx wrangler login          # opens the browser once
npx wrangler deploy
```

`wrangler deploy` prints your Worker URL, e.g.
`https://boardmarkie-image-proxy.<your-subdomain>.workers.dev`.

Copy that URL into the app: **Settings → Image generation → Image proxy URL**.

## Two ways to handle the API key

- **Bring-your-own (default).** Each teacher pastes their own Gemini key in
  **Settings**; the app sends it with each request and the Worker forwards it.
  Nothing to configure here — you don't pay for image generation.

- **Shared hidden key.** You pay; teachers don't need their own key. Set it as a
  Worker secret and leave the key field blank in the app:
  ```bash
  npx wrangler secret put GEMINI_API_KEY
  ```

## Recommended hardening

- In `image-proxy.js`, change `ALLOW_ORIGIN` from `"*"` to your site origin
  (e.g. `https://brandonabaki-design.github.io`) and redeploy, so only your app
  can call the proxy.
- If you run a shared key, consider Cloudflare rate limiting to cap spend.

## Switching the image model

Edit `DEFAULT_MODEL` in `image-proxy.js` (then redeploy). Options:

| Model | Notes |
| --- | --- |
| `imagen-4.0-fast-generate-001` | **Default** — fastest & cheapest (~$0.02/image) |
| `imagen-4.0-generate-001` | Higher quality, a bit slower/pricier |
| `imagen-4.0-ultra-generate-001` | Highest quality |

The app can also override the model per request, but the Worker default is the
simplest place to set it.
