import type { ReactNode } from "react";
import { SiteShell } from "@/components/site-shell";
import { getViewerContext } from "@/lib/auth";
import { CURRENT_TERMS_VERSION } from "@/lib/legal";

export async function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, demoMode } = await getViewerContext();
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
    <SiteShell
      displayName={demoMode ? "Faysk · demonstração" : displayName}
      isAuthenticated={demoMode || Boolean(user)}
      isAdmin={isAdmin}
      isDemo={demoMode}
      avatarUrl={profile?.avatar_url}
      termsAccepted={termsAccepted}
      isDisabled={Boolean(profile?.disabled_at)}
    >
      {children}
    </SiteShell>
  );
}
