"use client";

import { RouteErrorState } from "@/components/route-error-state";

export default function PredictionsError({
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
      eyebrow="Palpites"
      title="Não conseguimos abrir seus palpites"
      description="Nenhum palpite foi alterado. Tente novamente para voltar à lista de jogos e comparações."
    />
  );
}
