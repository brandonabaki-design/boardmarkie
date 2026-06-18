// Shared Claude config. The app is a static, bring-your-own-key client:
// generation happens directly in the browser with the user's key (see
// src/lib/client.ts), so there is no server component here.

export const MODEL = "claude-opus-4-8";

export const NO_KEY_MESSAGE =
  "Add your Anthropic API key in Settings to start generating. It's stored only in your browser.";
