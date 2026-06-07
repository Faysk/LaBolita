import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Termos de Serviço",
  description: "Condições para usar o LaBolita.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Jogo limpo"
      title="Termos de Serviço"
      intro="Ao acessar ou usar o LaBolita, você concorda com estas condições. Leia-as antes de criar uma conta ou participar de um bolão."
    >
      <section>
        <h2>1. Sobre o serviço</h2>
        <p>
          O LaBolita é uma plataforma recreativa para registrar palpites e comparar
          pontuações entre participantes durante a Copa do Mundo 2026. O serviço
          não é afiliado, patrocinado ou administrado pela FIFA.
        </p>
      </section>

      <section>
        <h2>2. Conta e elegibilidade</h2>
        <p>
          Antes do primeiro acesso, você deve aceitar estes termos e a política de
          privacidade. Você deve fornecer informações verdadeiras, proteger o acesso
          à sua conta e responder pelas ações realizadas nela. Contas usadas para
          fraude, abuso, automação indevida ou tentativa de comprometer o serviço
          podem ser suspensas de forma reversível pela administração.
        </p>
      </section>

      <section>
        <h2>3. Palpites, bloqueios e pontuação</h2>
        <p>
          Palpites podem ser alterados até o horário de bloqueio definido pelo
          servidor. Resultados, correções e critérios de pontuação seguem as{" "}
          <Link href="/regras">Regras do jogo</Link>. Em caso de divergência, os
          registros auditáveis do sistema e o resultado oficial da competição
          prevalecem.
        </p>
      </section>

      <section>
        <h2>4. Uso recreativo e prêmios</h2>
        <p>
          O LaBolita não processa apostas, pagamentos ou prêmios e não deve ser
          usado como serviço de jogos de azar. Qualquer prêmio combinado
          externamente entre participantes é responsabilidade exclusiva dos
          envolvidos e deve respeitar a legislação aplicável.
        </p>
      </section>

      <section>
        <h2>5. Conduta permitida</h2>
        <ul>
          <li>Não tentar acessar contas, dados ou áreas sem autorização.</li>
          <li>Não explorar falhas, interferir no serviço ou contornar bloqueios.</li>
          <li>Não usar nomes, imagens ou conteúdo ilícito, ofensivo ou enganoso.</li>
          <li>Não sobrecarregar a plataforma com automações ou requisições abusivas.</li>
        </ul>
      </section>

      <section>
        <h2>6. Bolões públicos e administração</h2>
        <p>
          Ao tornar um bolão público, seu nome, organizador, quantidade de
          participantes e ranking ficam visíveis também para visitantes. O dono
          pode editar e arquivar o bolão; o arquivamento remove sua exibição sem
          apagar definitivamente o histórico. A administração master pode auditar,
          corrigir e recuperar bolões quando necessário.
        </p>
      </section>

      <section>
        <h2>7. Disponibilidade e alterações</h2>
        <p>
          Buscamos manter o serviço correto e disponível, mas podem ocorrer falhas,
          atrasos de provedores esportivos, manutenções ou indisponibilidades. O
          produto, suas regras e funcionalidades podem ser alterados; mudanças que
          afetem a competição em andamento serão comunicadas com transparência.
        </p>
      </section>

      <section>
        <h2>8. Responsabilidade</h2>
        <p>
          Na medida permitida pela lei, o LaBolita não responde por perdas indiretas,
          decisões tomadas com base em placares provisórios, acordos externos entre
          participantes ou indisponibilidade causada por terceiros. Nada nestes
          termos limita direitos obrigatórios do consumidor.
        </p>
      </section>

      <section>
        <h2>9. Privacidade, encerramento e legislação</h2>
        <p>
          O tratamento de dados segue a{" "}
          <Link href="/privacidade">Política de Privacidade</Link>. Você pode pedir
          o encerramento da conta pelo e-mail{" "}
          <a href="mailto:contato@faysk.dev">contato@faysk.dev</a>. Estes termos
          são regidos pelas leis brasileiras, respeitados os direitos legais de
          cada usuário.
        </p>
      </section>
    </LegalPage>
  );
}
