"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, RefreshCw, TriangleAlert } from "lucide-react";

export function RouteErrorState({
  error,
  unstable_retry,
  eyebrow,
  title,
  description,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
  eyebrow: string;
  title: string;
  description: string;
}) {
  useEffect(() => {
    console.error("Route rendering failed", error);
  }, [error]);

  return (
    <main className="page-container flex min-h-[65vh] items-center justify-center py-12">
      <section className="card max-w-xl p-6 text-center md:p-9">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <TriangleAlert className="size-6" />
        </span>
        <p className="eyebrow mt-5">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-6 text-muted">
          {description}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={unstable_retry}
            className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-black text-white"
          >
            <RefreshCw className="size-4" />
            Tentar de novo
          </button>
          <Link
            href="/"
            className="interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border bg-surface-muted px-5 text-sm font-black text-brand hover:border-brand/70"
          >
            <ArrowLeft className="size-4" />
            Ir ao início
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-5 font-mono text-[10px] font-bold text-muted">
            Referência: {error.digest}
          </p>
        ) : null}
      </section>
    </main>
  );
}
