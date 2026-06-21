"use client";

import { RouteErrorState } from "@/components/route-error-state";

export default function PlayersError({
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
      eyebrow="Jogadores"
      title="As figurinhas não abriram agora"
      description="Tente recarregar para reconstruir catálogo, filtros, seleções e destaques dos jogadores."
    />
  );
}
