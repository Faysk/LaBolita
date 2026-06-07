"use client";

import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function AccountMenu({
  displayName,
  isAuthenticated,
  isAdmin,
  isDemo,
}: {
  displayName: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDemo: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (!isAuthenticated) {
    return (
      <Link
        href="/entrar"
        className="rounded-xl bg-brand px-3 py-2 text-xs font-black text-white"
      >
        Entrar
      </Link>
    );
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase?.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Abrir menu da conta"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-9 items-center justify-center rounded-full bg-brand text-xs font-black text-white"
      >
        {initials || "LB"}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-52 rounded-2xl border bg-white p-2 shadow-2xl shadow-brand/15">
          <p className="truncate px-3 py-2 text-sm font-black">{displayName}</p>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-muted hover:bg-surface-muted"
            >
              <Shield className="size-4" /> Administração
            </Link>
          )}
          {!isDemo && (
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50"
            >
              <LogOut className="size-4" /> Sair
            </button>
          )}
        </div>
      )}
    </div>
  );
}
