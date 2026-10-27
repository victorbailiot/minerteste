import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    // Buscar prêmios de carreira do usuário
    const careerPrizes = await prisma.transaction.findMany({
      where: {
        userId,
        type: {
          in: ['CAREER_BONUS', 'CAREER_PRIZE']
        }
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Converter BigInt para string para serialização JSON
    const prizes = careerPrizes.map(prize => ({
      id: prize.id.toString(),
      type: prize.type,
      amount: Number(prize.amount),
      description: prize.description,
      status: prize.status,
      createdAt: prize.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      prizes
    })

  } catch (error) {
    console.error('Erro ao buscar prêmios de carreira:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
