"use client";

import Link from "next/link";
import { LoaderCircle, LogOut, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function closeOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

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
    setSigningOut(true);
    const supabase = createBrowserSupabaseClient();
    await supabase?.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Abrir menu da conta"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="account-menu"
        onClick={() => setOpen((value) => !value)}
        className="interactive flex size-9 items-center justify-center rounded-full bg-brand text-xs font-black text-white"
      >
        {initials || "LB"}
      </button>
      {open && (
        <div
          id="account-menu"
          role="menu"
          className="absolute right-0 top-12 w-52 rounded-2xl border bg-white p-2 shadow-2xl shadow-brand/15"
        >
          <p className="truncate px-3 py-2 text-sm font-black">{displayName}</p>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="interactive flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-muted hover:bg-surface-muted"
            >
              <Shield className="size-4" /> Administração
            </Link>
          )}
          {!isDemo && (
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              aria-busy={signingOut}
              className="interactive flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {signingOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />} {signingOut ? "Saindo..." : "Sair"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
