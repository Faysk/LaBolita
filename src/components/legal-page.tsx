import type { ReactNode } from "react";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="page-container py-8 md:py-12">
      <article className="card mx-auto max-w-3xl overflow-hidden">
        <header className="border-b bg-brand-strong p-6 text-white md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
            {intro}
          </p>
          <p className="mt-5 text-xs font-bold text-white/55">
            Última atualização: 14 de junho de 2026
          </p>
        </header>
        <div className="legal-content p-6 md:p-10">{children}</div>
      </article>
    </main>
  );
}
