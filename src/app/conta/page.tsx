import type { Metadata } from "next";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { requireUser } from "@/lib/auth";
import { getMatches } from "@/lib/data/matches";

export const metadata: Metadata = {
  title: "Minha conta",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const context = await requireUser("/conta");
  if (!context) return null;

  const { data: profile, error } = await context.supabase
    .from("profiles")
    .select("display_name, avatar_url, show_avatar_publicly")
    .eq("id", context.user.id)
    .single();
  if (error) throw error;

  const matches = await getMatches();
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

      <AccountSettingsPanel
        displayName={profile.display_name}
        email={context.user.email}
        avatarUrl={profile.avatar_url}
        showAvatarPublicly={Boolean(profile.show_avatar_publicly)}
        sampleMatch={sampleMatch}
      />
    </main>
  );
}
