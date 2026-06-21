"use client";

import { RouteErrorState } from "@/components/route-error-state";

export default function PoolsError({
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
      eyebrow="Bolões"
      title="O ranking não veio completo"
      description="Os bolões continuam salvos. Tente recarregar para buscar participantes, posições e detalhes de cada palpite."
    />
  );
}
