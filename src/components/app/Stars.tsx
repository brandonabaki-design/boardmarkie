"use client";

// Star rating. Read-only display by default; pass onRate to make it interactive.
export function Stars({
  value = 0,
  count,
  onRate,
  size = 18,
}: {
  value?: number;
  count?: number;
  onRate?: (n: number) => void;
  size?: number;
}) {
  const rounded = Math.round(value);
  const interactive = typeof onRate === "function";

  return (
    <span className="inline-flex items-center gap-0.5" style={{ fontSize: size, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= rounded;
        const cls = on ? "text-amber-400" : "text-line";
        return interactive ? (
          <button
            key={n}
            type="button"
            onClick={() => onRate?.(n)}
            aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
            className={`${cls} transition-colors hover:text-amber-400`}
          >
            ★
          </button>
        ) : (
          <span key={n} className={cls}>
            ★
          </span>
        );
      })}
      {count != null && (
        <span className="ml-1 text-xs font-medium text-muted">
          {value ? value.toFixed(1) : "—"}
          {count ? ` (${count})` : ""}
        </span>
      )}
    </span>
  );
}
