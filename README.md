# Boardmarkie 🖊️

**The AI lesson generator for teachers.** Type a topic, pick a year group and
curriculum, and Boardmarkie builds a complete, classroom-ready lesson — slides,
objectives, vocabulary, activities, discussion prompts, a quiz and a plenary —
in seconds. It also generates connected lesson **series** (units) and printable
**worksheets** with answer keys, and exports to PowerPoint, Google Slides and PDF.

It's a from-scratch build of what [Chalkie AI](https://chalkie.ai) does, powered
by Anthropic's Claude.

## 🌐 Live app

Published via GitHub Pages: **https://brandonabaki-design.github.io/boardmarkie/**

Boardmarkie is a **bring-your-own-key** static app: open **Settings**, paste your
Anthropic API key (stored only in your browser, sent directly to Anthropic), and
start generating. Get a key at
[console.anthropic.com](https://console.anthropic.com/settings/keys).

## ✨ Features

- **Full lesson decks** — title, objectives, vocabulary, teaching slides,
  activities, discussion, a quick quiz and a plenary, pitched to the year group.
- **Lesson series** — connected units of up to 12 lessons that build logically;
  expand any lesson in a unit into a full deck with one click.
- **Worksheets** — mixed question types (short/long answer, MCQ, fill-in,
  true/false, matching) with a complete answer key. Print-ready.
- **One-click editing** — "make it more fun", "simplify", "stretch", "shorten",
  "add a slide", or give a free-form instruction — for the whole lesson or a
  single slide.
- **Curriculum aligned** — UK, US (Common Core / state standards), Australian and
  international / IB frameworks, with the right year/grade labels.
- **Export anywhere** — PowerPoint (`.pptx`, opens in Google Slides & Keynote),
  print-ready PDF, or raw JSON.
- **Your library** — everything you generate is saved locally in your browser.

## 🧱 Tech stack

- **Next.js 16** (App Router, static export) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Anthropic Claude** (`claude-opus-4-8`) via the official SDK, called directly
  from the browser with your key, using **structured outputs** (JSON Schema) for
  reliable, well-formed lesson data
- **pptxgenjs** for PowerPoint export, **lucide-react** for icons

## 🚀 Run locally

```bash
npm install
npm run dev          # http://localhost:3000  (app lives at /create)
```

Then open the app, click **Settings**, and add your Anthropic API key.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Static production build → `out/` |
| `npm run start` | Serve a non-exported build (dev convenience) |
| `npm run lint` | Lint |

## ☁️ Deploying

- **GitHub Pages** — the included workflow (`.github/workflows/deploy.yml`)
  builds and publishes on every push. In the repo's **Settings → Pages**, set
  **Source = GitHub Actions** (the workflow also tries to enable this for you).
- **Any static host** — Vercel, Netlify and Cloudflare Pages auto-detect Next.js
  and serve the static export. No server or secrets required.

  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/brandonabaki-design/boardmarkie&project-name=boardmarkie&repository-name=boardmarkie)

> **Want a hosted version where visitors don't need their own key?** That needs a
> small server to keep a shared key private (a static site can't hide one). The
> app is structured so this is a quick change — see the notes in `AGENTS.md`.

## 🗂️ Project structure

```
src/
  app/
    page.tsx              # marketing landing page
    create/page.tsx       # the app
  components/
    landing/              # hero, features, pricing, FAQ, …
    app/                  # generator form, slide/worksheet/series views, exports
  lib/
    client.ts             # browser-side Claude calls (BYO key)
    anthropic.ts          # model id + shared constants
    prompts.ts            # system/user prompts per mode
    schemas.ts            # JSON Schemas for structured output
    generate.ts           # Claude call helper + raw→clean mappers
    curricula.ts          # regions, year groups, subjects
    export.ts             # PPTX / PDF / JSON export
    storage.ts            # local library + key storage
    types.ts              # shared types
```

---

Built with [Claude](https://www.anthropic.com). Plan less, teach more.
