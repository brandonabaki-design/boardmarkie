"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessibility helper for modal dialogs: when `open`, moves focus into the
 * dialog (an element marked `data-autofocus`, else the first focusable), traps
 * Tab within it, closes on Escape, and restores focus to the previously focused
 * element on close. Returns a ref to attach to the dialog container.
 *
 * Only re-runs when `open` changes (onClose is read via a ref) so it never
 * steals focus on unrelated re-renders.
 */
export function useDialog<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      node
        ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0)
        : [];

    (node?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0] ?? node ?? undefined)?.focus?.();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && node) {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === node)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return ref;
}
