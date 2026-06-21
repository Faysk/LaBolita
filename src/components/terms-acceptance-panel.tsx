"use client";

import { Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function TermsAcceptancePanel({
  nextPath,
  initialError = null,
}: {
  nextPath: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function acceptTerms() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || !accepted || busy) return;

    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("accept_terms", {
      p_version: CURRENT_TERMS_VERSION,
    });
    if (rpcError) {
      setError("Não conseguimos registrar seu aceite. Tente novamente.");
      setBusy(false);
      return;
    }

    const { error: officialPoolError } = await supabase.rpc("ensure_official_pool_membership");
    if (officialPoolError) {
      console.error("Official pool membership synchronization failed after terms acceptance", {
        code: officialPoolError.code,
        message: officialPoolError.message,
      });
    }

    navigator.vibrate?.(25);
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <section className="card w-full max-w-lg p-6 md:p-8">
      <p className="eyebrow">Antes de entrar em campo</p>
      <h1 className="mt-1 text-3xl font-black tracking-[-0.05em]">
        Confirme as regras da casa
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Para usar sua conta, leia e aceite a versão atual dos termos e da
        política de privacidade.
      </p>
      <label className="my-6 flex cursor-pointer items-start gap-3 rounded-2xl border bg-surface-muted p-4 text-sm leading-5 text-muted">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-0.5 size-4 accent-[var(--brand)]"
        />
        <span>
          Li e aceito os <Link className="font-bold text-brand underline" href="/termos">Termos</Link>{" "}
          e a <Link className="font-bold text-brand underline" href="/privacidade">Política de Privacidade</Link>.
        </span>
      </label>
      <button
        type="button"
        disabled={!accepted || busy}
        aria-busy={busy}
        onClick={acceptTerms}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
        {busy ? "Registrando aceite..." : "Aceitar e continuar"}
      </button>
      {error && <p aria-live="polite" className="mt-3 text-sm font-bold text-red-700">{error}</p>}
    </section>
  );
}
