import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BONUS_TRANSACTION_TYPES, EXPENSE_TRANSACTION_TYPES, WITHDRAWAL_TRANSACTION_TYPES } from '@/lib/transaction-types'
import { TransactionType } from '@/generated/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Verificar se é admin
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar total de saques pendentes
    const pendingWithdrawals = await prisma.transaction.aggregate({
      where: {
        type: TransactionType.WITHDRAWAL,
        status: 'PENDING'
      },
      _sum: {
        amount: true
      }
    })

    // Buscar total de saques concluídos
    const completedWithdrawals = await prisma.transaction.aggregate({
      where: {
        type: TransactionType.WITHDRAWAL,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    })

    // Buscar total de créditos (apenas tipos de bônus definidos em transaction-types.ts, excluindo ID = 1)
    const credits = await prisma.transaction.aggregate({
      where: {
        userId: { not: BigInt(1) },
        type: {
          in: [...BONUS_TRANSACTION_TYPES]
        },
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    })

    // Buscar total de saques pendentes e confirmados (excluindo ID = 1)
    // Nota: Saques aprovados estão incluídos nos PENDING (determinado pela descrição)
    const committedWithdrawals = await prisma.transaction.aggregate({
      where: {
        userId: { not: BigInt(1) },
        type: { in: [...WITHDRAWAL_TRANSACTION_TYPES] },
        status: { in: ['PENDING', 'COMPLETED'] } // Status válidos do enum TransactionStatus
      },
      _sum: {
        amount: true
      }
    })
    

    // Saldo disponível = todos os bônus - (saques pendentes + confirmados)
    // Saques aprovados estão incluídos nos pendentes
    const totalBalance = Number(credits._sum.amount || 0) - Number(committedWithdrawals._sum.amount || 0)

    console.log('committedWithdrawals -------------', credits._sum.amount, committedWithdrawals._sum.amount, totalBalance)

    return NextResponse.json({
      success: true,
      totalPending: Number(pendingWithdrawals._sum.amount) || 0,
      totalCompleted: Number(completedWithdrawals._sum.amount) || 0,
      totalBalance: totalBalance || 0
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas de saques:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}

