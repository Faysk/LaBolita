import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TermsAcceptancePanel } from "@/components/terms-acceptance-panel";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Aceitar termos",
  robots: { index: false, follow: false },
};

export default async function AcceptTermsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const params = await searchParams;
  const nextPath = safeRedirectPath(params.next);

  if (!user) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);

  const { data: profile } = await supabase!
    .from("profiles")
    .select("terms_accepted_at, disabled_at")
    .eq("id", user.id)
    .single();
  if (profile?.disabled_at) redirect("/conta-suspensa");
  if (profile?.terms_accepted_at) redirect(nextPath);

  return (
    <main className="page-container flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
      <TermsAcceptancePanel
        nextPath={nextPath}
        initialError={
          params.erro === "registro"
            ? "Sua conta foi autenticada, mas ainda precisamos registrar o aceite dos termos. Confirme novamente abaixo."
            : null
        }
      />
    </main>
  );
}
