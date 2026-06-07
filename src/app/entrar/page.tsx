import type { Metadata } from "next";
import { LoginPanel } from "@/components/login-panel";
import { safeRedirectPath } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeRedirectPath(params.next);

  return (
    <main className="page-container flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
      <section className="card w-full max-w-md p-6 md:p-8">
        <p className="eyebrow">Sua conta</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.05em]">
          Entre no LaBolita
        </h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-muted">
          Seus palpites valem em todos os bolões e ficam ocultos até o bloqueio
          de cada partida.
        </p>
        <LoginPanel nextPath={nextPath} />
        {params.erro && (
          <p className="mt-4 text-sm font-bold text-red-700">
            Não foi possível concluir o login. Tente novamente.
          </p>
        )}
      </section>
    </main>
  );
}
