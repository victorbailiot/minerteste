import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'ID de usuário inválido' },
        { status: 400 }
      )
    }

    const activations = await prisma.userActivation.findMany({
      where: { userId: userId },
      orderBy: { activatedAt: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        bonusUsed: true,
        conversionPercent: true,
        activatedAt: true,
        expiresAt: true,
        status: true,
        correlationID: true,
        transactionId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const formattedActivations = activations.map(activation => ({
      ...activation,
      id: Number(activation.id),
      amount: Number(activation.amount),
      bonusUsed: activation.bonusUsed ? Number(activation.bonusUsed) : null,
      conversionPercent: activation.conversionPercent ? Number(activation.conversionPercent) : null,
      transactionId: activation.transactionId ? Number(activation.transactionId) : null,
      activatedAt: activation.activatedAt.toISOString(),
      expiresAt: activation.expiresAt.toISOString(),
      createdAt: activation.createdAt.toISOString(),
      updatedAt: activation.updatedAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: formattedActivations
    })

  } catch (error) {
    console.error('Erro ao buscar ativações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 