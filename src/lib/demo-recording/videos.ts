/**
 * Roteiros dos vídeos tutoriais (cartões da equipe de marketing).
 * Arquivo compartilhado entre a página do admin e a API de preparação.
 */

export const DEMO_EMAIL_DOMAIN = '@demo.minerstone.local'
export const DEMO_MAIN_EMAIL = `demo${DEMO_EMAIL_DOMAIN}`

export interface DemoVideo {
  id: number
  title: string
  liberacao: string
  steps: string[]
  startUrl: string
  /** O que o botão "Preparar" faz, em linguagem de roteirista */
  prepareSummary: string
}

export const DEMO_VIDEOS: DemoVideo[] = [
  {
    id: 2,
    title: 'Consultar benefícios e solicitar retirada',
    liberacao: "Creditar saldo simulado em Reais (diferente de zero), preencher histórico de ganhos e desbloquear botões 'Sacar' e 'Transferir'.",
    steps: [
      'Abrir menu financeiro',
      'Identificar valores disponíveis, pendentes e histórico',
      'Abrir opção de retirada',
      'Conferir dados bancários',
      'Informar valor desejado',
      'Revisar solicitação',
      'Confirmar operação',
      'Consultar status',
    ],
    startUrl: '/dashboard/bonus',
    prepareSummary: 'Cria a rede fictícia, lança bônus diretos, indiretos e divisão de lucro dos últimos 90 dias, um saque já pago e outro pendente, cadastra chave PIX e remove bloqueios. Apaga saques feitos em ensaios para liberar o saque do dia. Atenção: o sistema só aceita saque de segunda a sexta; grave em dia útil.',
  },
  {
    id: 3,
    title: 'Adquirir participação ou plano',
    liberacao: 'Disponibilizar planos visíveis na vitrine com valores e formas de pagamento ativas.',
    steps: [
      'Acessar área de produtos/participações',
      'Visualizar opções',
      'Abrir detalhes',
      'Selecionar opção',
      'Informar quantidade/valor',
      'Revisar condições',
      'Escolher forma de pagamento',
      'Confirmar',
      'Localizar comprovante/status',
    ],
    startUrl: '/dashboard/cotas',
    prepareSummary: 'Confere os pacotes ativos com preço, vincula-os às mineradoras de demonstração (a vitrine filtra por mineradora) e garante saldo de bônus para a forma de pagamento "Saldo de Bônus".',
  },
  {
    id: 4,
    title: 'Selecionar unidade/projeto/operação',
    liberacao: 'Cadastrar unidades/projetos de teste com filtros ativos.',
    steps: [
      'Acessar área de seleção',
      'Utilizar filtros',
      'Abrir detalhes de cada opção',
      'Comparar informações oficiais',
      'Fazer seleção',
      'Revisar e confirmar',
    ],
    startUrl: '/dashboard/cotas',
    prepareSummary: 'Cadastra três mineradoras de demonstração (PA, GO e MG) vinculadas a todos os pacotes ativos.',
  },
  {
    id: 5,
    title: 'Cadastrar dados bancários',
    liberacao: 'Acesso liberado ao perfil e área financeira.',
    steps: [
      'Acessar perfil',
      'Abrir área financeira',
      'Selecionar tipo de conta/chave',
      'Preencher campos',
      'Conferir titularidade',
      'Salvar',
      'Verificar confirmação',
    ],
    startUrl: '/dashboard/perfil',
    prepareSummary: 'Remove conta bancária e chave PIX da conta demo para o cadastro começar do zero. A senha financeira continua definida.',
  },
  {
    id: 6,
    title: 'Consultar rede de relacionamento',
    liberacao: 'Inserir conexões diretas e indiretas fictícias com status variados.',
    steps: [
      'Abrir área da rede',
      'Visualizar conexões diretas/indiretas',
      'Utilizar filtros',
      'Consultar status',
      'Abrir detalhes permitidos',
      'Interpretar indicadores',
    ],
    startUrl: '/dashboard/minha-rede',
    prepareSummary: 'Cria 6 diretos e 9 indiretos (3 níveis) com nomes fictícios: ativos com cotas diferentes, inativos e com cota vencida.',
  },
  {
    id: 7,
    title: 'Acompanhar nível de progressão',
    liberacao: 'Ativar nível de progresso com requisitos parciais.',
    steps: [
      'Acessar área de progressão',
      'Identificar nível atual',
      'Consultar requisitos',
      'Verificar indicadores concluídos',
      'Identificar etapas pendentes',
      'Consultar histórico',
    ],
    startUrl: '/dashboard/carreira',
    prepareSummary: 'Gradua a conta demo no primeiro nível de carreira (histórico) e deixa os pontos da rede em cerca de 60% do próximo nível.',
  },
  {
    id: 8,
    title: 'Onde encontrar cupons e campanhas',
    liberacao: 'Cadastrar pelo menos um cupom de teste ativo.',
    steps: [
      'Abrir área de cupons',
      'Diferenciar ativos/utilizados/expirados',
      'Abrir regras',
      'Consultar validade',
      'Copiar/utilizar cupom',
      'Verificar aplicação',
    ],
    startUrl: '/dashboard/cupons',
    prepareSummary: 'Cria uma campanha ativa com 3 cupons da conta demo, uma campanha encerrada (cupons expirados, um deles sorteado) e cupons de desconto da loja: um ativo, um esgotado e um expirado.',
  },
  {
    id: 9,
    title: 'Adicionar foto ao perfil',
    liberacao: 'Acesso ao perfil para upload.',
    steps: [
      'Abrir perfil',
      'Selecionar foto atual/ícone',
      'Escolher arquivo',
      'Ajustar enquadramento',
      'Salvar',
      'Confirmar atualização',
    ],
    startUrl: '/dashboard/perfil',
    prepareSummary: 'Remove as fotos da conta demo para o perfil mostrar o ícone padrão.',
  },
  {
    id: 10,
    title: 'Salvar plataforma na tela inicial',
    liberacao: 'Sistema web responsivo via Chrome/Safari.',
    steps: [
      'Android: abrir no Chrome',
      'Android: menu do navegador › Adicionar à tela inicial',
      'Android: confirmar e localizar o ícone',
      'iPhone: abrir no Safari',
      'iPhone: botão Compartilhar › Adicionar à Tela de Início',
      'iPhone: confirmar e localizar o ícone',
    ],
    startUrl: '/dashboard',
    prepareSummary: 'Não altera dados. Confere se o manifest e os ícones (Android e iPhone) estão publicados.',
  },
  {
    id: 11,
    title: 'Utilizar crédito interno',
    liberacao: 'Inserir saldo de crédito interno simulado e regras visíveis.',
    steps: [
      'Acessar área de crédito',
      'Consultar saldo',
      'Verificar regras/validade',
      'Identificar utilizações permitidas',
      'Selecionar operação',
      'Aplicar crédito',
      'Conferir diferença',
      'Revisar e confirmar',
      'Consultar histórico',
    ],
    startUrl: '/dashboard/credito-minerador',
    prepareSummary: 'Garante saldo de bônus, cria um Crédito Minerador pendente de um direto (código para pagar na gravação) e histórico com um pago e um expirado.',
  },
]
