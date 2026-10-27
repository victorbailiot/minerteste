import React from "react";

export default function ContratoPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-10">
      <div className="max-w-4xl w-full bg-white shadow-2xl rounded-2xl p-10">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-6">
          Contrato de Adesão – <span className="text-yellow-600">TectonMiner</span>
        </h1>

        <div className="prose max-w-none text-justify text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-800">Cláusula 1ª – Das Partes Envolvidas</h2>
            <p>
              Este contrato é firmado entre: <b>TECTONMINER</b>, empresa de mineração e
              tecnologia, doravante denominada <b>EMPRESA</b>, e o <b>USUÁRIO</b>,
              doravante denominado <b>MINERADOR</b>, que ao marcar “Li e Aceito”
              concorda com todos os termos aqui estabelecidos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800">Cláusula 2ª – Do Objeto</h2>
            <p>
              O presente contrato tem como objeto a adesão do MINERADOR aos pacotes de
              participação da TECTONMINER (Átomo, Núcleo ou Tecton), que concedem acesso
              a benefícios, bonificações e participação nos resultados, conforme plano
              de negócios vigente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800">Cláusula 3ª – Responsabilidades do Minerador</h2>
            <ul className="list-disc pl-6">
              <li>Fornecer informações verdadeiras no cadastro.</li>
              <li>
                Realizar o pagamento do pacote escolhido e das reativações mensais,
                conforme valores estabelecidos.
              </li>
              <li>
                Respeitar a política de conduta da EMPRESA, não utilizando o nome da
                TECTONMINER de forma indevida.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800">Cláusula 4ª – Responsabilidades da Empresa</h2>
            <ul className="list-disc pl-6">
              <li>
                Disponibilizar acesso ao sistema online para acompanhamento de pacotes,
                bonificações e pontos.
              </li>
              <li>
                Pagar corretamente as bonificações e participações de lucro conforme
                plano vigente.
              </li>
              <li>
                Garantir a transparência na divulgação dos resultados de mineração e
                distribuição dos percentuais destinados aos mineradores.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800">Cláusula 5ª – Bonificações e Participação de Lucros</h2>
            <p>
              As bonificações seguem as regras definidas no <b>plano unilevel</b>,
              considerando indicação direta, indireta, bônus de reativações e plano de
              carreira. A participação nos lucros da mineração será distribuída
              mensalmente de acordo com o pacote adquirido pelo MINERADOR e seu nível de
              carreira.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800">Cláusula 6ª – Reativações</h2>
            <p>
              O MINERADOR concorda com o pagamento da reativação mensal do pacote
              adquirido (valores fixos de R$ 29,90; R$ 69,90; ou R$ 99,90, conforme o
              plano). As reativações são obrigatórias para manutenção dos benefícios e
              recebimento de bonificações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800">Cláusula 7ª – Rescisão</h2>
            <ul className="list-disc pl-6">
              <li>
                O MINERADOR poderá encerrar sua participação a qualquer momento,
                mediante solicitação no sistema, sem direito à devolução dos valores já
                pagos.
              </li>
              <li>
                A EMPRESA poderá rescindir o contrato em caso de fraude, má conduta ou
                descumprimento das regras deste contrato.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800">Cláusula 8ª – Disposições Finais</h2>
            <p>
              O MINERADOR declara estar ciente de que os resultados podem variar
              conforme o desempenho da rede, adesão de novos mineradores e lucros da
              mineração. Este contrato tem validade a partir da data de aceite digital
              no cadastro. O foro eleito para dirimir quaisquer questões oriundas deste
              contrato é o da sede da EMPRESA.
            </p>
          </section>
        </div>


      </div>
    </div>
  );
}
