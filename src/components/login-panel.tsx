"use client";

import { LoaderCircle, LogIn, Settings2 } from "lucide-react";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginPanel({ nextPath = "/" }: { nextPath?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createBrowserSupabaseClient();

  async function signInWithGoogle() {
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (authError) {
      setError(authError.message);
      setBusy(false);
    }
  }

  if (!supabase) {
    return (
      <div className="rounded-3xl bg-surface-muted p-5">
        <Settings2 className="size-5 text-brand" />
        <h2 className="mt-4 font-black">Modo demonstração ativo</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Preencha as variáveis Supabase em <code>.env.local</code> para
          habilitar contas e persistência real.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={busy}
        aria-busy={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />}
        {busy ? "Abrindo Google..." : "Continuar com Google"}
      </button>
      {error && <p aria-live="polite" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
