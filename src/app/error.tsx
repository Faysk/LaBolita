"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="page-container flex min-h-[65vh] items-center justify-center py-12">
      <section className="card max-w-lg p-7 text-center md:p-10">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <TriangleAlert className="size-6" />
        </span>
        <p className="eyebrow mt-5">Algo saiu do jogo</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">
          Não conseguimos carregar esta área
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Seus dados continuam preservados. Tente novamente para refazer a
          consulta.
        </p>
        <button
          type="button"
          onClick={unstable_retry}
          className="interactive mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-extrabold text-white"
        >
          <RefreshCw className="size-4" />
          Tentar novamente
        </button>
        {error.digest && (
          <p className="mt-4 font-mono text-[10px] text-muted">
            Referência: {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}
