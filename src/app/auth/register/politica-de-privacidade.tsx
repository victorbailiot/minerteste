import React from "react";

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-10">
      <div className="max-w-4xl w-full bg-white shadow-2xl rounded-2xl p-10">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">
          Política de Privacidade – <span className="text-yellow-600">MinerStone</span>
        </h1>

        <div className="prose max-w-none text-justify text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-bold">1. Introdução</h2>
            <p>
              A MinerStone valoriza a privacidade e a segurança dos dados de
              seus usuários. Esta Política descreve como as informações são
              coletadas, utilizadas e protegidas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">2. Dados Coletados</h2>
            <p>
              São coletados dados pessoais fornecidos pelo usuário no momento do
              cadastro, bem como informações de uso da plataforma e dados de
              transações financeiras realizadas dentro do sistema.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">3. Bases Legais e Finalidades</h2>
            <ul className="list-disc pl-6">
              <li>
                Execução de contrato: cadastro, gestão de conta, processamento
                de pagamentos e cálculo de benefícios conforme o{" "}
                <b>plano vigente</b>.
              </li>
              <li>
                Cumprimento de obrigações legais: emissão de notas fiscais,
                prevenção à fraude e atendimento à legislação aplicável.
              </li>
              <li>
                Legítimo interesse: melhoria da experiência do usuário,
                comunicações relacionadas ao sistema e suporte técnico.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">4. Compartilhamento de Dados</h2>
            <p>
              Os dados poderão ser compartilhados com parceiros financeiros,
              prestadores de serviço de TI e autoridades competentes, sempre que
              necessário e dentro dos limites da lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">5. Segurança da Informação</h2>
            <p>
              A MinerStone adota medidas técnicas e administrativas adequadas
              para proteger os dados contra acessos não autorizados, perdas ou
              vazamentos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">6. Direitos do Usuário</h2>
            <p>
              O usuário poderá solicitar a qualquer momento: acesso, correção,
              exclusão ou portabilidade de seus dados pessoais, conforme
              legislação aplicável (LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">7. Alterações</h2>
            <p>
              Esta Política poderá ser alterada a qualquer momento, mediante
              publicação da versão atualizada no site da MinerStone.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
