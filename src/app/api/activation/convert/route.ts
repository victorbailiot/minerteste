import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processActivationBonusConversion, getUserActivationData } from '@/lib/business-logic'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({
        success: false,
        error: 'Não autenticado'
      }, { status: 401 })
    }

    const userId = BigInt(session.user.id)

    // Verificar se usuário já tem ativação ativa
    const activationData = await getUserActivationData(userId)

    if (activationData.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Usuário já possui ativação ativa'
      }, { status: 400 })
    }

    // Verificar se usuário tem bônus suficiente para conversão
    if (!activationData.canActivate) {
      return NextResponse.json({
        success: false,
        error: 'Saldo insuficiente para ativação. Você precisa ter pelo menos R$ 100,00 em 30% do seu saldo disponível.'
      }, { status: 400 })
    }

    // Processar conversão
    await processActivationBonusConversion(userId)

    // Retornar dados atualizados
    const updatedActivationData = await getUserActivationData(userId)

    return NextResponse.json({
      success: true,
      message: 'Ativação via conversão de bônus realizada com sucesso',
      data: {
        isActive: updatedActivationData.isActive,
        expiresAt: updatedActivationData.expiresAt,
        daysRemaining: updatedActivationData.daysRemaining,
        bonusUsed: Number(updatedActivationData.requiredBonusForActivation),
        totalBonusAccumulated: Number(updatedActivationData.totalBonusAccumulated)
      }
    })
  } catch (error) {
    console.error('Erro ao converter bônus em ativação:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    }, { status: 500 })
  }
} 