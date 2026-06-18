# Boardmarkie 🖊️

**The AI lesson generator for teachers.** Type a topic, pick a year group and
curriculum, and Boardmarkie builds a complete, classroom-ready lesson — slides,
objectives, vocabulary, activities, discussion prompts, a quiz and a plenary —
in seconds. It also generates connected lesson **series** (units) and printable
**worksheets** with answer keys, and exports to PowerPoint, Google Slides and PDF.

It's a from-scratch build of what [Chalkie AI](https://chalkie.ai) does, powered
by Anthropic's Claude.

## ▲ Deploy your own (1 click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/brandonabaki-design/boardmarkie&project-name=boardmarkie&repository-name=boardmarkie&env=ANTHROPIC_API_KEY&envDescription=Optional%20Anthropic%20API%20key%20—%20users%20can%20also%20add%20their%20own%20in%20the%20app%27s%20Settings)

Clicking the button forks the repo to your Vercel account and gives you a live
URL. Setting `ANTHROPIC_API_KEY` is **optional** — without a server key, the app
still works because each user can paste their own key in the in-app **Settings**
dialog (stored only in their browser).

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

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Anthropic Claude** (`claude-opus-4-8`) via the official SDK, using
  **structured outputs** (JSON Schema) for reliable, well-formed lesson data
- **pptxgenjs** for PowerPoint export, **lucide-react** for icons

## 🚀 Getting started

```bash
npm install

# Option A: configure the key on the server
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

npm run dev          # http://localhost:3000
```

Then open the app at **/create**.

> **No server key?** No problem. Open **Settings** in the app and paste your own
> Anthropic API key — it's stored only in your browser's local storage and sent
> directly with each request. Get a key at
> [console.anthropic.com](https://console.anthropic.com/settings/keys).

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |

## 🔑 How the API key is resolved

Each request resolves a key in this order:

1. A per-request key from the in-app **Settings** dialog (sent as the
   `x-user-key` header; stored only in the browser).
2. The server's `ANTHROPIC_API_KEY` environment variable.

If neither is present, the app returns a friendly prompt to add a key. The
Anthropic SDK also honours `ANTHROPIC_BASE_URL` if you use a gateway.

## 🗂️ Project structure

```
src/
  app/
    page.tsx              # marketing landing page
    create/page.tsx       # the app
    api/generate/route.ts # POST → lesson / series / worksheet
    api/edit/route.ts     # POST → AI edits to an existing lesson
  components/
    landing/              # hero, features, pricing, FAQ, …
    app/                  # generator form, slide/worksheet/series views, exports
  lib/
    anthropic.ts          # Claude client factory + model
    prompts.ts            # system/user prompts per mode
    schemas.ts            # JSON Schemas for structured output
    generate.ts           # Claude call + raw→clean mappers
    curricula.ts          # regions, year groups, subjects
    export.ts             # PPTX / PDF / JSON export
    storage.ts            # local library + key storage
    types.ts              # shared types
```

## ☁️ Deploying

Deploy anywhere that runs Next.js (e.g. Vercel). Set `ANTHROPIC_API_KEY` as an
environment variable, or let each user bring their own key via Settings.

---

Built with [Claude](https://www.anthropic.com). Plan less, teach more.
