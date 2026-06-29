"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles, Settings as SettingsIcon, Eraser } from "lucide-react";
import { chatComplete, openAiReady, CHAT_MODEL, type ChatMessage, type ChatTool } from "@/lib/openai";
import { askBoardmarkieSystemPrompt, type AskContext, type AskEdit } from "@/lib/prompts";
import { Spinner } from "./ui";

type EditKind = "lesson" | "worksheet";

interface UiMsg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS: Record<"none" | EditKind, string[]> = {
  none: [
    "Explain a tricky topic simply",
    "Give me a 5-minute starter activity",
    "Write 3 exit-ticket questions",
    "Ideas to differentiate for lower attainers",
  ],
  lesson: [
    "Make slide 1 more engaging",
    "Add a quick recap slide at the end",
    "Simplify the whole lesson",
    "Move the video slide to the front",
  ],
  worksheet: [
    "Add 3 harder questions",
    "Make question 2 multiple choice",
    "Add a model answer to every question",
    "Make it easier for lower attainers",
  ],
};

// Tool GPT-4o can call to change the open presentation. Executed by the existing
// Claude lesson-edit pipeline (reliable, schema-constrained) via `onEdit`.
const EDIT_TOOL: ChatTool = {
  type: "function",
  function: {
    name: "edit_presentation",
    description:
      "Edit the teacher's currently open lesson/presentation. Use only for actual changes to the slides or their content (change, add, remove, reorder, rewrite, simplify, expand, retitle). Do not use for questions or advice.",
    parameters: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description:
            "A precise, self-contained directive describing exactly what to change, e.g. 'Change the title of slide 1 to ...', 'Add a worked-example slide after slide 3 about ...', 'Remove slide 5'.",
        },
        scope: {
          type: "string",
          enum: ["whole_lesson", "slide"],
          description: "Whether the change targets one slide or the whole lesson.",
        },
        slideNumber: {
          type: "integer",
          description: "The 1-based slide number to change when scope is 'slide'.",
        },
      },
      required: ["instruction", "scope"],
      additionalProperties: false,
    },
  },
};

// Structural slide ops are applied instantly in the app — no model call at all.
const ARRANGE_TOOL: ChatTool = {
  type: "function",
  function: {
    name: "arrange_slides",
    description:
      "Instantly reorder, delete, or duplicate a slide — purely structural, no rewriting. Prefer this over edit_presentation when the teacher only wants to change slide order or count.",
    parameters: {
      type: "object",
      properties: {
        op: { type: "string", enum: ["delete", "duplicate", "move"], description: "The structural operation." },
        slideNumber: { type: "integer", description: "The 1-based slide to act on." },
        toPosition: {
          type: "integer",
          description: "The 1-based destination position (required for 'move').",
        },
      },
      required: ["op", "slideNumber"],
      additionalProperties: false,
    },
  },
};

// Worksheet content edits, executed by the Claude worksheet-edit pipeline.
const EDIT_WORKSHEET_TOOL: ChatTool = {
  type: "function",
  function: {
    name: "edit_worksheet",
    description:
      "Edit the teacher's open worksheet (change, add, remove, reorder, or re-mark questions/sections, adjust difficulty, rewrite content). Use only for actual changes, not questions or advice.",
    parameters: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description: "A precise, self-contained directive describing exactly what to change.",
        },
      },
      required: ["instruction"],
      additionalProperties: false,
    },
  },
};

export function AskBoardmarkie({
  context,
  editKind,
  slides,
  onEdit,
  onArrange,
  onOpenSettings,
  open: openProp,
  onOpenChange,
  showLauncher = true,
}: {
  context?: AskContext;
  editKind?: EditKind;
  slides?: { number: number; title: string }[];
  onEdit?: (instruction: string, slideNumber?: number) => Promise<string>;
  onArrange?: (op: string, slideNumber: number, toPosition?: number) => Promise<string>;
  onOpenSettings: () => void;
  // Optionally control open state externally (e.g. from a button in the deck bar).
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showLauncher?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (openProp === undefined) setInternalOpen(v);
  };
  const [msgs, setMsgs] = useState<UiMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"think" | "edit">("think");
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const ready = openAiReady();
  const canEdit = !!editKind && !!onEdit;

  const tools = (): ChatTool[] | undefined => {
    if (!canEdit) return undefined;
    if (editKind === "lesson") return [EDIT_TOOL, ARRANGE_TOOL];
    if (editKind === "worksheet") return [EDIT_WORKSHEET_TOOL];
    return undefined;
  };

  const editDescriptor = (): AskEdit | undefined => {
    if (!canEdit) return undefined;
    if (editKind === "lesson") return { kind: "lesson", slides: slides ?? [] };
    if (editKind === "worksheet") return { kind: "worksheet" };
    return undefined;
  };

  const push = (content: string) => setMsgs((m) => [...m, { role: "assistant", content }]);
  const parseArgs = <T,>(raw: string): T => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return {} as T;
    }
  };

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setErr(null);
    const next: UiMsg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    setPhase("think");
    try {
      const payload: ChatMessage[] = [
        { role: "system", content: askBoardmarkieSystemPrompt(context, editDescriptor()) },
        ...next.map((m) => ({ role: m.role, content: m.content })),
      ];
      const result = await chatComplete(payload, tools());
      const call = result.toolCalls[0];

      if (call && result.content) push(result.content);

      if (call?.name === "arrange_slides" && onArrange) {
        const a = parseArgs<{ op?: string; slideNumber?: number; toPosition?: number }>(call.arguments);
        if (!a.op || !a.slideNumber) push("I couldn't work out that change — try naming the slide number.");
        else {
          setPhase("edit");
          push(await onArrange(a.op, a.slideNumber, a.toPosition));
        }
      } else if ((call?.name === "edit_presentation" || call?.name === "edit_worksheet") && onEdit) {
        const a = parseArgs<{ instruction?: string; scope?: string; slideNumber?: number }>(call.arguments);
        if (!a.instruction) push("I couldn't work out that change — try rephrasing it.");
        else {
          setPhase("edit");
          const slideNumber = a.scope === "slide" ? a.slideNumber : undefined;
          push(await onEdit(a.instruction, slideNumber));
        }
      } else {
        push(result.content);
      }
    } catch (e) {
      const ex = e as Error & { status?: number };
      setErr(ex.message);
      if (ex.status === 401) onOpenSettings();
    } finally {
      setBusy(false);
      setPhase("think");
    }
  };

  return (
    <>
      {/* launcher (hidden when an external trigger drives it, e.g. the deck bar) */}
      {showLauncher && (
        <button
          onClick={() => setOpen(!open)}
          aria-label="Ask Boardmarkie"
          title="Ask Boardmarkie"
          className="no-print fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-700 active:scale-95"
        >
          {open ? <X size={22} /> : <MessageCircle size={22} />}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Ask Boardmarkie"
          className="no-print fixed bottom-24 right-5 z-40 flex h-[34rem] max-h-[75vh] w-[23rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white card-shadow"
        >
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
                  {SUGGESTIONS[editKind ?? "none"].map((s) => (
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
                  <Spinner className="h-3.5 w-3.5 text-brand-600" />{" "}
                  {phase === "edit" ? "Applying your change…" : "Thinking…"}
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
