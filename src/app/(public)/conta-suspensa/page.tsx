import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conta suspensa",
  robots: { index: false, follow: false },
};

export default function SuspendedAccountPage() {
  return (
    <main className="page-container flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
      <section className="card max-w-lg p-6 text-center md:p-8">
        <p className="eyebrow">Conta temporariamente indisponível</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em]">Fale com a administração</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          Esta conta foi suspensa de forma reversível. Seus bolões e palpites foram
          preservados. Entre em contato pelo e-mail{" "}
          <a className="font-bold text-brand underline" href="mailto:contato@faysk.dev">
            contato@faysk.dev
          </a>
          .
        </p>
      </section>
    </main>
  );
}
