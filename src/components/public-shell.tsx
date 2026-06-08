import type { ReactNode } from "react";
import { SiteShell } from "@/components/site-shell";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export function PublicShell({ children }: { children: ReactNode }) {
  const isDemo = !hasSupabaseConfig();

  return (
    <SiteShell
      displayName={isDemo ? "Faysk · demonstração" : "Visitante"}
      isAuthenticated={isDemo}
      isAdmin={isDemo}
      isDemo={isDemo}
    >
      {children}
    </SiteShell>
  );
}
