import React from "react";

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-10">
      <div className="max-w-4xl w-full bg-white shadow-2xl rounded-2xl p-10">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">
          Termos de Uso – <span className="text-yellow-600">MinerStone</span>
        </h1>

        <div className="prose max-w-none text-justify text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-bold">1. Aceitação dos Termos</h2>
            <p>
              Ao se cadastrar e utilizar os serviços da <b>MinerStone</b>, o
              usuário, doravante denominado <b>Minerador</b>, declara estar de
              acordo com os presentes Termos de Uso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">2. Objeto</h2>
            <p>
              A MinerStone oferece pacotes de adesão com benefícios e
              bonificações de acordo com o plano vigente. As condições podem ser
              ajustadas periodicamente e estarão sempre disponíveis no site
              oficial e no backoffice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">3. Cadastro e Responsabilidades do Usuário</h2>
            <ul className="list-disc pl-6">
              <li>Fornecer informações verdadeiras e atualizadas no cadastro.</li>
              <li>
                Manter em dia os pagamentos relacionados ao pacote escolhido e
                reativações periódicas.
              </li>
              <li>
                Utilizar a marca MinerStone de forma ética, sem práticas de
                fraude, spam ou enganos.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">4. Bonificações</h2>
            <p>
              As bonificações são calculadas e distribuídas conforme o{" "}
              <b>plano vigente</b>, incluindo indicação direta, indireta, bônus
              de reativações e progressão de carreira. As regras podem ser
              atualizadas periodicamente pela empresa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">5. Reativações</h2>
            <p>
              Para manter o acesso aos benefícios e bonificações, o Minerador
              deve realizar a reativação periódica do plano vigente. Os valores
              são definidos pela MinerStone e podem ser atualizados mediante
              comunicação prévia no sistema.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">6. Divisão de Lucros da Mineradora</h2>
            <p>
              A distribuição de lucros aos usuários decorre{" "}
              <b>exclusivamente do resultado real</b> das operações da mineradora,
              em percentuais definidos pelo plano vigente e adicionais por
              graduação, quando aplicável.
            </p>
            <p>
              A apuração e divulgação dos resultados são realizadas de forma
              periódica e transparente pela MinerStone, e somente após a
              efetiva geração de receita proveniente das operações de mineração e
              comercialização de metais.
            </p>
            <ul className="list-disc pl-6">
              <li>
                A divisão de lucros <b>não é imediata</b> e somente ocorrerá após
                o início efetivo das operações da mineradora.
              </li>
              <li>
                O prazo até a primeira distribuição poderá variar, considerando
                o tempo necessário para investimentos, estruturação e início das
                atividades da empresa.
              </li>
              <li>
                Não há qualquer garantia de rentabilidade futura, pois os
                resultados dependem do desempenho econômico da mineradora e do
                mercado de metais.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">7. Rescisão</h2>
            <p>
              O usuário poderá encerrar sua participação a qualquer momento. A
              empresa reserva-se o direito de rescindir o contrato em caso de
              fraude, má conduta ou descumprimento dos presentes termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">8. Disposições Finais</h2>
            <p>
              Os presentes termos entram em vigor a partir do aceite digital no
              momento do cadastro. O foro eleito para dirimir eventuais conflitos
              é o da sede da empresa.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
