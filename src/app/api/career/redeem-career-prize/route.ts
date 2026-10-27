import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const redeemPrizeSchema = z.object({
  choice: z.enum(['PHYSICAL', 'CASH'])
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    const body = await request.json()
    const parsed = redeemPrizeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Escolha inválida. Use PHYSICAL ou CASH.' },
        { status: 400 }
      )
    }

    const { choice } = parsed.data

    const lastGraduation = await prisma.unilevelUserCareer.findFirst({
      where: { userId },
      include: {
        career: {
          select: {
            id: true,
            name: true,
            hasPrizeChoice: true,
            careerPrizeValue: true
          }
        }
      },
      orderBy: { graduatedAt: 'desc' }
    })

    if (!lastGraduation) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma graduação encontrada.' },
        { status: 400 }
      )
    }

    if (!lastGraduation.career.hasPrizeChoice) {
      return NextResponse.json(
        { success: false, error: 'Este nível não oferece opção de resgate de prêmio.' },
        { status: 400 }
      )
    }

    if (lastGraduation.prizeChoice) {
      return NextResponse.json(
        { success: false, error: 'Você já realizou a escolha do prêmio anteriormente.' },
        { status: 400 }
      )
    }

    if (choice === 'CASH') {
      const careerPrizeValue = lastGraduation.career.careerPrizeValue
      if (!careerPrizeValue || careerPrizeValue.toNumber() <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valor do prêmio em dinheiro não configurado para este nível.' },
          { status: 400 }
        )
      }

      await prisma.$transaction([
        prisma.unilevelUserCareer.update({
          where: { id: lastGraduation.id },
          data: { prizeChoice: 'CASH' }
        }),
        prisma.transaction.create({
          data: {
            userId,
            type: 'CAREER_BONUS',
            amount: careerPrizeValue,
            description: `Bônus de Carreira - ${lastGraduation.career.name} (prêmio em dinheiro)`,
            status: 'COMPLETED'
          }
        })
      ])
    } else {
      await prisma.unilevelUserCareer.update({
        where: { id: lastGraduation.id },
        data: { prizeChoice: 'PHYSICAL' }
      })
    }

    const cashAmount = lastGraduation.career.careerPrizeValue?.toNumber()
    return NextResponse.json({
      success: true,
      choice,
      message: choice === 'CASH' && cashAmount
        ? `Valor de R$ ${cashAmount.toLocaleString('pt-BR')} creditado na sua conta.`
        : 'Prêmio físico registrado com sucesso.'
    })
  } catch (error) {
    console.error('Erro ao resgatar prêmio de carreira:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
