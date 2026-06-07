import Link from "next/link";
import { BarChart3, CircleHelp, Home, Shield, Target } from "lucide-react";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/account-menu";
import { Brand } from "@/components/brand";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const navigation = [
  { href: "/", label: "Início", icon: Home },
  { href: "/palpites", label: "Palpites", icon: Target },
  { href: "/boloes", label: "Bolões", icon: BarChart3 },
  { href: "/regras", label: "Regras", icon: CircleHelp },
];

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const { data: profile } = user
    ? await supabase!
        .from("profiles")
        .select("display_name, is_admin")
        .eq("id", user.id)
        .single()
    : { data: null };
  const demoMode = !supabase;
  const isAdmin = demoMode || Boolean(profile?.is_admin);
  const displayName =
    profile?.display_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Visitante";

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl">
        <div className="page-container flex h-16 items-center justify-between">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm font-bold text-muted transition hover:bg-surface-muted hover:text-brand"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                aria-label="Administração"
                className="hidden rounded-xl p-2 text-muted transition hover:bg-surface-muted hover:text-brand md:block"
              >
                <Shield className="size-4" />
              </Link>
            )}
            <AccountMenu
              displayName={demoMode ? "Faysk · demonstração" : displayName}
              isAuthenticated={demoMode || Boolean(user)}
              isAdmin={isAdmin}
              isDemo={demoMode}
            />
          </div>
        </div>
      </header>
      {demoMode && (
        <div className="border-b bg-accent/35">
          <p className="page-container py-2 text-center text-[11px] font-bold text-brand-strong">
            Modo demonstração: agenda parcial e dados salvos somente neste navegador.
          </p>
        </div>
      )}
      {children}
      <footer className="mt-12 border-t pb-24 pt-7 md:pb-8">
        <div className="page-container flex flex-col gap-3 text-xs font-semibold text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>LaBolita · bolão recreativo e independente.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacidade" className="transition hover:text-brand">
              Privacidade
            </Link>
            <Link href="/termos" className="transition hover:text-brand">
              Termos
            </Link>
            <a
              href="mailto:contato@faysk.dev"
              className="transition hover:text-brand"
            >
              Contato
            </a>
          </div>
        </div>
      </footer>
      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-2xl border bg-white/95 p-1.5 shadow-2xl shadow-brand/15 backdrop-blur-xl md:hidden">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold text-muted"
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
