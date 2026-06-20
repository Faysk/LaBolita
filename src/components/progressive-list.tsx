"use client";

import { Children, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function ProgressiveList({
  children,
  initialCount,
  step,
  className = "",
  buttonClassName = "",
  moreLabel = "Ver mais",
  lessLabel = "Mostrar menos",
  summaryLabel,
}: {
  children: React.ReactNode;
  initialCount: number;
  step?: number;
  className?: string;
  buttonClassName?: string;
  moreLabel?: string;
  lessLabel?: string;
  summaryLabel?: (hiddenCount: number, totalCount: number) => string;
}) {
  const items = Children.toArray(children).filter(Boolean);
  const safeInitialCount = Math.max(1, initialCount);
  const safeStep = Math.max(1, step ?? initialCount);
  const [visibleCount, setVisibleCount] = useState(safeInitialCount);
  const hasMore = visibleCount < items.length;
  const hiddenCount = Math.max(0, items.length - visibleCount);
  const visibleItems = items.slice(0, visibleCount);

  return (
    <>
      <div className={className}>{visibleItems}</div>
      {items.length > safeInitialCount ? (
        <button
          type="button"
          onClick={() =>
            setVisibleCount((current) =>
              current >= items.length
                ? safeInitialCount
                : Math.min(items.length, current + safeStep),
            )
          }
          className={
            buttonClassName ||
            "interactive mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border bg-surface-muted px-4 py-3 text-xs font-black text-brand hover:border-brand/60"
          }
        >
          {hasMore ? (
            <>
              {summaryLabel ? summaryLabel(hiddenCount, items.length) : moreLabel}
              <ChevronDown className="size-4" />
            </>
          ) : (
            <>
              {lessLabel}
              <ChevronUp className="size-4" />
            </>
          )}
        </button>
      ) : null}
    </>
  );
}
