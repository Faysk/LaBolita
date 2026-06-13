import type { Metadata } from "next";
import { CheckCircle2, Clock3, EyeOff, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Regras",
};

const scoring = [
  ["Placar exato", "10", "Acertou os gols das duas seleções."],
  ["Resultado refinado", "7", "Vencedor e diferença ou gols de uma seleção."],
  ["Resultado correto", "5", "Acertou vitória ou empate."],
  ["Gols de uma seleção", "2", "Acertou um placar, mas errou o resultado."],
  ["Errou tudo", "0", "Sem pontos na partida."],
];

const stages = [
  ["Fase de grupos", "×1"],
  ["Fase de 32", "×1"],
  ["Oitavas", "×2"],
  ["Quartas", "×3"],
  ["Semifinais", "×4"],
  ["Terceiro lugar", "×2"],
  ["Final", "×5"],
];

export default function RulesPage() {
  return (
    <main className="page-container py-7 md:py-10">
      <div className="max-w-2xl">
        <p className="eyebrow">Sem letrinha miúda</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.05em] md:text-5xl">
          Regras do jogo
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted md:text-base">
          A pontuação do LaBolita é igual para todos os grupos. Em cada partida,
          somente o melhor tipo de acerto é considerado.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted md:text-base">
          Na fase de grupos, partidas podem terminar empatadas e não há disputa
          por pênaltis. No mata-mata, inclusive na disputa de terceiro lugar, o
          placar considerado é o resultado ao fim da prorrogação e exclui as
          cobranças de pênaltis; o classificado ou vencedor é informado separadamente.
        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          [Clock3, "Até o apito", "Altere seu palpite livremente até o bloqueio."],
          [EyeOff, "Tudo oculto", "Os palpites rivais aparecem somente após o bloqueio."],
          [ShieldCheck, "Sem jeitinho", "O horário do servidor decide se um palpite é válido."],
        ].map(([Icon, title, text]) => {
          const RuleIcon = Icon as typeof Clock3;
          return (
            <article key={title as string} className="card p-5">
              <RuleIcon className="size-5 text-brand" />
              <h2 className="mt-4 font-black">{title as string}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text as string}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-9 grid gap-6 md:grid-cols-[1.25fr_0.75fr]">
        <article className="card overflow-hidden">
          <div className="border-b p-5 md:p-6">
            <p className="eyebrow">Por partida</p>
            <h2 className="mt-1 text-2xl font-black">Pontuação base</h2>
          </div>
          <div className="divide-y">
            {scoring.map(([name, points, description]) => (
              <div key={name} className="grid grid-cols-[1fr_auto] gap-4 p-5 md:p-6">
                <div>
                  <p className="font-bold">{name}</p>
                  <p className="mt-1 text-sm text-muted">{description}</p>
                </div>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-sm font-black text-brand-strong">
                  {points}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="card overflow-hidden">
          <div className="border-b p-5 md:p-6">
            <p className="eyebrow">Emoção crescente</p>
            <h2 className="mt-1 text-2xl font-black">Peso por fase</h2>
          </div>
          <div className="divide-y">
            {stages.map(([stage, multiplier]) => (
              <div key={stage} className="flex items-center justify-between p-4 px-5">
                <span className="text-sm font-bold">{stage}</span>
                <span className="rounded-xl bg-surface-muted px-3 py-1.5 text-sm font-black text-brand">
                  {multiplier}
                </span>
              </div>
            ))}
          </div>
          <div className="card-dark m-4 rounded-2xl p-4 text-white">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-sm leading-6 text-white/75">
                No mata-mata, acertar quem avança rende mais{" "}
                <strong className="text-white">3 pontos</strong>, sem
                multiplicador. A disputa de terceiro lugar define um vencedor,
                mas não concede esse bônus.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6 card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-brand/10 p-2 text-brand">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="eyebrow">Extras</p>
            <h2 className="mt-1 text-2xl font-black">Palpites especiais</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Artilheiro, assistências, Luva de Ouro, Bola de Ouro, campeão,
              vice, semifinalistas e seleções destaque têm pontuação própria e
              ranking separado. Categorias por jogador podem render bônus menor
              se você acertar a seleção, mas não o atleta exato.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              O admin confirma os resultados especiais com fonte ou motivo. Nas
              categorias por seleção, o painel pode sugerir o resultado usando
              os placares já carregados, mas a confirmação final continua
              manual e corrigível.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
