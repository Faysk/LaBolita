"use client";

import { RefreshCw } from "lucide-react";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="page-container flex min-h-screen items-center justify-center py-12">
          <section className="card max-w-lg p-8 text-center">
            <h1 className="text-2xl font-black">LaBolita precisa recarregar</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Tivemos uma falha inesperada, mas nenhum palpite foi alterado.
            </p>
            <button
              type="button"
              onClick={unstable_retry}
              className="interactive mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-extrabold text-white"
            >
              <RefreshCw className="size-4" />
              Recarregar
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
