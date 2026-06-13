"use client";

import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useLinkStatus } from "next/link";

export function LinkPendingLabel({
  children,
  pendingLabel = "Abrindo...",
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <span className={`inline-flex items-center justify-center gap-2 ${className}`} aria-live="polite">
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}

export function LinkPendingOverlay({
  label = "Carregando...",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span
        aria-hidden={!pending}
        className={`pointer-events-none absolute inset-0 z-10 grid place-items-center bg-surface/80 backdrop-blur-sm transition-opacity duration-150 ${
          pending ? "opacity-100" : "opacity-0"
        } ${className}`}
      >
        <span className="inline-flex items-center gap-2 rounded-2xl border bg-surface px-4 py-2 text-sm font-black text-brand shadow-lg">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {label}
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {pending ? label : ""}
      </span>
    </>
  );
}
