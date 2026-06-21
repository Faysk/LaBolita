"use client";

import { RouteErrorState } from "@/components/route-error-state";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteErrorState
      error={error}
      unstable_retry={unstable_retry}
      eyebrow="Admin"
      title="A sala de controle não carregou"
      description="Nenhuma ação operacional foi executada. Tente novamente para reabrir usuários, auditoria e fila de resultados."
    />
  );
}
