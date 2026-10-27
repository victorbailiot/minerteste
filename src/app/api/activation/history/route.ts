import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    const activationHistory = await prisma.userActivation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        bonusUsed: true,
        conversionPercent: true,
        activatedAt: true,
        expiresAt: true,
        status: true,
        createdAt: true
      }
    })

    // Converter BigInt para Number para JSON
    const formattedHistory = activationHistory.map(activation => ({
      id: Number(activation.id),
      type: activation.type,
      amount: Number(activation.amount),
      bonusUsed: activation.bonusUsed ? Number(activation.bonusUsed) : null,
      conversionPercent: activation.conversionPercent ? Number(activation.conversionPercent) : null,
      activatedAt: activation.activatedAt,
      expiresAt: activation.expiresAt,
      status: activation.status,
      createdAt: activation.createdAt
    }))

    // Estatísticas do histórico
    const stats = {
      totalActivations: activationHistory.length,
      activeActivations: activationHistory.filter(a => a.status === 'ACTIVE').length,
      expiredActivations: activationHistory.filter(a => a.status === 'EXPIRED').length,
      totalAmountPaid: activationHistory.reduce((sum, a) => sum + Number(a.amount), 0),
      totalBonusUsed: activationHistory.reduce((sum, a) => sum + (a.bonusUsed ? Number(a.bonusUsed) : 0), 0),
      pixActivations: activationHistory.filter(a => a.type === 'PIX').length,
      bonusActivations: activationHistory.filter(a => a.type === 'BONUS_CONVERSION').length
    }

    return NextResponse.json({
      success: true,
      data: {
        history: formattedHistory,
        stats
      }
    })
  } catch (error) {
    console.error('Erro ao buscar histórico de ativações:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 