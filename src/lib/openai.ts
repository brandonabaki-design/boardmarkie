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

// Turn a non-OK proxy response into a useful message. The proxy returns
// { error, detail } where `detail` is OpenAI's raw error body; surface the
// specific reason (e.g. "Incorrect API key provided", "insufficient_quota").
async function proxyErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const b = (await res.json()) as { error?: string; detail?: string };
    let msg = b.error || fallback;
    if (b.detail) {
      try {
        const d = JSON.parse(b.detail) as { error?: { message?: string } };
        if (d.error?.message) msg = `${msg} — ${d.error.message}`;
      } catch {
        /* detail wasn't JSON; ignore */
      }
    }
    return msg;
  } catch {
    return fallback;
  }
}

/** Is OpenAI usable right now (key + proxy both configured)? */
export function openAiReady(): boolean {
  return !!getOpenAIKey() && !!getImageConfig().proxyUrl;
}

// Read the OpenAI key and fail fast with a clear message on the common mistake
// of pasting an Anthropic key (sk-ant-…) into the OpenAI field — that key would
// otherwise be sent to OpenAI and bounce back as a confusing 401.
function requireOpenAIKey(): string {
  const key = getOpenAIKey();
  if (!key) throw err(NO_OPENAI_SETUP, 401);
  if (key.startsWith("sk-ant-")) {
    throw err(
      "That's an Anthropic key (sk-ant-…) in the OpenAI tab. Paste your OpenAI key (it starts with sk-proj-… or sk-…) in Settings → OpenAI, and keep the sk-ant-… key in the Claude tab.",
      401,
    );
  }
  return key;
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

export interface ChatTool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // raw JSON string of the call's arguments
}

export interface ChatResult {
  content: string;
  toolCalls: ToolCall[];
}

/**
 * Ask Boardmarkie (GPT-4o). Returns the assistant's reply and any tool calls it
 * decided to make (e.g. to edit the open presentation).
 */
export async function chatComplete(messages: ChatMessage[], tools?: ChatTool[]): Promise<ChatResult> {
  const apiKey = requireOpenAIKey();

  let res: Response;
  try {
    res = await fetch(endpoint("openai-chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        model: CHAT_MODEL,
        messages,
        ...(tools && tools.length ? { tools } : {}),
      }),
    });
  } catch {
    throw err("Couldn't reach the proxy. Check the URL in Settings.");
  }

  if (!res.ok) {
    throw err(await proxyErrorMessage(res, `Ask Boardmarkie failed (${res.status}).`), res.status);
  }

  const data = (await res.json()) as {
    content?: string;
    tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> | null;
  };
  const toolCalls: ToolCall[] = (data.tool_calls ?? []).map((t) => ({
    id: t.id ?? "",
    name: t.function?.name ?? "",
    arguments: t.function?.arguments ?? "{}",
  }));
  if (!data.content && !toolCalls.length) throw err("No response from the assistant.");
  return { content: data.content ?? "", toolCalls };
}

type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

/** Generate an image with DALL·E 3 via the proxy. Resolves to a `data:` URL. */
export async function generateOpenAIImage(
  prompt: string,
  aspectRatio: AspectRatio = "16:9",
): Promise<string> {
  const apiKey = requireOpenAIKey();

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
    throw err(await proxyErrorMessage(res, `Image generation failed (${res.status}).`), res.status);
  }

  const data = (await res.json()) as { image?: string };
  if (!data.image) throw err("The image service returned no image.");
  return data.image;
}
