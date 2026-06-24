"use client";

// Client-side image generation. Boardmarkie is a static, bring-your-own-key
// app, but image providers can't be called directly from the browser (no CORS),
// so requests go through a small Cloudflare Worker proxy (see worker/). The
// proxy URL and the teacher's Gemini key live in localStorage (Settings).

import { getImageConfig, getImageStyle, getImageQuality, getImageProvider, getOpenAIKey } from "./storage";
import { generateOpenAIImage } from "./openai";
import { isHostedMode, getBackendBase, authHeader } from "./backend";

// AI illustration quality → Imagen tier. Ultra has the best prompt alignment.
const QUALITY_MODEL: Record<string, string> = {
  fast: "imagen-4.0-fast-generate-001",
  standard: "imagen-4.0-generate-001",
  ultra: "imagen-4.0-ultra-generate-001",
};

/**
 * Wrap a plain subject into a full illustration prompt in the user's chosen
 * style. Line art (default) renders cleanly, compresses small (fast to load),
 * and prints well; both styles forbid in-image text, which raster models garble.
 */
export function illustrationPrompt(subject: string): string {
  const base = subject.trim();
  if (getImageStyle() === "color") {
    return `${base}. Bright, friendly, age-appropriate educational illustration; clean flat style; no words or text in the image.`;
  }
  return `${base}. Black-and-white line art in a clean coloring-book style: bold, even black outlines on a plain white background, no shading, no grey fills, no colour. Simple, friendly and age-appropriate. Absolutely no words, letters, numbers, or text anywhere in the image.`;
}

function err(message: string, status?: number): Error & { status?: number } {
  const e = new Error(message) as Error & { status?: number };
  if (status) e.status = status;
  return e;
}

export const NO_IMAGE_PROXY_MESSAGE =
  "Add your image proxy URL (and a Gemini key) in Settings to generate images.";

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface ImageOptions {
  aspectRatio?: AspectRatio;
}

/** Can we generate images with the current settings? Imagen needs the proxy;
 *  OpenAI (gpt-image-1) needs the proxy plus an OpenAI key. */
export function canGenerateImages(): boolean {
  if (isHostedMode()) return true; // server holds the keys
  if (!getImageConfig().proxyUrl) return false;
  if (getImageProvider() === "dalle") return !!getOpenAIKey();
  return true;
}

/**
 * Generate an illustration from a text prompt. Routes to OpenAI's gpt-image-1 or
 * Google's Imagen (via the proxy) per the user's chosen engine. Resolves to a
 * `data:` URL.
 */
export async function generateImage(prompt: string, opts: ImageOptions = {}): Promise<string> {
  if (getImageProvider() === "dalle") {
    return generateOpenAIImage(prompt, opts.aspectRatio ?? "16:9");
  }

  const hosted = isHostedMode();
  const { proxyUrl, apiKey } = getImageConfig();
  const url = hosted ? `${getBackendBase()}/image` : proxyUrl;
  if (!url) throw err(NO_IMAGE_PROXY_MESSAGE, 401);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (hosted) Object.assign(headers, await authHeader());

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        apiKey: hosted ? undefined : apiKey || undefined,
        model: QUALITY_MODEL[getImageQuality()],
        aspectRatio: opts.aspectRatio ?? "16:9",
      }),
    });
  } catch {
    throw err("Couldn't reach the image proxy. Check the URL in Settings.");
  }

  if (!res.ok) {
    let message = `Image generation failed (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* keep the generic message */
    }
    throw err(message, res.status);
  }

  const data = (await res.json()) as { image?: string };
  if (!data.image) throw err("The image service returned no image.");
  return data.image;
}
