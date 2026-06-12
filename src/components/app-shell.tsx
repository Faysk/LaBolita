import Link from "next/link";
import { Shield } from "lucide-react";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/account-menu";
import {
  DesktopNavigation,
  MobileNavigation,
} from "@/components/app-navigation";
import { Brand } from "@/components/brand";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";
import { getOptionalUser } from "@/lib/supabase/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserPreferencesHydrator } from "@/components/user-preferences-hydrator";
import {
  normalizeThemePreference,
  normalizeTimePreference,
} from "@/lib/user-preference-values";

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const user = supabase ? await getOptionalUser(supabase) : null;
  const { data: profile, error: profileError } = user
      ? await loadProfileForShell(supabase!, user.id)
    : { data: null, error: null };
  if (profileError) throw profileError;
  const demoMode = !supabase;
  const isAdmin = demoMode || Boolean(profile?.is_admin);
  const termsAccepted =
    Boolean(profile?.terms_accepted_at) &&
    profile?.terms_version === CURRENT_TERMS_VERSION;
  const displayName =
    profile?.display_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Visitante";

  return (
    <>
      <UserPreferencesHydrator
        themePreference={normalizeThemePreference(profile?.theme_preference)}
        timePreference={normalizeTimePreference(
          profile?.time_preference_mode,
          profile?.time_zone,
          profile?.time_offset_minutes,
        )}
      />
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="app-header sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="page-container flex h-[4.25rem] items-center justify-between">
          <Brand />
          <DesktopNavigation />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAdmin && (
              <Link
                href="/admin"
                aria-label="Administração"
                className="interactive hidden rounded-xl p-2 text-muted hover:bg-surface-muted hover:text-brand md:block"
              >
                <Shield className="size-4" />
              </Link>
            )}
            <AccountMenu
              displayName={demoMode ? "Faysk · demonstração" : displayName}
              isAuthenticated={demoMode || Boolean(user)}
              isAdmin={isAdmin}
              isDemo={demoMode}
              avatarUrl={profile?.avatar_url}
              showAvatarPublicly={Boolean(profile?.show_avatar_publicly)}
            />
          </div>
        </div>
      </header>
      {demoMode && (
        <div className="border-b bg-gradient-to-r from-accent/15 via-accent/45 to-accent/15">
          <p className="page-container py-2 text-center text-[11px] font-bold text-brand-strong">
            Modo demonstração: agenda parcial e dados salvos somente neste navegador.
          </p>
        </div>
      )}
      {!demoMode && user && !termsAccepted && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="page-container py-2 text-center text-xs font-bold text-amber-800">
            Confirme os termos para salvar palpites e participar de bolões.{" "}
            <Link href="/aceitar-termos" className="underline">
              Revisar e aceitar
            </Link>
          </p>
        </div>
      )}
      {!demoMode && user && profile?.disabled_at && (
        <div className="border-b border-red-200 bg-red-50">
          <p className="page-container py-2 text-center text-xs font-bold text-red-800">
            Esta conta está suspensa. Seus dados permanecem preservados.
          </p>
        </div>
      )}
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <footer className="app-footer mt-12 border-t pb-24 pt-7 backdrop-blur-sm md:pb-8">
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
      <MobileNavigation />
    </>
  );
}

async function loadProfileForShell(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
) {
  const baseColumns =
    "display_name, avatar_url, is_admin, is_master_admin, terms_accepted_at, terms_version, disabled_at";
  const optionalColumns =
    "show_avatar_publicly, theme_preference, time_preference_mode, time_zone, time_offset_minutes";
  const result = await supabase
    .from("profiles")
    .select(`${baseColumns}, ${optionalColumns}`)
    .eq("id", userId)
    .single();

  if (!result.error || !isMissingOptionalProfileColumn(result.error)) return result;

  const fallback = await supabase
    .from("profiles")
    .select(`${baseColumns}, show_avatar_publicly`)
    .eq("id", userId)
    .single();

  if (!fallback.error || !isMissingOptionalProfileColumn(fallback.error)) {
    return {
      ...fallback,
      data: fallback.data
        ? {
            ...fallback.data,
            theme_preference: null,
            time_preference_mode: null,
            time_zone: null,
            time_offset_minutes: null,
          }
        : fallback.data,
    };
  }

  const minimalFallback = await supabase
    .from("profiles")
    .select(baseColumns)
    .eq("id", userId)
    .single();

  return {
    ...minimalFallback,
    data: minimalFallback.data
      ? {
          ...minimalFallback.data,
          show_avatar_publicly: false,
          theme_preference: null,
          time_preference_mode: null,
          time_zone: null,
          time_offset_minutes: null,
        }
      : minimalFallback.data,
  };
}

function isMissingOptionalProfileColumn(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /show_avatar_publicly|theme_preference|time_preference/i.test(error.message ?? "")
  );
}
