import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Database, ShieldCheck, Trophy } from "lucide-react";
import { athleteSourceStatuses } from "@/lib/athlete-data-sources";

export const metadata: Metadata = {
  title: "Jogadores e dados",
  description: "Plano de integracao de estatisticas de atletas da Copa 2026.",
};

export default function PlayersDataPage() {
  const sources = athleteSourceStatuses();
  const recommended = sources.find((source) => source.recommendation === "recommended");

  return (
    <main className="page-container py-7 md:py-10">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Dados de atletas</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Jogadores
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
            Esta area fica pronta para artilharia, assistencias, cartoes, faltas,
            minutos e rankings por selecao assim que um provedor confiavel for
            configurado.
          </p>
        </div>
        <Link
          href="/competicao"
          className="interactive inline-flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-black text-brand"
        >
          Voltar para Copa <ArrowRight className="size-4" />
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard
          icon={Trophy}
          title="O que entra aqui"
          text="Artilharia, assistencias, cartoes, faltas, minutos, rankings por selecao e eventos por partida."
        />
        <InfoCard
          icon={Database}
          title="Fonte recomendada"
          text={recommended ? recommended.name : "API-Football / API-Sports"}
        />
        <InfoCard
          icon={ShieldCheck}
          title="Regra de seguranca"
          text="Nada de scraping fragil em producao: primeiro chave, limite, licenca e cache no servidor."
        />
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <p className="eyebrow">Pipeline sugerido</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Fontes avaliadas</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {sources.map((source) => (
            <article key={source.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-brand">
                    {source.badge}
                  </p>
                  <h3 className="mt-1 text-xl font-black tracking-tight">{source.name}</h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black ${
                    source.configured ? "status-success" : "status-warning"
                  }`}
                >
                  {source.configured ? "Configurada" : "A configurar"}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">{source.coverage}</p>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-2xl bg-surface-muted p-3">
                  <p className="font-black">Forca</p>
                  <p className="mt-1 text-muted">{source.strengths}</p>
                </div>
                <div className="rounded-2xl bg-surface-muted p-3">
                  <p className="font-black">Cuidado</p>
                  <p className="mt-1 text-muted">{source.risks}</p>
                </div>
              </div>
              <a
                href={source.href}
                target="_blank"
                rel="noreferrer"
                className="interactive mt-4 inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-black text-brand"
              >
                Ver fonte <ArrowRight className="size-3.5" />
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Trophy;
  title: string;
  text: string;
}) {
  return (
    <article className="card p-5">
      <span className="inline-flex rounded-2xl bg-surface-muted p-3 text-brand">
        <Icon className="size-5" />
      </span>
      <h2 className="mt-4 text-lg font-black tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </article>
  );
}
