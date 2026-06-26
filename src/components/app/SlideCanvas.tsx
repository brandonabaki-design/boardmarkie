"use client";

import { useEffect, useRef, useState } from "react";
import {
  Replace,
  Copy,
  Trash2,
  BringToFront,
  SendToBack,
  Bold,
  AArrowUp,
  AArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ExternalLink,
} from "lucide-react";
import type { CanvasElement, TextElement } from "@/lib/types";
import { clamp, INK, MUTED } from "@/lib/canvas";

const SELECT = "#0c8a78"; // brand-600

type Box = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: { id: Handle; x: number; y: number; cursor: string }[] = [
  { id: "nw", x: 0, y: 0, cursor: "nwse-resize" },
  { id: "n", x: 50, y: 0, cursor: "ns-resize" },
  { id: "ne", x: 100, y: 0, cursor: "nesw-resize" },
  { id: "e", x: 100, y: 50, cursor: "ew-resize" },
  { id: "se", x: 100, y: 100, cursor: "nwse-resize" },
  { id: "s", x: 50, y: 100, cursor: "ns-resize" },
  { id: "sw", x: 0, y: 100, cursor: "nesw-resize" },
  { id: "w", x: 0, y: 50, cursor: "ew-resize" },
];

const SHAPE_COLORS = ["#d2f6ec", "#0c8a78", "#ffe0b2", "#f6a609", "#dbeafe", "#38bdf8", "#fdd5cf", "#ff6f5e", "#e7e9ef", "#16181d"];
const TEXT_COLORS = ["#16181d", "#0c8a78", "#ff6f5e", "#f6a609", "#7c6cf0", "#ffffff"];

export function SlideCanvas({
  elements,
  background = "#ffffff",
  backgroundImage,
  ink = INK,
  muted = MUTED,
  displayFont = "var(--font-bricolage)",
  editable = false,
  interactive = false,
  selectedId = null,
  onSelect,
  onChange,
  onRequestSwap,
  className = "",
}: {
  elements: CanvasElement[];
  background?: string;
  backgroundImage?: string; // full-bleed subject background (from the background theme)
  ink?: string; // default text colour (from the deck theme)
  muted?: string; // secondary text colour (from the deck theme)
  displayFont?: string; // heading/title font family (from the deck theme)
  editable?: boolean;
  interactive?: boolean; // allow iframe playback (Present mode)
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (els: CanvasElement[]) => void;
  onRequestSwap?: (id: string) => void;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<{ id: string; box: Box } | null>(null);
  const liveRef = useRef<{ id: string; box: Box } | null>(null); // kept in sync inside the pointer handler
  const [editingId, setEditingId] = useState<string | null>(null);
  const gesture = useRef<{
    mode: "move" | "resize";
    handle?: Handle;
    id: string;
    sx: number;
    sy: number;
    rect: DOMRect;
    orig: Box;
  } | null>(null);

  const sorted = [...elements].sort((a, b) => a.z - b.z);
  const selected = editable ? elements.find((e) => e.id === selectedId) ?? null : null;

  const boxOf = (e: CanvasElement): Box =>
    live && live.id === e.id ? live.box : { x: e.x, y: e.y, w: e.w, h: e.h };

  const update = (id: string, patch: Partial<CanvasElement>) =>
    onChange?.(elements.map((e) => (e.id === id ? ({ ...e, ...patch } as CanvasElement) : e)));

  // ---- drag / resize gesture ----

  const onPointerMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dx = ((e.clientX - g.sx) / g.rect.width) * 100;
    const dy = ((e.clientY - g.sy) / g.rect.height) * 100;
    let { x, y, w, h } = g.orig;
    if (g.mode === "move") {
      x = clamp(g.orig.x + dx, 0, Math.max(0, 100 - g.orig.w));
      y = clamp(g.orig.y + dy, 0, Math.max(0, 100 - g.orig.h));
    } else {
      const H = g.handle!;
      if (H.includes("e")) w = clamp(g.orig.w + dx, 4, 100 - g.orig.x);
      if (H.includes("s")) h = clamp(g.orig.h + dy, 4, 100 - g.orig.y);
      if (H.includes("w")) {
        const nw = clamp(g.orig.w - dx, 4, g.orig.x + g.orig.w);
        x = g.orig.x + (g.orig.w - nw);
        w = nw;
      }
      if (H.includes("n")) {
        const nh = clamp(g.orig.h - dy, 4, g.orig.y + g.orig.h);
        y = g.orig.y + (g.orig.h - nh);
        h = nh;
      }
    }
    const box = { x, y, w, h };
    liveRef.current = { id: g.id, box };
    setLive({ id: g.id, box });
  };

  const endGesture = () => {
    const g = gesture.current;
    const l = liveRef.current;
    if (g && l) update(l.id, l.box);
    gesture.current = null;
    liveRef.current = null;
    setLive(null);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endGesture);
  };

  const startMove = (e: React.PointerEvent, el: CanvasElement) => {
    if (!editable || editingId === el.id) return;
    e.preventDefault();
    e.stopPropagation();
    if (editingId) setEditingId(null); // leaving a text box we were editing
    onSelect?.(el.id);
    const rect = stageRef.current!.getBoundingClientRect();
    gesture.current = { mode: "move", id: el.id, sx: e.clientX, sy: e.clientY, rect, orig: { x: el.x, y: el.y, w: el.w, h: el.h } };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endGesture);
  };

  const startResize = (e: React.PointerEvent, el: CanvasElement, handle: Handle) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(el.id);
    const rect = stageRef.current!.getBoundingClientRect();
    gesture.current = { mode: "resize", handle, id: el.id, sx: e.clientX, sy: e.clientY, rect, orig: { x: el.x, y: el.y, w: el.w, h: el.h } };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endGesture);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Delete / Escape when an element is selected (and not editing text).
  useEffect(() => {
    if (!editable) return;
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      if (!selectedId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement === document.body) {
        e.preventDefault();
        onChange?.(elements.filter((x) => x.id !== selectedId));
        onSelect?.(null);
      } else if (e.key === "Escape") {
        onSelect?.(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable, editingId, selectedId, elements, onChange, onSelect]);

  const stageStyle: React.CSSProperties = {
    background, // colour fallback / base; the image (if any) layers on top
    ...(backgroundImage
      ? {
          backgroundImage: `url("${backgroundImage}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }
      : {}),
    // Keep themed colours + background images when exporting to PDF / printing.
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
    containerType: "size",
    userSelect: live ? "none" : "auto",
  };

  return (
    <div
      ref={stageRef}
      style={stageStyle}
      onPointerDown={(e) => {
        if (editable && e.target === stageRef.current) {
          onSelect?.(null);
          setEditingId(null);
        }
      }}
      className={`relative isolate aspect-video w-full overflow-hidden ${className}`}
    >
      {sorted.map((el) => {
        const b = boxOf(el);
        const isSel = selected?.id === el.id;
        return (
          <div
            key={el.id}
            onPointerDown={(e) => startMove(e, el)}
            onDoubleClick={() => {
              if (editable && el.type === "text") {
                onSelect?.(el.id);
                setEditingId(el.id);
              }
            }}
            style={{
              position: "absolute",
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.w}%`,
              height: `${b.h}%`,
              zIndex: el.z,
              cursor: editable ? (editingId === el.id ? "text" : "move") : "default",
              outline: isSel ? `2px solid ${SELECT}` : "none",
              outlineOffset: "1px",
            }}
          >
            <ElementContent
              el={el}
              editing={editingId === el.id}
              editable={editable}
              interactive={interactive}
              ink={ink}
              muted={muted}
              displayFont={displayFont}
              onCommitText={(t) => {
                update(el.id, { text: t });
                setEditingId(null);
              }}
            />

            {isSel &&
              HANDLES.map((h) => (
                <span
                  key={h.id}
                  onPointerDown={(e) => startResize(e, el, h.id)}
                  style={{
                    position: "absolute",
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    transform: "translate(-50%, -50%)",
                    cursor: h.cursor,
                    width: 11,
                    height: 11,
                    borderRadius: 3,
                    background: "#fff",
                    border: `2px solid ${SELECT}`,
                    zIndex: 1000,
                  }}
                />
              ))}
          </div>
        );
      })}

      {selected && (
        <FloatingToolbar
          el={selected}
          box={boxOf(selected)}
          onSwap={() => onRequestSwap?.(selected.id)}
          onUpdate={(patch) => update(selected.id, patch)}
          onDuplicate={() => {
            const copy = { ...selected, id: `${selected.id}_c${Math.random().toString(36).slice(2, 6)}`, x: clamp(selected.x + 3, 0, 95), y: clamp(selected.y + 3, 0, 95), z: Math.max(...elements.map((e) => e.z), 0) + 1 } as CanvasElement;
            onChange?.([...elements, copy]);
            onSelect?.(copy.id);
          }}
          onForward={() => update(selected.id, { z: Math.max(...elements.map((e) => e.z), 0) + 1 })}
          onBack={() => update(selected.id, { z: Math.min(...elements.map((e) => e.z), 1) - 1 })}
          onDelete={() => {
            onChange?.(elements.filter((x) => x.id !== selected.id));
            onSelect?.(null);
          }}
        />
      )}
    </div>
  );
}

// ---- element rendering ----

function ElementContent({
  el,
  editing,
  editable,
  interactive,
  ink,
  muted,
  displayFont,
  onCommitText,
}: {
  el: CanvasElement;
  editing: boolean;
  editable: boolean;
  interactive: boolean;
  ink: string;
  muted: string;
  displayFont: string;
  onCommitText: (text: string) => void;
}) {
  if (el.type === "text") {
    return <TextBox el={el} editing={editing} onCommit={onCommitText} ink={ink} muted={muted} displayFont={displayFont} />;
  }
  if (el.type === "shape") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: el.fill,
          opacity: (el.opacity ?? 100) / 100,
          borderRadius: el.shape === "ellipse" ? "50%" : el.radius != null ? `${el.radius}cqh` : "8px",
          border: el.stroke ? `${el.strokeWidth ?? 0.4}cqh solid ${el.stroke}` : undefined,
          boxSizing: "border-box",
        }}
      />
    );
  }
  if (el.type === "youtube") {
    if (interactive) {
      return (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${el.videoId}`}
          title={el.title || "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: "none", borderRadius: 8 }}
        />
      );
    }
    return (
      <div style={{ width: "100%", height: "100%", position: "relative", borderRadius: 8, overflow: "hidden", background: "#000" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://img.youtube.com/vi/${el.videoId}/hqdefault.jpg`} alt={el.title || "YouTube"} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
        <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <span style={{ background: "#ff0000", color: "#fff", borderRadius: 999, padding: "6cqh 9cqh", fontSize: "4cqh", fontWeight: 700 }}>▶ YouTube</span>
        </span>
      </div>
    );
  }
  // image
  if (el.svg) {
    return (
      <div
        role="img"
        aria-label={el.alt || "Diagram"}
        style={{ width: "100%", height: "100%", background: "#fff", borderRadius: `${el.radius ?? 4}%`, overflow: "hidden", opacity: (el.opacity ?? 100) / 100 }}
        className="[&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: el.svg }}
      />
    );
  }
  if (el.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={el.src}
        alt={el.alt || ""}
        draggable={false}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          // Hide a dead/blocked image URL rather than showing a broken icon.
          e.currentTarget.style.display = "none";
        }}
        // "contain" shows the whole image (never cropped/cut); boxes are sized ~16:9 to match.
        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: `${el.radius ?? 4}%`, opacity: (el.opacity ?? 100) / 100 }}
      />
    );
  }
  // No image yet: a subtle drop target in the editor; nothing when presenting/exporting.
  if (!editable) return null;
  return (
    <div
      style={{ width: "100%", height: "100%", borderRadius: 8 }}
      className="grid place-items-center border-2 border-dashed border-line bg-paper/60 text-muted"
    >
      <span style={{ fontSize: "4cqh" }}>Image</span>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Render light markdown (**bold**, *italic*) to safe inline HTML for display.
 *  Uses a toggling parser rather than pair-matching regexes so that stray or
 *  unbalanced markers (e.g. from an AI/inline edit) never render as literal
 *  "**"/"*" — any tag left open is simply closed at the end. */
export function inlineHtml(text: string): string {
  const s = escapeHtml(text);
  let out = "";
  let bold = false;
  let italic = false;
  for (let i = 0; i < s.length; ) {
    if (s[i] === "*" && s[i + 1] === "*") {
      out += bold ? "</strong>" : "<strong>";
      bold = !bold;
      i += 2;
    } else if (s[i] === "*") {
      out += italic ? "</em>" : "<em>";
      italic = !italic;
      i += 1;
    } else {
      out += s[i];
      i += 1;
    }
  }
  if (italic) out += "</em>";
  if (bold) out += "</strong>";
  return out;
}

function TextBox({
  el,
  editing,
  onCommit,
  ink = INK,
  muted = MUTED,
  displayFont = "var(--font-bricolage)",
}: {
  el: TextElement;
  editing: boolean;
  onCommit: (t: string) => void;
  ink?: string;
  muted?: string;
  displayFont?: string;
}) {
  // Map the canvas default ink/muted to the deck theme; explicit user colours stay.
  const color = !el.color || el.color === INK ? ink : el.color === MUTED ? muted : el.color;
  const ref = useRef<HTMLDivElement>(null);

  // Editing → show raw text (with markdown markers); not editing → rendered bold/italic.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (editing) {
      if (node.textContent !== el.text) node.textContent = el.text;
    } else {
      node.innerHTML = inlineHtml(el.text);
    }
  }, [editing, el.text]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      // place caret at end
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  return (
    <div
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      onPointerDown={(e) => {
        if (editing) e.stopPropagation();
      }}
      onBlur={(e) => onCommit((e.currentTarget.textContent ?? "").replace(/ /g, " "))}
      className={el.font === "display" ? "font-display" : ""}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        outline: "none",
        padding: "1.2cqh 1.4cqh",
        fontSize: `${el.fontSize}cqh`,
        lineHeight: 1.2,
        fontWeight: el.bold ? 800 : 500,
        fontStyle: el.italic ? "italic" : "normal",
        textAlign: el.align ?? "left",
        color,
        fontFamily: el.font === "display" ? displayFont : undefined,
        letterSpacing: el.font === "display" ? "-0.01em" : undefined,
      }}
    />
  );
}

// ---- floating per-element toolbar ----

function FloatingToolbar({
  el,
  box,
  onSwap,
  onUpdate,
  onDuplicate,
  onForward,
  onBack,
  onDelete,
}: {
  el: CanvasElement;
  box: Box;
  onSwap: () => void;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onDuplicate: () => void;
  onForward: () => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const above = box.y > 14;
  // EduSim QR images get an "open link" action instead of "swap" — so a teacher
  // can't accidentally replace the scannable code with an arbitrary picture.
  const eduSimUrl = el.type === "image" ? el.eduSimUrl : undefined;
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: `${clamp(box.x + box.w / 2, 12, 88)}%`,
        top: above ? `${box.y}%` : `${box.y + box.h}%`,
        transform: above ? "translate(-50%, calc(-100% - 8px))" : "translate(-50%, 8px)",
        zIndex: 1001,
      }}
      className="flex items-center gap-0.5 rounded-xl border border-line bg-white px-1 py-1 card-shadow"
    >
      {el.type === "image" &&
        (eduSimUrl ? (
          <TBtn title="Open EduSim link" onClick={() => window.open(eduSimUrl, "_blank", "noopener,noreferrer")}>
            <ExternalLink size={15} />
          </TBtn>
        ) : (
          <TBtn title="Swap image" onClick={onSwap}>
            <Replace size={15} />
          </TBtn>
        ))}

      {el.type === "text" && (
        <>
          <TBtn title="Bold" active={el.bold} onClick={() => onUpdate({ bold: !el.bold })}><Bold size={15} /></TBtn>
          <TBtn title="Smaller" onClick={() => onUpdate({ fontSize: Math.max(1.5, +(el.fontSize - 0.5).toFixed(1)) })}><AArrowDown size={16} /></TBtn>
          <TBtn title="Bigger" onClick={() => onUpdate({ fontSize: Math.min(20, +(el.fontSize + 0.5).toFixed(1)) })}><AArrowUp size={16} /></TBtn>
          <TBtn
            title="Align"
            onClick={() => onUpdate({ align: el.align === "left" ? "center" : el.align === "center" ? "right" : "left" })}
          >
            {el.align === "center" ? <AlignCenter size={15} /> : el.align === "right" ? <AlignRight size={15} /> : <AlignLeft size={15} />}
          </TBtn>
          <Swatches colors={TEXT_COLORS} value={el.color} onPick={(c) => onUpdate({ color: c })} />
          <Divider />
        </>
      )}

      {el.type === "shape" && (
        <>
          <TBtn title="Rectangle" active={el.shape === "rect"} onClick={() => onUpdate({ shape: "rect" })}><span className="block h-3.5 w-3.5 rounded-[3px] border-2 border-current" /></TBtn>
          <TBtn title="Ellipse" active={el.shape === "ellipse"} onClick={() => onUpdate({ shape: "ellipse" })}><span className="block h-3.5 w-3.5 rounded-full border-2 border-current" /></TBtn>
          <Swatches colors={SHAPE_COLORS} value={el.fill} onPick={(c) => onUpdate({ fill: c })} />
          <Divider />
        </>
      )}

      <TBtn title="Duplicate" onClick={onDuplicate}><Copy size={15} /></TBtn>
      <TBtn title="Bring forward" onClick={onForward}><BringToFront size={15} /></TBtn>
      <TBtn title="Send back" onClick={onBack}><SendToBack size={15} /></TBtn>
      <TBtn title="Delete" onClick={onDelete} danger><Trash2 size={15} /></TBtn>
    </div>
  );
}

function TBtn({
  title,
  onClick,
  children,
  active,
  danger,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
        danger ? "text-coral hover:bg-coral/10" : active ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-paper"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-line" />;
}

function Swatches({ colors, value, onPick }: { colors: string[]; value?: string; onPick: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        title="Colour"
        aria-label="Colour"
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-paper"
      >
        <span className="h-4 w-4 rounded-full border border-line" style={{ background: value || "#16181d" }} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-[1002] mt-1 flex -translate-x-1/2 flex-wrap gap-1 rounded-xl border border-line bg-white p-2 card-shadow" style={{ width: 140 }}>
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onPick(c);
                setOpen(false);
              }}
              className="h-5 w-5 rounded-full border border-line"
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
