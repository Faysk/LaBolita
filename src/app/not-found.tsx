import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="page-container flex min-h-[65vh] items-center justify-center py-12">
      <section className="card max-w-lg p-8 text-center">
        <p className="eyebrow">404 · Fora de campo</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Esta página não existe
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          O endereço pode ter mudado ou o conteúdo não está mais disponível.
        </p>
        <Link
          href="/"
          className="interactive mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-extrabold text-white"
        >
          <ArrowLeft className="size-4" />
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
