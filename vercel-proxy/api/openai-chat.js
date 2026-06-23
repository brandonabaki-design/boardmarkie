// Vercel serverless function — OpenAI chat proxy for Boardmarkie's
// "Ask Boardmarkie" assistant (GPT-4o).
//
// OpenAI's API does not send CORS headers, so the browser can't call it
// directly (unlike Anthropic); requests go through this proxy instead.
//
// Key: bring-your-own (sent per request) takes precedence; falls back to an
// OPENAI_API_KEY env var on the Vercel project (a shared key).
//
// Debug: POST {messages:[{role,content}], apiKey?} -> { content }

export const config = { maxDuration: 60 };

const ALLOW_ORIGIN = "*";
const DEFAULT_MODEL = "gpt-4o";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  // GET = capability check. If you see supports:["tools"] the tool-calling build
  // (needed for chat-to-slides editing) is live. If you still see "Use POST."
  // the proxy hasn't been redeployed with the latest code.
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, endpoint: "openai-chat", supports: ["tools", "response_format"] });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }
  payload = payload || {};

  const messages = Array.isArray(payload.messages) ? payload.messages : null;
  if (!messages || !messages.length) return res.status(400).json({ error: "Missing 'messages'." });

  const apiKey = String(payload.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return res
      .status(401)
      .json({ error: "No OpenAI API key. Add one in Settings, or set OPENAI_API_KEY on the project." });
  }

  const model =
    typeof payload.model === "string" && payload.model.trim() ? payload.model.trim() : DEFAULT_MODEL;
  const maxTokens = Number.isFinite(payload.maxTokens)
    ? Math.min(2000, Math.max(1, payload.maxTokens))
    : 900;

  // Optional passthrough so the app can use function calling / JSON mode without
  // ever needing the proxy redeployed again.
  const tools = Array.isArray(payload.tools) ? payload.tools : undefined;
  const toolChoice = payload.tool_choice;
  const responseFormat = payload.response_format;

  const body = { model, messages, max_tokens: maxTokens, temperature: 0.7 };
  if (tools) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }
  if (responseFormat) body.response_format = responseFormat;

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
  } catch {
    return res.status(502).json({ error: "Could not reach OpenAI." });
  }

  if (!upstream.ok) {
    const detail = await upstream.text();
    return res.status(upstream.status).json({
      error: `OpenAI error (${upstream.status}).`,
      detail: detail.slice(0, 500),
    });
  }

  const data = await upstream.json();
  const msg = data && data.choices && data.choices[0] && data.choices[0].message;
  if (!msg) return res.status(502).json({ error: "OpenAI returned no message." });
  return res.status(200).json({ content: msg.content || "", tool_calls: msg.tool_calls || null });
}
