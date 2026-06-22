// Shared Claude config. The app is a static, bring-your-own-key client:
// generation happens directly in the browser with the user's key (see
// src/lib/client.ts), so there is no server component here.

export type ModelId = "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-8";

// Default generation model. Haiku 4.5 is the fastest/cheapest tier and is well
// suited to Boardmarkie's templated, schema-constrained generation (the JSON
// schema does the structural heavy lifting). Switchable in Settings.
export const DEFAULT_MODEL: ModelId = "claude-haiku-4-5";

/** Back-compat alias and fallback default. */
export const MODEL: ModelId = DEFAULT_MODEL;

export const MODEL_OPTIONS: { id: ModelId; label: string; blurb: string }[] = [
  { id: "claude-haiku-4-5", label: "Fast", blurb: "Haiku 4.5 — quickest and cheapest; great for most lessons." },
  { id: "claude-sonnet-4-6", label: "Balanced", blurb: "Sonnet 4.6 — more depth, still much faster than Opus." },
  { id: "claude-opus-4-8", label: "Best", blurb: "Opus 4.8 — deepest and most nuanced; slower and pricier." },
];

// The `effort` parameter is supported on Opus 4.x and Sonnet 4.6 but NOT on
// Haiku 4.5 (sending it there returns a 400). Guard every request with this.
export function supportsEffort(model: string): boolean {
  return model.startsWith("claude-opus") || model === "claude-sonnet-4-6";
}

export const NO_KEY_MESSAGE =
  "Add your Anthropic API key in Settings to start generating. It's stored only in your browser.";
