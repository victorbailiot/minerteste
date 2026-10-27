import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { processUserWithdrawal, getStripeBalance } from '@/lib/stripe-payouts'
import { z } from 'zod'

// Schema para processar saque via Stripe
const processStripeWithdrawalSchema = z.object({
  withdrawalId: z.string().min(1, 'ID do saque é obrigatório'),
  action: z.enum(['complete']),
  confirmPayment: z.boolean().optional()
})

/**
 * POST /api/admin/withdrawals/stripe
 * Processar saque via Stripe Payouts
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'withdrawals.approve')) {
      return NextResponse.json({ error: 'Sem permissão para processar saques' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = processStripeWithdrawalSchema.parse(body)

    console.log('💰 Processando saque via Stripe:', {
      withdrawalId: validatedData.withdrawalId,
      adminId: user.id,
      action: validatedData.action
    })

    // Verificar saldo disponível no Stripe antes de processar
    const balanceCheck = await getStripeBalance()
    if (!balanceCheck.success) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar saldo Stripe: ' + balanceCheck.error
      }, { status: 500 })
    }

    console.log('💳 Saldo Stripe disponível:', {
      available: balanceCheck.available,
      pending: balanceCheck.pending,
      currency: balanceCheck.currency
    })

    // Processar saque via Stripe
    const result = await processUserWithdrawal(validatedData.withdrawalId, user.id)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Saque processado com sucesso via Stripe',
      data: {
        payoutId: result.payoutId,
        withdrawalId: validatedData.withdrawalId,
        processedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: error.issues
      }, { status: 400 })
    }

    console.error('❌ Erro ao processar saque via Stripe:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

/**
 * GET /api/admin/withdrawals/stripe/balance
 * Verificar saldo disponível no Stripe
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'withdrawals.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar saldo' }, { status: 403 })
    }

    const balanceCheck = await getStripeBalance()

    if (!balanceCheck.success) {
      return NextResponse.json({
        success: false,
        error: balanceCheck.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        available: balanceCheck.available,
        pending: balanceCheck.pending,
        currency: balanceCheck.currency,
        availableFormatted: ((balanceCheck.available || 0) / 100).toFixed(2),
        pendingFormatted: ((balanceCheck.pending || 0) / 100).toFixed(2)
      }
    })

  } catch (error) {
    console.error('❌ Erro ao verificar saldo Stripe:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
