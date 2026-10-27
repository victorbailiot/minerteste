import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BONUS_TRANSACTION_TYPES } from '@/lib/transaction-types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = BigInt(id)
    
    // Pegar parâmetros da query
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type')

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

    // Verificar se o usuário tem registro unilevel
    const unilevelUser = await prisma.unilevelUser.findUnique({
      where: { userId }
    })

    if (!unilevelUser) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Usuário não possui registro no sistema unilevel'
      })
    }

    // Buscar bonificações unilevel do usuário na tabela transactions
    const bonuses = await prisma.transaction.findMany({
      where: {
        userId,
        type: {
          in: [...BONUS_TRANSACTION_TYPES]
        },
        ...(typeFilter 
          ? { type: typeFilter as any }
          : {}
        )
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sourceUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Formatar resposta
    const formattedBonuses = bonuses.map(bonus => {
      return {
        id: Number(bonus.id),
        type: bonus.type,
        amount: Number(bonus.amount),
        level: bonus.level,
        description: bonus.description,
        createdAt: bonus.createdAt.toISOString(),
        correlationID: bonus.correlationID,
        sourceUser: bonus.sourceUser ? {
          id: Number(bonus.sourceUser.id),
          name: bonus.sourceUser.name,
          email: bonus.sourceUser.email
        } : null,
        sourcePackage: null // Não temos mais essa informação específica
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedBonuses
    })

  } catch (error) {
    console.error('Erro ao buscar bonificações unilevel do usuário:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
