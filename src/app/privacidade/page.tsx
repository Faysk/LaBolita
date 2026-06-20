import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o LaBolita coleta, usa e protege dados pessoais.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Transparência"
      title="Política de Privacidade"
      intro="Aqui explicamos quais dados o LaBolita usa para login, bolões, rankings, segurança e suporte."
    >
      <section>
        <h2>1. Quem controla os dados</h2>
        <p>
          O LaBolita é um projeto operado por Faysk por meio do domínio{" "}
          <strong>labolita.faysk.dev</strong>. Solicitações relacionadas a
          privacidade podem ser enviadas para{" "}
          <a href="mailto:contato@faysk.dev">contato@faysk.dev</a>.
        </p>
      </section>

      <section>
        <h2>2. Dados tratados</h2>
        <ul>
          <li>Nome, e-mail, identificador e foto fornecidos pelo login Google.</li>
          <li>Palpites, participação em bolões, pontuação e preferências da conta.</li>
          <li>Data e versão do aceite dos Termos de Serviço.</li>
          <li>Registros necessários para segurança, suporte e integridade dos bolões.</li>
          <li>
            Dados técnicos essenciais, como sessão, endereço IP e registros de
            segurança mantidos pelos provedores de infraestrutura.
          </li>
          <li>
            No modo demonstração, palpites e resultados são guardados apenas no
            armazenamento local do navegador.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Finalidades e bases legais</h2>
        <p>
          Os dados são usados para autenticar contas, registrar palpites, calcular
          rankings, administrar bolões, prevenir abuso, investigar erros e cumprir
          obrigações legais. O tratamento ocorre para executar o serviço solicitado
          pelo usuário e com base no legítimo interesse de manter a plataforma
          segura e funcional.
        </p>
      </section>

      <section>
        <h2>4. Compartilhamento e operadores</h2>
        <p>
          Dados podem ser processados pelo Google, para autenticação; Supabase,
          para banco de dados e autenticação; Vercel, para hospedagem; e Cloudflare,
          para DNS e segurança de rede. Cada fornecedor trata dados conforme suas
          próprias políticas e contratos.
        </p>
        <p>
          Dentro dos bolões, participantes podem ver nome, foto, pontuação e,
          somente após o bloqueio da partida, os palpites dos adversários.
          Em bolões marcados como públicos, visitantes também podem ver o nome do
          bolão, seu organizador, quantidade de participantes e ranking, mas não
          recebem códigos de convite nem acesso aos palpites privados.
          As bandeiras das seleções são servidas pelo próprio aplicativo para
          evitar dependência de CDN pública nesse fluxo.
        </p>
      </section>

      <section>
        <h2>5. Cookies, sessão e armazenamento local</h2>
        <p>
          O LaBolita usa cookies estritamente necessários para manter a sessão
          autenticada. Não usamos cookies publicitários. O modo demonstração usa
          armazenamento local para preservar dados apenas naquele navegador.
        </p>
      </section>

      <section>
        <h2>6. Retenção, segurança e transferências</h2>
        <p>
          Os dados são mantidos enquanto a conta ou o bolão estiver ativo e pelo
          período necessário para segurança, suporte e obrigações legais. São
          aplicados controles de acesso, políticas por linha no banco e conexões
          criptografadas. Como os provedores podem operar fora do Brasil, pode
          ocorrer transferência internacional de dados com as proteções adotadas
          por esses fornecedores.
        </p>
      </section>

      <section>
        <h2>7. Seus direitos</h2>
        <p>
          Nos termos da LGPD, você pode solicitar confirmação de tratamento,
          acesso, correção, portabilidade, informação sobre compartilhamento,
          exclusão ou anonimização quando aplicável. Também pode revogar
          permissões do Google na sua conta Google.
        </p>
      </section>

      <section>
        <h2>8. Alterações e contato</h2>
        <p>
          Esta política pode ser atualizada para refletir mudanças do produto ou
          da legislação. Alterações relevantes aparecem no app. Consulte
          também os <Link href="/termos">Termos de Serviço</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
