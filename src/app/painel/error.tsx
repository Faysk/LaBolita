"use client";

import { RouteErrorState } from "@/components/route-error-state";

export default function DashboardError({
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
      eyebrow="Painel"
      title="Seu painel saiu do ar por um instante"
      description="A pontuação e os palpites continuam preservados. Tente recarregar esta área para buscar os dados mais recentes."
    />
  );
}
