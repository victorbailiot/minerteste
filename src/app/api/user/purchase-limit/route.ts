/**
 * API Route para consultar limite de compra do usuário
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserCurrentPurchaseTotal, getUserRemainingPurchaseLimit, MAX_PURCHASE_LIMIT } from '@/lib/purchase-limit-validator'

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuário não autenticado'
        },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    // 2. Buscar informações de limite
    const currentTotal = await getUserCurrentPurchaseTotal(userId)
    const remainingAmount = await getUserRemainingPurchaseLimit(userId)

    // 3. Retornar informações
    return NextResponse.json({
      success: true,
      data: {
        currentTotal,
        remainingAmount,
        limit: MAX_PURCHASE_LIMIT,
        percentageUsed: (currentTotal / MAX_PURCHASE_LIMIT) * 100
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar limite de compra:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

