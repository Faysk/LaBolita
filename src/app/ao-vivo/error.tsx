"use client";

import { RouteErrorState } from "@/components/route-error-state";

export default function LiveError({
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
      eyebrow="Ao vivo"
      title="O ao vivo perdeu o sinal"
      description="Tente novamente para atualizar placares, parciais e impacto no ranking em tempo real."
    />
  );
}
