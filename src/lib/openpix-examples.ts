/**
 * Exemplos de uso da biblioteca OpenPix REST API
 * Demonstra como utilizar os principais recursos da API
 */

import { 
  OpenPixAPI, 
  createOpenPixAPI, 
  CreateChargeRequest, 
  CreateWebhookRequest,
  CreatePixKeyRequest 
} from './openpix'
import { 
  ChargeStatus, 
  OPENPIX_CONSTANTS 
} from '../types/openpix'

// ===== CONFIGURAÇÃO BÁSICA =====

/**
 * Exemplo 1: Inicializar a API
 */
const exemploInicializacao = () => {
  // Opção 1: Usar instância padrão (requer variáveis de ambiente)
  // const api = openPixAPI

  // Opção 2: Criar instância personalizada
  const api = createOpenPixAPI({
    appID: 'SEU_APPID_AQUI',
    env: 'sandbox' // ou 'production'
  })

  return api
}

// ===== EXEMPLOS DE COBRANÇAS =====

/**
 * Exemplo 2: Criar uma cobrança PIX simples
 */
const exemploCriarCobrancaSimples = async () => {
  const api = exemploInicializacao()
  
  const dadosCobranca: CreateChargeRequest = {
    correlationID: OpenPixAPI.generateCorrelationID('pedido'),
    value: OpenPixAPI.reaisToCentavos(25.50), // R$ 25,50
    comment: 'Pagamento do pedido #12345'
  }

  try {
    const cobranca = await api.createCharge(dadosCobranca)
    console.log('Cobrança criada:', cobranca.charge.correlationID)
    console.log('QR Code:', cobranca.charge.qrCodeImage)
    console.log('Código Pix Copia e Cola:', cobranca.charge.brCode)
    
    return cobranca
  } catch (error) {
    console.error('Erro ao criar cobrança:', error)
    throw error
  }
}

/**
 * Exemplo 3: Criar uma cobrança PIX com dados completos do cliente
 */
const exemploCriarCobrancaCompleta = async () => {
  const api = exemploInicializacao()
  
  const dadosCobranca: CreateChargeRequest = {
    correlationID: OpenPixAPI.generateCorrelationID('venda'),
    value: OpenPixAPI.reaisToCentavos(150.00), // R$ 150,00
    comment: 'Compra de produto premium',
    identifier: 'PROD-2024-001',
    customer: {
      name: 'João Silva',
      email: 'joao@email.com',
      phone: '11999999999',
      taxID: '12345678901',
      address: {
        zipcode: '01310-100',
        street: 'Avenida Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        complement: 'Apt 123'
      }
    },
    additionalInfo: [
      { key: 'produto', value: 'Curso Premium' },
      { key: 'desconto', value: '10%' }
    ],
    expiresIn: 3600 // 1 hora
  }

  try {
    const cobranca = await api.createCharge(dadosCobranca)
    console.log('Cobrança completa criada:', cobranca.charge)
    return cobranca
  } catch (error) {
    console.error('Erro ao criar cobrança completa:', error)
    throw error
  }
}

/**
 * Exemplo 4: Buscar uma cobrança por correlationID
 */
const exemploBuscarCobranca = async (correlationID: string) => {
  const api = exemploInicializacao()
  
  try {
    const cobranca = await api.getChargeByCorrelationID(correlationID)
    console.log('Status da cobrança:', cobranca.charge.status)
    
    switch (cobranca.charge.status) {
      case 'ACTIVE':
        console.log('Cobrança aguardando pagamento')
        break
      case 'COMPLETED':
        console.log('Cobrança paga com sucesso!')
        break
      case 'EXPIRED':
        console.log('Cobrança expirada')
        break
    }
    
    return cobranca
  } catch (error) {
    console.error('Erro ao buscar cobrança:', error)
    throw error
  }
}

/**
 * Exemplo 5: Listar cobranças com filtros
 */
const exemploListarCobrancas = async () => {
  const api = exemploInicializacao()
  
  try {
    // Listar últimas 20 cobranças
    const cobrancas = await api.listCharges(0, 20)
    
    console.log(`Total de cobranças: ${cobrancas.pageInfo.totalCount}`)
    
    cobrancas.charges.forEach(cobranca => {
      console.log(`${cobranca.correlationID}: ${cobranca.status} - R$ ${OpenPixAPI.centavosToReais(cobranca.value)}`)
    })
    
    return cobrancas
  } catch (error) {
    console.error('Erro ao listar cobranças:', error)
    throw error
  }
}

// ===== EXEMPLOS DE WEBHOOKS =====

/**
 * Exemplo 6: Criar webhook para eventos de cobrança
 */
const exemploCriarWebhook = async () => {
  const api = exemploInicializacao()
  
  const dadosWebhook: CreateWebhookRequest = {
    webhook: {
      name: 'Webhook de Pagamentos',
      event: 'OPENPIX:CHARGE_COMPLETED',
      url: 'https://meusite.com/webhook/openpix',
      authorization: 'Bearer meu-token-secreto',
      isActive: true
    }
  }

  try {
    const webhook = await api.createWebhook(dadosWebhook)
    console.log('Webhook criado:', webhook.webhook.id)
    return webhook
  } catch (error) {
    console.error('Erro ao criar webhook:', error)
    throw error
  }
}

/**
 * Exemplo 7: Listar todos os webhooks
 */
const exemploListarWebhooks = async () => {
  const api = exemploInicializacao()
  
  try {
    const webhooks = await api.listWebhooks()
    
    webhooks.webhooks.forEach(webhook => {
      console.log(`${webhook.name}: ${webhook.event} -> ${webhook.url}`)
      console.log(`Ativo: ${webhook.isActive}`)
    })
    
    return webhooks
  } catch (error) {
    console.error('Erro ao listar webhooks:', error)
    throw error
  }
}

// ===== EXEMPLOS DE CHAVES PIX =====

/**
 * Exemplo 8: Criar chave PIX aleatória
 */
const exemploCriarChavePixAleatoria = async () => {
  const api = exemploInicializacao()
  
  const dadosChave: CreatePixKeyRequest = {
    type: 'RANDOM'
  }

  try {
    const chave = await api.createPixKey(dadosChave)
    console.log('Chave PIX criada:', chave.pixKey.key)
    return chave
  } catch (error) {
    console.error('Erro ao criar chave PIX:', error)
    throw error
  }
}

/**
 * Exemplo 9: Criar chave PIX com email
 */
const exemploCriarChavePixEmail = async (email: string) => {
  const api = exemploInicializacao()
  
  // Validar email antes de enviar
  if (!OpenPixAPI.isValidEmail(email)) {
    throw new Error('Email inválido')
  }
  
  const dadosChave: CreatePixKeyRequest = {
    type: 'EMAIL',
    key: email
  }

  try {
    const chave = await api.createPixKey(dadosChave)
    console.log('Chave PIX de email criada:', chave.pixKey.key)
    return chave
  } catch (error) {
    console.error('Erro ao criar chave PIX de email:', error)
    throw error
  }
}

// ===== EXEMPLOS DE SALDO E TRANSAÇÕES =====

/**
 * Exemplo 10: Consultar saldo da conta
 */
const exemploConsultarSaldo = async () => {
  const api = exemploInicializacao()
  
  try {
    const saldo = await api.getBalance()
    console.log(`Saldo atual: R$ ${OpenPixAPI.centavosToReais(saldo.balance)}`)
    return saldo
  } catch (error) {
    console.error('Erro ao consultar saldo:', error)
    throw error
  }
}

/**
 * Exemplo 11: Listar transações recentes
 */
const exemploListarTransacoes = async () => {
  const api = exemploInicializacao()
  
  try {
    const transacoes = await api.listTransactions(0, 10)
    
    console.log(`Total de transações: ${transacoes.pageInfo.totalCount}`)
    
    transacoes.transactions.forEach(transacao => {
      console.log(`${transacao.transactionID}: R$ ${OpenPixAPI.centavosToReais(transacao.value)} - ${transacao.time}`)
    })
    
    return transacoes
  } catch (error) {
    console.error('Erro ao listar transações:', error)
    throw error
  }
}

// ===== EXEMPLOS DE WEBHOOK HANDLERS =====

/**
 * Exemplo 12: Handler para processar webhook de pagamento
 */
const exemploProcessarWebhookPagamento = (req: any, res: any) => {
  try {
    const payload = req.body
    
    // Validar se é um payload válido da OpenPix
    if (!OpenPixAPI.validateWebhookPayload(payload)) {
      return res.status(400).json({ error: 'Payload inválido' })
    }
    
    // Processar evento de cobrança completada
    if (payload.event === 'OPENPIX:CHARGE_COMPLETED') {
      const cobranca = payload.charge
      
      console.log(`Pagamento recebido!`)
      console.log(`CorrelationID: ${cobranca.correlationID}`)
      console.log(`Valor: R$ ${OpenPixAPI.centavosToReais(cobranca.value)}`)
      console.log(`Cliente: ${cobranca.customer?.name}`)
      
      // Aqui você pode:
      // - Atualizar status do pedido no banco de dados
      // - Enviar email de confirmação
      // - Liberar produto/serviço
      // - Etc.
      
      // Exemplo de atualização no banco (pseudo-código)
      // await updateOrderStatus(cobranca.correlationID, 'PAID')
      // await sendConfirmationEmail(cobranca.customer.email)
    }
    
    // Sempre retornar 200 para confirmar recebimento
    res.status(200).json({ success: true })
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// ===== EXEMPLOS DE UTILITÁRIOS =====

/**
 * Exemplo 13: Validações e utilitários
 */
const exemploUtilitarios = () => {
  // Gerar correlationID único
  const correlationID = OpenPixAPI.generateCorrelationID('pedido')
  console.log('CorrelationID:', correlationID)
  
  // Converter valores
  const valorReais = 99.90
  const valorCentavos = OpenPixAPI.reaisToCentavos(valorReais)
  const voltaReais = OpenPixAPI.centavosToReais(valorCentavos)
  console.log(`R$ ${valorReais} = ${valorCentavos} centavos = R$ ${voltaReais}`)
  
  // Validar CPF/CNPJ
  const cpf = '12345678901'
  const cnpj = '12345678000123'
  console.log(`CPF ${cpf} válido:`, OpenPixAPI.isValidTaxID(cpf))
  console.log(`CNPJ ${cnpj} válido:`, OpenPixAPI.isValidTaxID(cnpj))
  
  // Validar email
  const email = 'teste@email.com'
  console.log(`Email ${email} válido:`, OpenPixAPI.isValidEmail(email))
  
  // Constantes úteis
  console.log('Valor mínimo:', OPENPIX_CONSTANTS.MIN_VALUE_CENTAVOS)
  console.log('Valor máximo:', OPENPIX_CONSTANTS.MAX_VALUE_CENTAVOS)
  console.log('Expiração padrão:', OPENPIX_CONSTANTS.DEFAULT_EXPIRATION_SECONDS)
}

// ===== EXEMPLO COMPLETO DE FLUXO DE PAGAMENTO =====

/**
 * Exemplo 14: Fluxo completo de pagamento
 */
const exemploFluxoCompletoPagamento = async (dadosPedido: {
  valorReais: number
  descricao: string
  cliente: {
    nome: string
    email: string
    telefone?: string
  }
}) => {
  const api = exemploInicializacao()
  
  try {
    // 1. Criar cobrança
    console.log('1. Criando cobrança...')
    const cobranca = await api.createCharge({
      correlationID: OpenPixAPI.generateCorrelationID('pedido'),
      value: OpenPixAPI.reaisToCentavos(dadosPedido.valorReais),
      comment: dadosPedido.descricao,
      customer: {
        name: dadosPedido.cliente.nome,
        email: dadosPedido.cliente.email,
        phone: dadosPedido.cliente.telefone
      },
      expiresIn: 1800 // 30 minutos
    })
    
    console.log('Cobrança criada com sucesso!')
    console.log('QR Code:', cobranca.charge.qrCodeImage)
    console.log('Pix Copia e Cola:', cobranca.charge.brCode)
    
    // 2. Simular verificação periódica do status
    console.log('2. Aguardando pagamento...')
    
    // Em uma aplicação real, você usaria webhooks
    // Aqui é apenas um exemplo de como verificar o status
    const verificarPagamento = async () => {
      const status = await api.getChargeByCorrelationID(cobranca.charge.correlationID)
      
      if (status.charge.status === ChargeStatus.COMPLETED) {
        console.log('✅ Pagamento confirmado!')
        return true
      } else if (status.charge.status === ChargeStatus.EXPIRED) {
        console.log('❌ Cobrança expirada')
        return false
      }
      
      console.log('⏳ Ainda aguardando pagamento...')
      return null
    }
    
    // Verificar a cada 10 segundos (apenas para exemplo)
    const interval = setInterval(async () => {
      const resultado = await verificarPagamento()
      if (resultado !== null) {
        clearInterval(interval)
      }
    }, 10000)
    
    return cobranca
    
  } catch (error) {
    console.error('Erro no fluxo de pagamento:', error)
    throw error
  }
}

// ===== EXPORTS =====

export {
  exemploInicializacao,
  exemploCriarCobrancaSimples,
  exemploCriarCobrancaCompleta,
  exemploBuscarCobranca,
  exemploListarCobrancas,
  exemploCriarWebhook,
  exemploListarWebhooks,
  exemploCriarChavePixAleatoria,
  exemploCriarChavePixEmail,
  exemploConsultarSaldo,
  exemploListarTransacoes,
  exemploProcessarWebhookPagamento,
  exemploUtilitarios,
  exemploFluxoCompletoPagamento
} 