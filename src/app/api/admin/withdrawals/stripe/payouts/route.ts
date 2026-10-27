import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { getStripePayout, listStripePayouts } from '@/lib/stripe-payouts'
import { z } from 'zod'

/**
 * GET /api/admin/withdrawals/stripe/payouts
 * Listar payouts do Stripe
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
      return NextResponse.json({ error: 'Sem permissão para visualizar payouts' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    const result = await listStripePayouts({
      limit,
      status: status || undefined
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    // Formatar payouts para resposta
    const formattedPayouts = result.payouts?.map(payout => ({
      id: payout.id,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      description: payout.description,
      arrivalDate: new Date(payout.arrival_date * 1000),
      createdAt: new Date(payout.created * 1000),
      metadata: payout.metadata
    }))

    return NextResponse.json({
      success: true,
      data: formattedPayouts
    })

  } catch (error) {
    console.error('❌ Erro ao listar payouts Stripe:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

/**
 * GET /api/admin/withdrawals/stripe/payouts/[payoutId]
 * Buscar informações de um payout específico
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'withdrawals.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar payouts' }, { status: 403 })
    }

    const body = await request.json()
    const { payoutId } = body

    if (!payoutId) {
      return NextResponse.json({
        error: 'ID do payout é obrigatório'
      }, { status: 400 })
    }

    const result = await getStripePayout(payoutId)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        payoutId: result.payoutId,
        status: result.status,
        arrivalDate: result.arrivalDate
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar payout Stripe:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
