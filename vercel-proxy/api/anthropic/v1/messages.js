// Vercel serverless function — authenticated reverse proxy to Anthropic's
// Messages API.
//
// The browser Anthropic SDK points its baseURL at …/api/anthropic, so it calls
// …/api/anthropic/v1/messages — exactly this file (a fixed path, not a catch-all,
// so routing is unambiguous). We verify the user's Google sign-in token, then
// forward to api.anthropic.com with the server-held ANTHROPIC_API_KEY and stream
// the response straight back (so the SDK's streaming + structured outputs work).
//
// Env on the Vercel project:
//   ANTHROPIC_API_KEY      the shared Claude key (REQUIRED)
//   FIREBASE_PROJECT_ID    enables sign-in checks (see _auth.js)
//   ALLOWED_EMAIL_DOMAINS  optional domain allow-list

import { setCors, verifyAuth } from "../../_auth.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, endpoint: "anthropic", auth: true });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  const auth = await verifyAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return res.status(500).json({ error: "Server missing ANTHROPIC_API_KEY." });

  const headers = {
    "x-api-key": key,
    "anthropic-version": req.headers["anthropic-version"] || "2023-06-01",
    "content-type": "application/json",
  };
  if (req.headers["anthropic-beta"]) headers["anthropic-beta"] = req.headers["anthropic-beta"];

  const body =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body == null ? {} : req.body);

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body,
    });
  } catch {
    return res.status(502).json({ error: "Could not reach Anthropic." });
  }

  res.status(upstream.status);
  const ct = upstream.headers.get("content-type");
  if (ct) res.setHeader("Content-Type", ct);

  if (!upstream.body) {
    return res.end(await upstream.text());
  }
  // Pipe the (possibly SSE) response straight back.
  try {
    const reader = upstream.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch {
    try {
      res.end();
    } catch {
      /* connection already closed */
    }
  }
}
