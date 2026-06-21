"use client";

import { Children, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

type CarouselRailProps = {
  children: React.ReactNode;
  ariaLabel: string;
  initialCount?: number;
  step?: number;
  loadMode?: "auto" | "button" | "both";
  centerMode?: boolean;
  dragScroll?: boolean;
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
  activeIndex: number;
};

const defaultInitialCount = 12;
const dragThreshold = 5;
const dragMomentumFactor = 440;
const dragMomentumLimit = 720;
const dragMomentumRestoreDelay = 360;

const initialScrollState: ScrollState = {
  canGoBack: false,
  canGoForward: false,
  progress: 1,
  activeIndex: 0,
};

export function CarouselRail({
  children,
  ariaLabel,
  initialCount,
  step,
  loadMode = "auto",
  centerMode = true,
  dragScroll = true,
  moreLabel = "Ver mais",
  lessLabel = "Mostrar menos",
  className = "",
  trackClassName = "",
  itemClassName = "",
  buttonClassName = "",
  summaryLabel,
}: CarouselRailProps) {
  const titleId = useId();
  const instructionsId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    captured: false,
    moved: false,
    pointerId: -1,
    startScrollLeft: 0,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const items = Children.toArray(children).filter(Boolean);
  const safeInitialCount = initialCount
    ? Math.max(1, initialCount)
    : loadMode === "button"
      ? items.length
      : Math.min(items.length, defaultInitialCount);
  const safeStep = Math.max(1, step ?? safeInitialCount);
  const [visibleCount, setVisibleCount] = useState(safeInitialCount);
  const [scrollState, setScrollState] = useState(initialScrollState);
  const [dragging, setDragging] = useState(false);
  const hasExpandableItems = items.length > safeInitialCount;
  const hasMore = visibleCount < items.length;
  const hiddenCount = Math.max(0, items.length - visibleCount);
  const visibleItems = items.slice(0, visibleCount);
  const shouldAutoLoad = loadMode !== "button";
  const shouldShowLoadButton = loadMode !== "auto";
  const expandLabel = summaryLabel
    ? summaryLabel(hiddenCount, items.length)
    : hiddenCount > 0
      ? `${moreLabel} (${hiddenCount})`
      : moreLabel;

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;

    track.scrollBy({
      left: direction * Math.max(260, track.clientWidth * 0.82),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function scrollToEdge(edge: "start" | "end") {
    const track = trackRef.current;
    if (!track) return;

    track.scrollTo({
      left: edge === "start" ? 0 : track.scrollWidth - track.clientWidth,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const activeTrack = track;

    function updateScrollState() {
      const maxScroll = Math.max(0, activeTrack.scrollWidth - activeTrack.clientWidth);
      const current = Math.min(maxScroll, Math.max(0, activeTrack.scrollLeft));
      const activeIndex = activeItemIndex(activeTrack);
      const nextState = {
        canGoBack: current > 2,
        canGoForward: current < maxScroll - 2,
        progress: maxScroll > 0 ? Math.max(0.08, current / maxScroll) : 1,
        activeIndex,
      };

      setScrollState((previous) => {
        if (
          previous.canGoBack === nextState.canGoBack &&
          previous.canGoForward === nextState.canGoForward &&
          previous.progress === nextState.progress &&
          previous.activeIndex === nextState.activeIndex
        ) {
          return previous;
        }

        return nextState;
      });

      if (!shouldAutoLoad || visibleCount >= items.length) return;

      const nearEnd = maxScroll - current < Math.max(180, activeTrack.clientWidth * 0.65);
      const needsMoreToOverflow = maxScroll < 8;
      if (nearEnd || needsMoreToOverflow) {
        setVisibleCount((currentCount) =>
          Math.min(items.length, currentCount + safeStep),
        );
      }
    }

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(activeTrack);

    activeTrack.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      resizeObserver.disconnect();
      activeTrack.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [items.length, safeStep, shouldAutoLoad, visibleCount]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !dragScroll) return;
    const activeTrack = track;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Element;
      if (event.button !== 0 || !event.isPrimary) return;
      if (event.pointerType === "touch") return;
      if (target.closest("input, select, textarea")) return;

      dragRef.current = {
        captured: false,
        moved: false,
        pointerId: event.pointerId,
        startScrollLeft: activeTrack.scrollLeft,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastTime: performance.now(),
        velocity: 0,
      };
    }

    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (drag.pointerId !== event.pointerId) return;

      const delta = event.clientX - drag.startX;
      const verticalDelta = event.clientY - drag.startY;
      const horizontalDistance = Math.abs(delta);
      const verticalDistance = Math.abs(verticalDelta);
      const now = performance.now();
      const elapsed = Math.max(16, now - drag.lastTime);
      const movement = event.clientX - drag.lastX;

      if (!drag.moved) {
        if (
          horizontalDistance < dragThreshold &&
          verticalDistance < dragThreshold
        ) {
          return;
        }

        if (verticalDistance > horizontalDistance) {
          drag.pointerId = -1;
          return;
        }

        drag.moved = true;
        setDragging(true);
        disableDragFriction(activeTrack);
        if (activeTrack.setPointerCapture) {
          activeTrack.setPointerCapture(event.pointerId);
          drag.captured = true;
        }
      }

      event.preventDefault();
      disableDragFriction(activeTrack);
      drag.velocity = movement / elapsed;
      drag.lastX = event.clientX;
      drag.lastTime = now;
      activeTrack.scrollLeft = drag.startScrollLeft - delta;
    }

    function handlePointerEnd(event: PointerEvent) {
      const drag = dragRef.current;
      if (drag.pointerId !== event.pointerId) return;

      setDragging(false);
      if (drag.captured && activeTrack.hasPointerCapture?.(event.pointerId)) {
        activeTrack.releasePointerCapture(event.pointerId);
      }
      let restoreDelay = 0;
      if (drag.moved && Math.abs(drag.velocity) > 0.08 && !prefersReducedMotion()) {
        const momentum = clamp(
          -drag.velocity * dragMomentumFactor,
          -dragMomentumLimit,
          dragMomentumLimit,
        );

        if (Math.abs(momentum) > 20) {
          activeTrack.scrollBy({ left: momentum, behavior: "smooth" });
          restoreDelay = dragMomentumRestoreDelay;
        }
      }
      restoreDragFriction(activeTrack, restoreDelay);
      drag.pointerId = -1;
      drag.captured = false;
      window.setTimeout(() => {
        if (dragRef.current.pointerId === -1) {
          dragRef.current.moved = false;
        }
      }, 0);
    }

    function handlePointerLeave(event: PointerEvent) {
      const drag = dragRef.current;
      if (drag.pointerId === event.pointerId && !drag.captured) {
        handlePointerEnd(event);
      }
    }

    function handleClickCapture(event: MouseEvent) {
      if (!dragRef.current.moved) return;

      event.preventDefault();
      event.stopPropagation();
      dragRef.current.moved = false;
    }

    function preventNativeDrag(event: DragEvent) {
      event.preventDefault();
    }

    activeTrack.addEventListener("click", handleClickCapture, true);
    activeTrack.addEventListener("dragstart", preventNativeDrag);
    activeTrack.addEventListener("pointercancel", handlePointerEnd);
    activeTrack.addEventListener("pointerdown", handlePointerDown);
    activeTrack.addEventListener("pointerleave", handlePointerLeave);
    activeTrack.addEventListener("pointermove", handlePointerMove);
    activeTrack.addEventListener("pointerup", handlePointerEnd);

    return () => {
      activeTrack.removeEventListener("click", handleClickCapture, true);
      activeTrack.removeEventListener("dragstart", preventNativeDrag);
      activeTrack.removeEventListener("pointercancel", handlePointerEnd);
      activeTrack.removeEventListener("pointerdown", handlePointerDown);
      activeTrack.removeEventListener("pointerleave", handlePointerLeave);
      activeTrack.removeEventListener("pointermove", handlePointerMove);
      activeTrack.removeEventListener("pointerup", handlePointerEnd);
    };
  }, [dragScroll]);

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
      data-center-mode={centerMode ? "true" : "false"}
      className={`carousel-rail min-w-0 max-w-full overflow-hidden ${className}`}
    >
      <span id={titleId} className="sr-only">
        {ariaLabel}
      </span>
      <span id={instructionsId} className="sr-only">
        Use as setas do teclado para navegar pelo carrossel. No desktop, também dá para arrastar com o mouse.
      </span>
      <div className="group/rail relative min-w-0 max-w-full">
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
          aria-label={ariaLabel}
          aria-describedby={instructionsId}
          data-dragging={dragging ? "true" : "false"}
          className={`carousel-rail-track grid w-full max-w-full snap-x snap-mandatory scroll-px-6 grid-flow-col overflow-x-auto py-2 ${trackClassName}`}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              move(-1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              move(1);
            }
            if (event.key === "Home") {
              event.preventDefault();
              scrollToEdge("start");
            }
            if (event.key === "End") {
              event.preventDefault();
              scrollToEdge("end");
            }
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={`${titleId}-${index}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} de ${items.length}`}
              data-active={centerMode && index === scrollState.activeIndex ? "true" : "false"}
              className={`carousel-rail-item min-w-0 snap-center ${itemClassName}`}
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
      {hasExpandableItems && shouldShowLoadButton ? (
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

function activeItemIndex(track: HTMLDivElement) {
  const items = Array.from(track.children) as HTMLElement[];
  if (items.length === 0) return 0;

  const trackBox = track.getBoundingClientRect();
  const trackCenter = trackBox.left + trackBox.width / 2;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  items.forEach((item, index) => {
    const box = item.getBoundingClientRect();
    const itemCenter = box.left + box.width / 2;
    const distance = Math.abs(trackCenter - itemCenter);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function disableDragFriction(track: HTMLDivElement) {
  track.style.scrollBehavior = "auto";
  track.style.scrollSnapType = "none";
}

function restoreDragFriction(track: HTMLDivElement, delay: number) {
  window.setTimeout(() => {
    track.style.scrollBehavior = "";
    track.style.scrollSnapType = "";
  }, delay);
}
