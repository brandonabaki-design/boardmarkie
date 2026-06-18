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
- API key: per-request `x-user-key` header (browser localStorage) → falls back to
  `process.env.ANTHROPIC_API_KEY`.
- Prompts live in `src/lib/prompts.ts`; curriculum options in `src/lib/curricula.ts`.
- The app is at `/create` (client component, `src/components/app/CreateApp.tsx`);
  the landing page is `/`.
- Saved work + the API key live in browser localStorage (`src/lib/storage.ts`).

## Checks
- `npm run build` must pass (runs TypeScript + lint).
