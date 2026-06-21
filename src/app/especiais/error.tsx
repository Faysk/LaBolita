"use client";

import { RouteErrorState } from "@/components/route-error-state";

export default function SpecialsError({
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
      eyebrow="Especiais"
      title="Os palpites finais não carregaram"
      description="Suas escolhas continuam preservadas. Tente novamente para ver pendências, categorias e próximos especiais."
    />
  );
}
