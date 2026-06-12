"use client";

import Link from "next/link";
import { Eye, EyeOff, LoaderCircle, LogOut, Settings2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { UserAvatar } from "@/components/user-avatar";

export function AccountMenu({
  displayName,
  isAuthenticated,
  isAdmin,
  isDemo,
  avatarUrl,
  showAvatarPublicly,
}: {
  displayName: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDemo: boolean;
  avatarUrl?: string | null;
  showAvatarPublicly: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
  const [publicAvatar, setPublicAvatar] = useState(showAvatarPublicly);
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

  async function togglePublicAvatar() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase || updatingPrivacy) return;
    setUpdatingPrivacy(true);
    const nextValue = !publicAvatar;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setUpdatingPrivacy(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ show_avatar_publicly: nextValue })
      .eq("id", authData.user.id);
    if (!error) {
      setPublicAvatar(nextValue);
      router.refresh();
    }
    setUpdatingPrivacy(false);
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
        className="interactive rounded-full"
      >
        <UserAvatar
          name={displayName}
          initials={initials || "LB"}
          avatarUrl={avatarUrl}
          className="size-9"
        />
      </button>
      {open && (
        <div
          id="account-menu"
          role="menu"
          className="absolute right-0 top-12 w-60 rounded-2xl border bg-surface p-2 shadow-2xl shadow-brand/15"
        >
          <p className="truncate px-3 py-2 text-sm font-black">{displayName}</p>
          {!isDemo && (
            <Link
              href="/conta"
              onClick={() => setOpen(false)}
              className="interactive flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-muted hover:bg-surface-muted"
            >
              <Settings2 className="size-4" /> Minha conta
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="interactive flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-muted hover:bg-surface-muted"
            >
              <Shield className="size-4" /> Administração
            </Link>
          )}
          {!isDemo && avatarUrl && (
            <button
              type="button"
              onClick={togglePublicAvatar}
              disabled={updatingPrivacy}
              className="interactive flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-muted hover:bg-surface-muted disabled:opacity-50"
            >
              {updatingPrivacy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : publicAvatar ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
              {publicAvatar ? "Ocultar foto pública" : "Exibir foto pública"}
            </button>
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
