import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TransactionType } from '@/generated/prisma'

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

        // Buscar totais de saques por status
        const [pendingWithdrawals, completedWithdrawals, totalBonuses] = await Promise.all([
            // Saques pendentes (não completados)
            prisma.transaction.aggregate({
                where: {
                    type: 'WITHDRAWAL',
                    status: {
                        not: 'COMPLETED'
                    }
                },
                _sum: {
                    amount: true
                }
            }),

            // Saques completados
            prisma.transaction.aggregate({
                where: {
                    type: 'WITHDRAWAL',
                    status: 'COMPLETED'
                },
                _sum: {
                    amount: true
                }
            }),

            // Total de todos os bônus distribuídos
            prisma.transaction.aggregate({
                where: {
                    type: {
                        in: [TransactionType.DIRECT_BONUS, TransactionType.INDIRECT_BONUS, TransactionType.ACTIVATION_BONUS,
                        TransactionType.CASHBACK, TransactionType.PROFIT_SHARE
                        ]
                    },
                    userId: {
                        not: 1
                    }
                },
                _sum: {
                    amount: true
                }
            })
        ])

        // Calcular saldo disponível (bônus - saques completados)
        const totalBonusesAmount = Number(totalBonuses._sum.amount || 0)
        const pendingWithdrawalsAmount = Number(pendingWithdrawals._sum.amount || 0)
        const completedWithdrawalsAmount = Number(completedWithdrawals._sum.amount || 0)
        const availableBalance = totalBonusesAmount - (completedWithdrawalsAmount + pendingWithdrawalsAmount)

        return NextResponse.json({
            success: true,
            data: {
                pendingWithdrawals: pendingWithdrawalsAmount,
                completedWithdrawals: completedWithdrawalsAmount,
                availableBalance: Math.max(0, availableBalance), // Não permitir saldo negativo
                totalBonuses: totalBonusesAmount
            }
        })

    } catch (error) {
        console.error('Erro ao buscar resumo financeiro:', error)
        return NextResponse.json({
            error: 'Erro interno do servidor'
        }, { status: 500 })
    }
}
