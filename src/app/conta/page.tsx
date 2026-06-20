import type { Metadata } from "next";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { UserAlerts } from "@/components/user-alerts";
import { requireUser } from "@/lib/auth";
import { getAdminAlertsForCurrentUser } from "@/lib/data/admin-alerts";
import { getMatches } from "@/lib/data/matches";
import {
  normalizeThemePreference,
  normalizeTimePreference,
} from "@/lib/user-preference-values";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const context = await requireUser("/conta");
  if (!context) return null;

  const { data: profile, error } = await loadAccountProfile(context.supabase, context.user.id);
  if (error) throw error;
  if (!profile) throw new Error("Perfil não encontrado.");

  const [matches, alerts] = await Promise.all([
    getMatches(),
    getAdminAlertsForCurrentUser(),
  ]);
  const sampleMatch = matches.find((match) => !match.result) ?? matches[0] ?? null;

  return (
    <main className="page-container py-7 md:py-10">
      <div className="mb-7">
        <p className="eyebrow">Sua conta</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
          Perfil e preferências
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
          Ajuste como seu nome aparece nos rankings, controle a privacidade da foto e escolha como os horários dos jogos aparecem para você.
        </p>
      </div>

      <UserAlerts alerts={alerts} compact />

      <AccountSettingsPanel
        displayName={profile.display_name}
        email={context.user.email}
        avatarUrl={profile.avatar_url}
        showAvatarPublicly={Boolean(profile.show_avatar_publicly)}
        persistedThemePreference={normalizeThemePreference(profile.theme_preference)}
        persistedTimePreference={normalizeTimePreference(
          profile.time_preference_mode,
          profile.time_zone,
          profile.time_offset_minutes,
        )}
        sampleMatch={sampleMatch}
      />
    </main>
  );
}

async function loadAccountProfile(
  supabase: NonNullable<Awaited<ReturnType<typeof requireUser>>>["supabase"],
  userId: string,
) {
  const baseColumns = "display_name, avatar_url, show_avatar_publicly";
  const preferenceColumns =
    "theme_preference, time_preference_mode, time_zone, time_offset_minutes";
  const result = await supabase
    .from("profiles")
    .select(`${baseColumns}, ${preferenceColumns}`)
    .eq("id", userId)
    .single();

  if (!result.error || !isMissingPreferenceColumn(result.error)) return result;

  const fallback = await supabase
    .from("profiles")
    .select(baseColumns)
    .eq("id", userId)
    .single();

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

function isMissingPreferenceColumn(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /theme_preference|time_preference/i.test(error.message ?? "")
  );
}
