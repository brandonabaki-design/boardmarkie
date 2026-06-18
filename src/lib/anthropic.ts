import Anthropic from "@anthropic-ai/sdk";

// Default to Anthropic's most capable model for high-quality lesson content.
export const MODEL = "claude-opus-4-8";

/**
 * Build an Anthropic client. Prefers a per-request user-supplied key (from the
 * in-app Settings dialog), falling back to the server's ANTHROPIC_API_KEY.
 * The SDK automatically honours ANTHROPIC_BASE_URL from the environment.
 * Returns null when no key is available anywhere.
 */
export function getClient(userKey?: string | null): Anthropic | null {
  const apiKey = (userKey && userKey.trim()) || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export const NO_KEY_MESSAGE =
  "No Anthropic API key configured. Add your key via Settings (saved in your browser) or set ANTHROPIC_API_KEY on the server.";
