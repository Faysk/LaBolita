"use client";

import { RouteErrorState } from "@/components/route-error-state";

export default function SpecialMarketError({
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
      eyebrow="Palpite final"
      title="Esta escolha especial não abriu"
      description="Nada foi gravado ou perdido. Tente novamente para voltar ao baralho e salvar sua escolha."
    />
  );
}
