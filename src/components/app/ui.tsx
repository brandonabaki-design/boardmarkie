"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const baseInput =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} resize-none ${props.className ?? ""}`} />;
}

export function Select({
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`${baseInput} cursor-pointer appearance-none pr-9 ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-line bg-paper p-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              active
                ? "bg-white text-brand-700 card-shadow"
                : "text-muted hover:text-ink"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand-600" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/**
 * Click-to-edit text. Uncontrolled contentEditable (so the caret never jumps),
 * synced from `value` via effect and committed on blur.
 */
export function Editable({
  value,
  onCommit,
  className = "",
  multiline = true,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== value) el.textContent = value;
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder}
      data-placeholder={placeholder}
      onBlur={(e) => {
        const next = (e.currentTarget.textContent ?? "").replace(/ /g, " ").trim();
        if (next !== value.trim()) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={`cursor-text whitespace-pre-wrap rounded-md outline-none transition-colors hover:bg-paper/70 focus:bg-brand-50/60 focus:ring-1 focus:ring-brand-200 empty:before:text-muted/50 empty:before:content-[attr(data-placeholder)] ${className}`}
    />
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin-slow rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}
