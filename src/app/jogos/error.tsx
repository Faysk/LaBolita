"use client";

import { RouteErrorState } from "@/components/route-error-state";

export default function GamesError({
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
      eyebrow="Agenda"
      title="A agenda não carregou direito"
      description="Pode ter sido uma oscilação ao buscar jogos, horários ou comparações. Tente de novo para reconstruir a lista."
    />
  );
}
