"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles, Settings as SettingsIcon, Eraser } from "lucide-react";
import { chatComplete, openAiReady, CHAT_MODEL, type ChatMessage } from "@/lib/openai";
import { askBoardmarkieSystemPrompt, type AskContext } from "@/lib/prompts";
import { Spinner } from "./ui";

interface UiMsg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Explain this topic in simple terms",
  "Give me a 5-minute starter activity",
  "Write 3 exit-ticket questions",
  "How can I differentiate this for lower attainers?",
];

export function AskBoardmarkie({
  context,
  onOpenSettings,
}: {
  context?: AskContext;
  onOpenSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<UiMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, open]);

  const ready = openAiReady();

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setErr(null);
    const next: UiMsg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const payload: ChatMessage[] = [
        { role: "system", content: askBoardmarkieSystemPrompt(context) },
        ...next.map((m) => ({ role: m.role, content: m.content })),
      ];
      const reply = await chatComplete(payload);
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      const ex = e as Error & { status?: number };
      setErr(ex.message);
      if (ex.status === 401) onOpenSettings();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Ask Boardmarkie"
        title="Ask Boardmarkie"
        className="no-print fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-700 active:scale-95"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="no-print fixed bottom-24 right-5 z-40 flex h-[34rem] max-h-[75vh] w-[23rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white card-shadow">
          {/* header */}
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-ink">
                <Sparkles size={16} className="text-brand-600" /> Ask Boardmarkie
              </h2>
              <p className="text-[11px] text-muted">Teaching assistant · {CHAT_MODEL}</p>
            </div>
            {msgs.length > 0 && (
              <button
                onClick={() => {
                  setMsgs([]);
                  setErr(null);
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-paper hover:text-ink"
                title="Clear chat"
              >
                <Eraser size={13} /> Clear
              </button>
            )}
          </div>

          {/* body */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto px-4 py-4">
            {!ready ? (
              <div className="rounded-xl border border-line bg-paper p-4 text-sm text-ink">
                <p className="font-semibold">Set up Ask Boardmarkie</p>
                <p className="mt-1 text-xs text-muted">
                  Add your OpenAI API key and image proxy URL in Settings to chat with GPT-4o.
                </p>
                <button
                  onClick={onOpenSettings}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  <SettingsIcon size={13} /> Open Settings
                </button>
              </div>
            ) : msgs.length === 0 ? (
              <div>
                <p className="text-sm text-muted">
                  Hi! I&apos;m your teaching assistant. Ask me anything — planning, explanations, activities,
                  rubrics, differentiation…
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs font-medium text-ink transition-colors hover:border-brand-300 hover:bg-paper"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                      m.role === "user"
                        ? "rounded-br-md bg-brand-600 text-white"
                        : "rounded-bl-md bg-paper text-ink"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-paper px-3.5 py-2 text-sm text-muted">
                  <Spinner className="h-3.5 w-3.5 text-brand-600" /> Thinking…
                </div>
              </div>
            )}

            {err && <p className="text-xs text-coral">{err}</p>}
          </div>

          {/* composer */}
          <div className="shrink-0 border-t border-line p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                rows={1}
                placeholder={ready ? "Ask a question…" : "Add your OpenAI key in Settings"}
                disabled={!ready || busy}
                className="max-h-28 flex-1 resize-none rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
              />
              <button
                onClick={() => ask(input)}
                disabled={!ready || busy || !input.trim()}
                aria-label="Send"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
