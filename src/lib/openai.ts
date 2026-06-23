"use client";

// OpenAI-powered features: the "Ask Boardmarkie" assistant (GPT-4o) and DALL·E 3
// image generation. OpenAI's API does not send CORS headers, so — unlike the
// Anthropic flow — these can't run straight from the browser; they go through
// the same small Vercel proxy used for images. The proxy URL in Settings
// (…/api/image) is reused for …/api/openai-chat and …/api/openai-image. Your
// OpenAI key is bring-your-own: stored in this browser and sent per request to
// your own proxy.

import { getImageConfig, getOpenAIKey } from "./storage";

export const CHAT_MODEL = "gpt-4o";

export const NO_OPENAI_SETUP =
  "Add your OpenAI key in Settings (and your image proxy URL) to use Ask Boardmarkie and DALL·E 3.";

function err(message: string, status?: number): Error & { status?: number } {
  const e = new Error(message) as Error & { status?: number };
  if (status) e.status = status;
  return e;
}

/** Is OpenAI usable right now (key + proxy both configured)? */
export function openAiReady(): boolean {
  return !!getOpenAIKey() && !!getImageConfig().proxyUrl;
}

function endpoint(name: "openai-chat" | "openai-image"): string {
  const { proxyUrl } = getImageConfig();
  if (!proxyUrl) throw err(NO_OPENAI_SETUP, 401);
  return proxyUrl.replace(/\/image\/?$/, `/${name}`);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Ask Boardmarkie (GPT-4o). Returns the assistant's reply text. */
export async function chatComplete(messages: ChatMessage[]): Promise<string> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw err(NO_OPENAI_SETUP, 401);

  let res: Response;
  try {
    res = await fetch(endpoint("openai-chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, model: CHAT_MODEL, messages }),
    });
  } catch {
    throw err("Couldn't reach the proxy. Check the URL in Settings.");
  }

  if (!res.ok) {
    let message = `Ask Boardmarkie failed (${res.status}).`;
    try {
      const b = (await res.json()) as { error?: string };
      if (b?.error) message = b.error;
    } catch {
      /* keep the generic message */
    }
    throw err(message, res.status);
  }

  const data = (await res.json()) as { content?: string };
  if (!data.content) throw err("No response from the assistant.");
  return data.content;
}

type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

/** Generate an image with DALL·E 3 via the proxy. Resolves to a `data:` URL. */
export async function generateOpenAIImage(
  prompt: string,
  aspectRatio: AspectRatio = "16:9",
): Promise<string> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw err(NO_OPENAI_SETUP, 401);

  // DALL·E 3 only supports these three sizes.
  const size =
    aspectRatio === "9:16" || aspectRatio === "3:4"
      ? "1024x1792"
      : aspectRatio === "1:1"
        ? "1024x1024"
        : "1792x1024";

  let res: Response;
  try {
    res = await fetch(endpoint("openai-image"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, prompt, size }),
    });
  } catch {
    throw err("Couldn't reach the image proxy. Check the URL in Settings.");
  }

  if (!res.ok) {
    let message = `Image generation failed (${res.status}).`;
    try {
      const b = (await res.json()) as { error?: string };
      if (b?.error) message = b.error;
    } catch {
      /* keep the generic message */
    }
    throw err(message, res.status);
  }

  const data = (await res.json()) as { image?: string };
  if (!data.image) throw err("The image service returned no image.");
  return data.image;
}
