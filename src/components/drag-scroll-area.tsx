"use client";

import { useRef, useState } from "react";

export function DragScrollArea({
  children,
  ariaLabel,
  className = "",
}: {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const dragRef = useRef({
    moved: false,
    pointerId: -1,
    startScrollLeft: 0,
    startX: 0,
  });
  const [dragging, setDragging] = useState(false);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) return;

    dragRef.current = {
      moved: false,
      pointerId: event.pointerId,
      startScrollLeft: event.currentTarget.scrollLeft,
      startX: event.clientX,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!dragging || drag.pointerId !== event.pointerId) return;

    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 4) drag.moved = true;
    event.currentTarget.scrollLeft = drag.startScrollLeft - delta;
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.pointerId = -1;
  }

  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!dragRef.current.moved) return;

    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  }

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      data-dragging={dragging ? "true" : "false"}
      className={`drag-scroll-area overflow-x-auto ${className}`}
      onClickCapture={handleClickCapture}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerLeave={(event) => {
        if (dragging) handlePointerEnd(event);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
    >
      {children}
    </div>
  );
}
