/**
 * Integração com Stripe Connect para Transferências Automáticas
 * Gerencia transfers do Stripe Connect para contas conectadas de usuários
 */

import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export interface StripeTransferRequest {
  amount: number // Valor em centavos
  currency: string // Moeda (brl, usd, etc.)
  destination: string // ID da conta conectada do Stripe (stripe_account_id do usuário)
  description?: string
  metadata?: Record<string, string>
  sourceTransaction?: string // ID de uma charge/payment anterior (obrigatório para Brasil)
}

export interface StripeTransferResponse {
  success: boolean
  transferId?: string
  status?: string
  error?: string
  errorCode?: string
}

/**
 * Criar transferência via Stripe Connect
 * Transfere fundos da conta principal para uma conta conectada
 */
export async function createStripeTransfer(
  request: StripeTransferRequest
): Promise<StripeTransferResponse> {
  try {
    console.log('💰 Criando transfer Stripe Connect:', {
      amount: request.amount,
      currency: request.currency,
      destination: request.destination,
      description: request.description
    })

    // Validar que o destination foi fornecido
    if (!request.destination) {
      return {
        success: false,
        error: 'ID da conta de destino (stripe_account_id) é obrigatório',
        errorCode: 'MISSING_DESTINATION'
      }
    }

    // Para transferências no Brasil via Stripe Connect, não podemos usar Top-ups (não suportado)
    // Opções disponíveis:
    // 1. Usar uma charge/payment anterior como source_transaction (se disponível)
    // 2. Usar Payouts da conta principal para a conta conectada
    // 3. Usar Payment Intent com destination (mas requer pagamento do usuário)
    
    // Para saques, a melhor abordagem é usar o saldo disponível da conta principal
    // e fazer um Payout direto, ou buscar uma charge recente para usar como source
    
    let transferId: string
    let transferStatus: string = 'pending'
    
    try {
      // Primeiro, tentar criar transfer direto (pode funcionar se houver saldo disponível)
      const transfer = await stripe.transfers.create({
        amount: request.amount,
        currency: request.currency || 'brl',
        destination: request.destination,
        description: (request.description || 'Transferência de saque - MinerStone').substring(0, 200),
        metadata: {
          source: 'minerstone_withdrawal',
          ...request.metadata
        }
      })
      
      transferId = transfer.id
      transferStatus = 'pending'
      console.log('✅ Transfer Stripe criado diretamente:', transfer.id)
      
    } catch (transferError: any) {
      // Se transfer falhar com erro de source_transaction (requisito do Brasil), buscar uma charge recente
      if (transferError.code === 'transfers_not_allowed' || 
          transferError.message?.includes('source_transaction') ||
          transferError.message?.includes('mandatory') ||
          transferError.code === 'insufficient_funds') {
        console.warn('⚠️ Transfer requer source_transaction no Brasil. Buscando charge recente...')
        
        // Buscar uma charge recente paga para usar como source_transaction
        try {
          const charges = await stripe.charges.list({
            limit: 10 // Buscar mais charges para ter mais opções
          })
          
          // Filtrar charges pagas na moeda correta
          const targetCurrency = request.currency || 'brl'
          const paidCharges = charges.data.filter(
            charge => charge.paid && charge.currency === targetCurrency && charge.status === 'succeeded'
          )
          
          if (paidCharges.length > 0) {
            const recentCharge = paidCharges[0] // Pegar a charge mais recente que foi paga
            console.log('✅ Charge recente encontrada:', recentCharge.id)
            
            const transfer = await stripe.transfers.create({
              amount: request.amount,
              currency: request.currency || 'brl',
              destination: request.destination,
              description: (request.description || 'Transferência de saque - MinerStone').substring(0, 200),
              source_transaction: recentCharge.id,
              metadata: {
                source: 'minerstone_withdrawal',
                source_charge: recentCharge.id,
                ...request.metadata
              }
            })
            
            transferId = transfer.id
            transferStatus = 'pending'
            console.log('✅ Transfer Stripe criado via Charge:', transfer.id)
          } else {
            throw new Error(`Nenhuma charge paga encontrada na moeda ${targetCurrency} para usar como source_transaction`)
          }
        } catch (chargeError: any) {
          // Se tudo falhar, retornar erro informativo sobre a limitação do Brasil
          throw new Error(
            `Não foi possível criar transferência no Brasil. ` +
            `Opções: 1) Garantir saldo suficiente na conta Stripe, ` +
            `2) Ter uma charge/payment recente como source_transaction. ` +
            `Erro: ${chargeError.message || transferError.message}`
          )
        }
      } else {
        throw transferError
      }
    }

    return {
      success: true,
      transferId: transferId!,
      status: transferStatus
    }

  } catch (error: any) {
    console.error('❌ Erro ao criar transfer Stripe:', error)
    
    let errorMessage = 'Erro desconhecido ao criar transferência'
    let errorCode = 'STRIPE_TRANSFER_ERROR'
    
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message
      
      // Tratar erros específicos do Stripe
      if (error.code === 'transfers_not_allowed' || error.message?.includes('source_transaction')) {
        errorMessage = 'Para transferências no Brasil via Stripe Connect, é necessário usar Payouts. A conta conectada precisa estar configurada para receber payouts.'
        errorCode = 'TRANSFERS_NOT_ALLOWED_BR'
      } else if (error.code === 'account_invalid') {
        errorMessage = 'Conta Stripe conectada inválida ou não encontrada'
        errorCode = 'INVALID_ACCOUNT'
      } else if (error.code === 'insufficient_funds') {
        errorMessage = 'Saldo insuficiente na conta principal para realizar a transferência'
        errorCode = 'INSUFFICIENT_FUNDS'
      } else if (error.code === 'invalid_request_error') {
        errorMessage = `Erro na requisição: ${error.message}`
        errorCode = 'INVALID_REQUEST'
      } else if (error.message?.includes('No such account')) {
        errorMessage = 'Conta conectada não encontrada no Stripe. Verifique se o stripe_account_id está correto'
        errorCode = 'ACCOUNT_NOT_FOUND'
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
      errorCode
    }
  }
}

/**
 * Buscar informações de uma transferência
 */
export async function getStripeTransfer(transferId: string): Promise<StripeTransferResponse> {
  try {
    const transfer = await stripe.transfers.retrieve(transferId)

    return {
      success: true,
      transferId: transfer.id,
      status: 'pending' // Transfer é criado como pending, será processado pelo Stripe
    }

  } catch (error) {
    console.error('❌ Erro ao buscar transfer Stripe:', error)
    
    let errorMessage = 'Erro desconhecido'
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Listar transferências do Stripe
 */
export async function listStripeTransfers(options?: {
  limit?: number
  destination?: string
}): Promise<{ success: boolean; transfers?: any[]; error?: string }> {
  try {
    const params: any = {
      limit: options?.limit || 10
    }

    if (options?.destination) {
      params.destination = options.destination
    }

    const transfers = await stripe.transfers.list(params)

    return {
      success: true,
      transfers: transfers.data
    }

  } catch (error) {
    console.error('❌ Erro ao listar transfers Stripe:', error)
    
    let errorMessage = 'Erro desconhecido'
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Finalizar saque de usuário via Stripe Connect Transfer
 * Esta função é chamada quando o admin muda o status do saque para "finalizado"
 */
export async function finalizeWithdrawal(
  withdrawalId: string | number,
  adminId: string | number
): Promise<{ 
  success: boolean
  transferId?: string
  error?: string
  errorCode?: string
  userEmail?: string
  userName?: string
}> {
  try {
    // Buscar transação de saque
    const transaction = await prisma.transaction.findUnique({
      where: { id: BigInt(withdrawalId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            stripeAccountId: true
          }
        }
      }
    })

    // Buscar usuário separadamente se transaction.user não estiver disponível
    let user = transaction?.user
    if (!user && transaction?.userId) {
      user = await prisma.user.findUnique({
        where: { id: transaction.userId },
        select: {
          id: true,
          name: true,
          email: true,
          stripeAccountId: true
        }
      })
    }

    if (!transaction) {
      return { 
        success: false, 
        error: 'Transação de saque não encontrada',
        errorCode: 'TRANSACTION_NOT_FOUND'
      }
    }

    if (transaction.type !== 'WITHDRAWAL') {
      return { 
        success: false, 
        error: 'Transação não é um saque',
        errorCode: 'INVALID_TRANSACTION_TYPE'
      }
    }

    // Verificar se já foi processada
    if (transaction.status === 'COMPLETED') {
      return { 
        success: false, 
        error: 'Saque já foi finalizado anteriormente',
        errorCode: 'ALREADY_COMPLETED'
      }
    }

    if (!user) {
      return { 
        success: false, 
        error: 'Usuário não encontrado para esta transação',
        errorCode: 'USER_NOT_FOUND'
      }
    }

    // Verificar se o usuário possui conta Stripe conectada
    if (!user.stripeAccountId) {
      return { 
        success: false, 
        error: 'Usuário não possui conta Stripe conectada cadastrada. É necessário cadastrar o stripe_account_id antes de processar saques via Stripe Connect.',
        errorCode: 'NO_STRIPE_ACCOUNT',
        userEmail: user.email,
        userName: user.name
      }
    }

    // Converter valor para centavos (Stripe usa centavos)
    const amountInCents = Math.round(Number(transaction.amount) * 100)

    console.log('💳 Processando saque via Stripe Connect Transfer:', {
      transactionId: withdrawalId,
      userId: user.id,
      userName: user.name,
      amount: Number(transaction.amount),
      amountInCents,
      stripeAccountId: user.stripeAccountId
    })

    // Criar transfer via Stripe Connect
    const transferResult = await createStripeTransfer({
      amount: amountInCents,
      currency: 'brl', // BRL para reais brasileiros
      destination: user.stripeAccountId,
      description: `Saque do usuário ${user.name} (ID: ${user.id})`,
      metadata: {
        transaction_id: transaction.id.toString(),
        user_id: user.id.toString(),
        user_name: user.name,
        user_email: user.email || '',
        admin_id: adminId.toString(),
        withdrawal_type: 'user_withdrawal'
      }
    })

    if (!transferResult.success) {
      // Atualizar transação como falhada
      // Limitar descrição a 255 caracteres
      const baseDescription = transaction.description || 'Saque pendente'
      const errorInfo = ` - Erro: ${transferResult.error}`
      const failedDescription = (baseDescription + errorInfo).substring(0, 255)
      
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          description: failedDescription
        }
      })

      return { 
        success: false, 
        error: transferResult.error,
        errorCode: transferResult.errorCode,
        userEmail: transaction.user?.email,
        userName: transaction.user?.name
      }
    }

    // Atualizar transação como concluída com o transfer_id
    // Limitar descrição a 255 caracteres para evitar erro do Prisma
    const baseDescription = transaction.description || 'Saque processado'
    const transferInfo = ` - Transfer: ${transferResult.transferId}`
    const timestamp = ` (${new Date().toISOString().substring(0, 10)})`
    const newDescription = (baseDescription + transferInfo + timestamp).substring(0, 255)
    
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        transferId: transferResult.transferId,
        description: newDescription,
        paidAt: new Date()
      }
    })

    console.log('✅ Saque processado com sucesso via Stripe Connect:', transferResult.transferId)

    // Opcional: Registrar em logs do Stripe
    try {
      await logStripeTransfer({
        transferId: transferResult.transferId!,
        transactionId: transaction.id.toString(),
        userId: user.id.toString(),
        amount: amountInCents,
        currency: 'brl',
        status: 'success'
      })
    } catch (logError) {
      console.warn('⚠️ Erro ao registrar log do Stripe (não crítico):', logError)
    }

    return {
      success: true,
      transferId: transferResult.transferId
    }

  } catch (error) {
    console.error('❌ Erro ao finalizar saque via Stripe Connect:', error)
    
    // Atualizar transação como falhada
    try {
      await prisma.transaction.update({
        where: { id: BigInt(withdrawalId) },
        data: {
          status: 'FAILED',
          description: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        }
      })
    } catch (updateError) {
      console.error('❌ Erro ao atualizar transação:', updateError)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      errorCode: 'INTERNAL_ERROR'
    }
  }
}

/**
 * Verificar saldo disponível no Stripe
 */
export async function getStripeBalance(): Promise<{
  success: boolean
  available?: number
  pending?: number
  currency?: string
  error?: string
}> {
  try {
    const balance = await stripe.balance.retrieve()

    // Somar todos os saldos disponíveis
    const available = balance.available.reduce((total, balanceItem) => {
      return total + balanceItem.amount
    }, 0)

    // Somar todos os saldos pendentes
    const pending = balance.pending.reduce((total, balanceItem) => {
      return total + balanceItem.amount
    }, 0)

    return {
      success: true,
      available,
      pending,
      currency: balance.available[0]?.currency || 'brl'
    }

  } catch (error) {
    console.error('❌ Erro ao buscar saldo Stripe:', error)
    
    let errorMessage = 'Erro desconhecido'
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Interface para log do Stripe
 */
interface StripeLogData {
  transferId: string
  transactionId: string
  userId: string
  amount: number
  currency: string
  status: 'success' | 'failed' | 'pending'
  error?: string
}

/**
 * Registrar log de transferência Stripe
 * Registra todas as transferências Stripe Connect na tabela stripe_logs
 */
async function logStripeTransfer(data: StripeLogData): Promise<void> {
  try {
    // Usar query raw se o modelo não estiver disponível ainda
    await prisma.$executeRaw`
      INSERT INTO stripe_logs (
        "transferId",
        "transactionId",
        "userId",
        amount,
        currency,
        status,
        error,
        "createdAt"
      ) VALUES (
        ${data.transferId},
        ${data.transactionId},
        ${BigInt(data.userId)}::bigint,
        ${(data.amount / 100)}::numeric,
        ${data.currency},
        ${data.status},
        ${data.error || null},
        NOW()
      )
    `.catch(() => {
      // Tabela não existe ou erro - apenas loga no console
      console.log('📝 Log Stripe (console):', data)
    })
    console.log('📝 Log Stripe registrado:', data.transferId)
  } catch (error) {
    // Erro não crítico - apenas loga no console
    console.warn('⚠️ Erro ao registrar log Stripe (não crítico):', error)
    console.log('📝 Log Stripe (console):', data)
  }
}

/**
 * Converter valor para centavos (Stripe usa centavos)
 */
export function convertToCents(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Converter centavos para valor decimal
 */
export function convertFromCents(cents: number): number {
  return cents / 100
}

/**
 * Interface para criação de conta Stripe Connect
 */
export interface CreateStripeConnectAccountRequest {
  email: string
  country?: string // Padrão: 'BR'
  type?: 'express' | 'standard' | 'custom' // Padrão: 'express'
  capabilities?: {
    card_payments?: { requested: boolean }
    transfers?: { requested: boolean }
  }
  business_type?: 'individual' | 'company'
  metadata?: Record<string, string>
}

export interface CreateStripeConnectAccountResponse {
  success: boolean
  accountId?: string
  error?: string
  errorCode?: string
}

/**
 * Criar conta Stripe Connect para um usuário
 * Este é o processo de onboarding básico - cria a conta conectada
 * Para completar o onboarding, será necessário adicionar mais informações depois
 */
export async function createStripeConnectAccount(
  request: CreateStripeConnectAccountRequest
): Promise<CreateStripeConnectAccountResponse> {
  try {
    console.log('🔗 Criando conta Stripe Connect:', {
      email: request.email,
      type: request.type || 'express',
      country: request.country || 'BR'
    })

    // Criar conta conectada via Stripe Connect
    const account = await stripe.accounts.create({
      type: request.type || 'express', // Express é mais simples para onboarding
      country: request.country || 'BR',
      email: request.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }, // Necessário para receber transfers
        ...request.capabilities
      },
      business_type: request.business_type,
      metadata: {
        source: 'minerstone_onboarding',
        ...request.metadata
      }
    })

    console.log('✅ Conta Stripe Connect criada:', account.id)

    return {
      success: true,
      accountId: account.id
    }

  } catch (error: any) {
    console.error('❌ Erro ao criar conta Stripe Connect:', error)
    
    let errorMessage = 'Erro desconhecido ao criar conta Stripe Connect'
    let errorCode = 'STRIPE_ACCOUNT_ERROR'
    
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message
      
      // Tratar erros específicos do Stripe
      if (error.code === 'invalid_request_error') {
        errorMessage = `Erro na requisição: ${error.message}`
        errorCode = 'INVALID_REQUEST'
      } else if (error.code === 'api_key_expired') {
        errorMessage = 'Chave da API Stripe expirada ou inválida'
        errorCode = 'API_KEY_ERROR'
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      success: false,
      error: errorMessage,
      errorCode
    }
  }
}

/**
 * Criar link de onboarding do Stripe Connect (Express)
 * Retorna uma URL para o usuário completar o cadastro
 */
export async function createStripeConnectOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    })

    return {
      success: true,
      url: accountLink.url
    }
  } catch (error: any) {
    console.error('❌ Erro ao criar link de onboarding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar link de onboarding'
    }
  }
}

