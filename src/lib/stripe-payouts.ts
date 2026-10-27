/**
 * Integração com Stripe Payouts para Sistema de Saques
 * Gerencia pagamentos de bônus para mineradores via Stripe
 */

import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export interface StripePayoutRequest {
  amount: number // Valor em centavos
  currency: string // Moeda (usd, brl, etc.)
  description?: string
  metadata?: Record<string, string>
  destination?: string // ID da conta bancária no Stripe
}

export interface StripePayoutResponse {
  success: boolean
  payoutId?: string
  status?: string
  arrivalDate?: Date
  error?: string
  errorCode?: string
  userEmail?: string
  userName?: string
}

export interface BankAccountInfo {
  accountNumber: string
  routingNumber?: string
  accountHolderName: string
  accountHolderType: 'individual' | 'company'
  country: string
  currency: string
}

/**
 * Criar payout via Stripe
 */
export async function createStripePayout(
  request: StripePayoutRequest
): Promise<StripePayoutResponse> {
  try {
    console.log('💰 Criando payout Stripe:', {
      amount: request.amount,
      currency: request.currency,
      description: request.description
    })

    const payout = await stripe.payouts.create({
      amount: request.amount,
      currency: request.currency,
      description: request.description || 'Pagamento de bônus - MinerStone',
      metadata: {
        source: 'minerstone_payout',
        ...request.metadata
      },
      method: 'standard', // Método padrão para transferências bancárias
      ...(request.destination && { destination: request.destination })
    })

    console.log('✅ Payout Stripe criado:', payout.id)

    return {
      success: true,
      payoutId: payout.id,
      status: payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000)
    }

  } catch (error: any) {
    console.error('❌ Erro ao criar payout Stripe:', error)
    
    let errorMessage = 'Erro desconhecido'
    let errorCode = 'STRIPE_ERROR'
    
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = error.message
      
      // Tratar erros específicos do Stripe
      if (error.message?.includes('manual payout plan in country BR')) {
        errorMessage = 'Conta Stripe configurada com plano manual no Brasil. É necessário alterar para plano automático nas configurações da conta Stripe.'
        errorCode = 'MANUAL_PAYOUT_PLAN_BR'
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Saldo insuficiente na conta Stripe para processar o payout.'
        errorCode = 'INSUFFICIENT_FUNDS'
      } else if (error.message?.includes('account not found')) {
        errorMessage = 'Conta Stripe não encontrada ou não configurada corretamente.'
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
 * Buscar informações de um payout
 */
export async function getStripePayout(payoutId: string): Promise<StripePayoutResponse> {
  try {
    const payout = await stripe.payouts.retrieve(payoutId)

    return {
      success: true,
      payoutId: payout.id,
      status: payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000)
    }

  } catch (error) {
    console.error('❌ Erro ao buscar payout Stripe:', error)
    
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
 * Listar payouts do Stripe
 */
export async function listStripePayouts(options?: {
  limit?: number
  status?: string
}): Promise<{ success: boolean; payouts?: any[]; error?: string }> {
  try {
    const params: any = {
      limit: options?.limit || 10
    }

    if (options?.status) {
      params.status = options.status
    }

    const payouts = await stripe.payouts.list(params)

    return {
      success: true,
      payouts: payouts.data
    }

  } catch (error) {
    console.error('❌ Erro ao listar payouts Stripe:', error)
    
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
 * Cancelar payout (apenas se ainda estiver pendente)
 */
export async function cancelStripePayout(payoutId: string): Promise<StripePayoutResponse> {
  try {
    const payout = await stripe.payouts.cancel(payoutId)

    return {
      success: true,
      payoutId: payout.id,
      status: payout.status
    }

  } catch (error) {
    console.error('❌ Erro ao cancelar payout Stripe:', error)
    
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
 * Processar saque de usuário via Stripe Payout
 */
export async function processUserWithdrawal(
  transactionId: string,
  adminId: string
): Promise<{ success: boolean; payoutId?: string; error?: string; errorCode?: string; userEmail?: string; userName?: string }> {
  try {
    // Buscar transação de saque
    const transaction = await prisma.transaction.findUnique({
      where: { id: BigInt(transactionId) },
      include: {
        user: {
          include: {
            bankAccount: true
          }
        }
      }
    })

    if (!transaction) {
      return { success: false, error: 'Transação não encontrada' }
    }

    if (transaction.type !== 'WITHDRAWAL') {
      return { success: false, error: 'Transação não é um saque' }
    }

    if (transaction.status !== 'PENDING') {
      return { success: false, error: 'Transação já foi processada' }
    }

    if (!transaction.user) {
      return { success: false, error: 'Usuário da transação não encontrado' }
    }

    const txUser = transaction.user
    const bankRow = txUser.bankAccount
    if (!bankRow || bankRow.excludedAt) {
      return { 
        success: false, 
        error: 'Usuário não possui conta bancária cadastrada. É necessário cadastrar uma conta bancária antes de processar saques via Stripe.',
        errorCode: 'NO_BANK_ACCOUNT',
        userEmail: txUser.email,
        userName: txUser.name
      }
    }

    const bankAccount = bankRow

    // Converter valor para centavos (Stripe usa centavos)
    const amountInCents = Math.round(Number(transaction.amount) * 100)

    // Determinar moeda (padrão USD para Stripe)
    const currency = 'usd'

    console.log('💳 Processando saque via Stripe:', {
      userId: txUser.id,
      userName: txUser.name,
      amount: Number(transaction.amount),
      amountInCents,
      currency,
      bankAccount: bankAccount.accountNumber
    })

    // Criar payout via Stripe
    const payoutResult = await createStripePayout({
      amount: amountInCents,
      currency,
      description: `Pagamento de bônus - ${txUser.name}`,
      metadata: {
        transaction_id: transaction.id.toString(),
        user_id: txUser.id.toString(),
        user_name: txUser.name,
        user_email: txUser.email,
        admin_id: adminId,
        withdrawal_type: 'bonus_payment'
      },
      destination: undefined // Stripe usará a conta padrão configurada
    })

    if (!payoutResult.success) {
      // Atualizar transação como falhada
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          description: transaction.description + ` - Erro Stripe: ${payoutResult.error}`
        }
      })

      return { success: false, error: payoutResult.error }
    }

    // Atualizar transação como concluída
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'COMPLETED',
        transferId: payoutResult.payoutId,
        description: transaction.description + ` - Payout Stripe: ${payoutResult.payoutId}`,
        paidAt: new Date()
      }
    })

    console.log('✅ Saque processado com sucesso via Stripe:', payoutResult.payoutId)

    return {
      success: true,
      payoutId: payoutResult.payoutId
    }

  } catch (error) {
    console.error('❌ Erro ao processar saque via Stripe:', error)
    
    // Atualizar transação como falhada
    try {
      await prisma.transaction.update({
        where: { id: BigInt(transactionId) },
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
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
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
      currency: balance.available[0]?.currency || 'usd'
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
 * Converter valor para centavos (Stripe)
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
