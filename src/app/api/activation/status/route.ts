import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserActivationData } from '@/lib/business-logic'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isUserActive } from '@/lib/business-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Não autenticado' 
      }, { status: 401 })
    }

    const userId = BigInt(session.user.id)

    const activationData = await getUserActivationData(userId)
    const isActive = await isUserActive(userId)

    console.log('API - activationData.expiresAt:', activationData.expiresAt)
    console.log('API - activationData.daysRemaining:', activationData.daysRemaining)
    console.log('API - activationData.isActive:', activationData.isActive)

    return NextResponse.json({
      success: true,
      data: {
        isActive: isActive,
        expiresAt: activationData.expiresAt ? activationData.expiresAt.toISOString() : null,
        daysRemaining: activationData.daysRemaining,
        canActivate: activationData.canActivate,
        totalBonusAccumulated: Number(activationData.totalBonusAccumulated),
        availableBalance: Number(activationData.availableBalance),
        requiredBonusForActivation: Number(activationData.requiredBonusForActivation),
        bonusConversionPercent: Number(activationData.bonusConversionPercent),
        reactivationAmount: Number(activationData.reactivationAmount)
      }
    })
  } catch (error) {
    console.error('Erro ao obter status de ativação:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 