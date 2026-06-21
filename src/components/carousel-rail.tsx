"use client";

import { Children, useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

type CarouselRailProps = {
  children: React.ReactNode;
  ariaLabel: string;
  initialCount?: number;
  step?: number;
  moreLabel?: string;
  lessLabel?: string;
  className?: string;
  trackClassName?: string;
  itemClassName?: string;
  buttonClassName?: string;
  summaryLabel?: (hiddenCount: number, totalCount: number) => string;
};

type ScrollState = {
  canGoBack: boolean;
  canGoForward: boolean;
  progress: number;
};

const initialScrollState: ScrollState = {
  canGoBack: false,
  canGoForward: false,
  progress: 1,
};

export function CarouselRail({
  children,
  ariaLabel,
  initialCount,
  step,
  moreLabel = "Ver mais",
  lessLabel = "Mostrar menos",
  className = "",
  trackClassName = "",
  itemClassName = "",
  buttonClassName = "",
  summaryLabel,
}: CarouselRailProps) {
  const titleId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children).filter(Boolean);
  const safeInitialCount = initialCount ? Math.max(1, initialCount) : items.length;
  const safeStep = Math.max(1, step ?? safeInitialCount);
  const [visibleCount, setVisibleCount] = useState(safeInitialCount);
  const [scrollState, setScrollState] = useState(initialScrollState);
  const hasExpandableItems = items.length > safeInitialCount;
  const hasMore = visibleCount < items.length;
  const hiddenCount = Math.max(0, items.length - visibleCount);
  const visibleItems = items.slice(0, visibleCount);
  const expandLabel = summaryLabel
    ? summaryLabel(hiddenCount, items.length)
    : hiddenCount > 0
      ? `${moreLabel} (${hiddenCount})`
      : moreLabel;

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const current = Math.min(maxScroll, Math.max(0, track.scrollLeft));

    setScrollState({
      canGoBack: current > 2,
      canGoForward: current < maxScroll - 2,
      progress: maxScroll > 0 ? Math.max(0.08, current / maxScroll) : 1,
    });
  }, []);

  const move = useCallback(
    (direction: -1 | 1) => {
      const track = trackRef.current;
      if (!track) return;

      track.scrollBy({
        left: direction * Math.max(260, track.clientWidth * 0.82),
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    },
    [],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(track);

    track.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      resizeObserver.disconnect();
      track.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, visibleCount]);

  function toggleVisibleItems() {
    setVisibleCount((current) => {
      if (current >= items.length) {
        trackRef.current?.scrollTo({ left: 0, behavior: "auto" });
        return safeInitialCount;
      }

      return Math.min(items.length, current + safeStep);
    });
  }

  return (
    <section
      aria-labelledby={titleId}
      aria-roledescription="carrossel"
      className={`carousel-rail min-w-0 ${className}`}
    >
      <span id={titleId} className="sr-only">
        {ariaLabel}
      </span>
      <div className="group/rail relative min-w-0">
        <CarouselButton
          label={`Voltar em ${ariaLabel}`}
          direction="back"
          disabled={!scrollState.canGoBack}
          onClick={() => move(-1)}
        />
        <div
          ref={trackRef}
          tabIndex={0}
          aria-live="polite"
          className={`carousel-rail-track grid snap-x snap-mandatory scroll-px-1 grid-flow-col overflow-x-auto pb-2 ${trackClassName}`}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              move(-1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              move(1);
            }
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={`${titleId}-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} de ${items.length}`}
              className={`min-w-0 snap-start scroll-ml-1 ${itemClassName}`}
            >
              {item}
            </div>
          ))}
        </div>
        <CarouselButton
          label={`Avançar em ${ariaLabel}`}
          direction="forward"
          disabled={!scrollState.canGoForward}
          onClick={() => move(1)}
        />
        {scrollState.canGoBack ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-surface to-transparent opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 md:w-14"
          />
        ) : null}
        {scrollState.canGoForward ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 md:w-14"
          />
        ) : null}
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full origin-left rounded-full bg-brand transition-transform duration-200"
          style={{ transform: `scaleX(${scrollState.progress})` }}
        />
      </div>
      {hasExpandableItems ? (
        <button
          type="button"
          aria-expanded={!hasMore}
          onClick={toggleVisibleItems}
          className={
            buttonClassName ||
            "interactive mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border bg-surface-muted px-4 py-3 text-xs font-black text-brand hover:border-brand/60"
          }
        >
          {hasMore ? (
            <>
              {expandLabel}
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
    </section>
  );
}

function CarouselButton({
  label,
  direction,
  disabled,
  onClick,
}: {
  label: string;
  direction: "back" | "forward";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "back" ? ChevronLeft : ChevronRight;
  const position = direction === "back" ? "left-2" : "right-2";

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`interactive absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border bg-surface text-brand shadow-lg shadow-brand/10 transition-opacity md:flex ${position} ${
        disabled
          ? "pointer-events-none opacity-0"
          : "opacity-0 group-hover/rail:opacity-100 focus-visible:opacity-100"
      }`}
    >
      <Icon className="size-4" />
    </button>
  );
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
