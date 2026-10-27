import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = BigInt(id)

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 })
    }

    // Buscar saques do usuário na tabela Transaction
    const withdrawals = await prisma.transaction.findMany({
      where: {
        userId: userId,
        type: 'WITHDRAWAL'
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        paidAt: true
      }
    })

    // Formatar resposta
    const formattedWithdrawals = withdrawals.map(withdrawal => ({
      id: Number(withdrawal.id),
      amount: Number(withdrawal.amount),
      status: withdrawal.status,
      description: withdrawal.description,
      requestedAt: withdrawal.createdAt.toISOString(),
      processedAt: withdrawal.paidAt?.toISOString() || (withdrawal.status === 'COMPLETED' ? withdrawal.updatedAt.toISOString() : undefined)
    }))

    return NextResponse.json({
      success: true,
      data: formattedWithdrawals
    })

  } catch (error) {
    console.error('Erro ao buscar saques do usuário:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 