"use client";

import { LogIn, Settings2 } from "lucide-react";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginPanel({ nextPath = "/" }: { nextPath?: string }) {
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  async function signInWithGoogle() {
    if (!supabase) return;

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (authError) setError(authError.message);
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
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-extrabold text-white"
      >
        <LogIn className="size-4" />
        Continuar com Google
      </button>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
