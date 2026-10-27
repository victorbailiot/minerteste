import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BONUS_TRANSACTION_TYPES, EXPENSE_TRANSACTION_TYPES } from '@/lib/transaction-types'
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const hasCredits = searchParams.get('hasCredits') === 'true'
    const hasDebits = searchParams.get('hasDebits') === 'true'
    const hasBalance = searchParams.get('hasBalance') === 'true'
    const orderBy = searchParams.get('orderBy') || 'name'
    const orderDir = (searchParams.get('orderDir') || 'asc') as 'asc' | 'desc'

    // Construir filtros de busca
    const where: any = {
      // Excluir usuário admin (ID = 1)
      id: { not: BigInt(1) }
    }
    if (search) {
      // Remover pontuação do CPF para busca (manter apenas números)
      const searchOnlyNumbers = search.replace(/[^\d]/g, '')
      
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
      
      // Se o termo de busca contém números, adicionar busca por CPF
      if (searchOnlyNumbers) {
        where.OR.push({ cpf: { contains: searchOnlyNumbers, mode: 'insensitive' } })
      }
    }

    // Buscar TODOS os usuários (sem paginação)
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        referralCode: true
      },
      orderBy: { name: 'asc' }
    })

        // Para cada usuário, calcular saldo
        const balancesPromises = users.map(async (user) => {
            // Buscar créditos (bônus)
            const credits = await prisma.transaction.aggregate({
                where: {
                    userId: user.id,
                    type: {
                        in: [...BONUS_TRANSACTION_TYPES, TransactionType.BONUS]
                    },
                    status: 'COMPLETED'
                },
                _sum: {
                    amount: true
                }
            })

            // Buscar débitos (saques pendentes e confirmados)
            // Nota: Saques aprovados estão incluídos nos PENDING (determinado pela descrição)
            const debits = await prisma.transaction.aggregate({
                where: {
                    userId: user.id,
                    type: { in: [TransactionType.WITHDRAWAL, TransactionType.BONUS_PAYMENT, TransactionType.SOLIDARITY_PAYMENT] },
                    status: { in: ['PENDING', 'COMPLETED'] } // Status válidos do enum TransactionStatus
                },
                _sum: {
                    amount: true
                }
            })

            const totalCredits = Number(credits._sum.amount || 0)
            const totalDebits = Number(debits._sum.amount || 0)
            const balance = totalCredits - totalDebits

            return {
                id: Number(user.id),
                name: user.name,
                email: user.email,
                phone: user.phone,
                referralCode: user.referralCode,
                balance,
                totalCredits,
                totalDebits,
            }
        })

        let balances = await Promise.all(balancesPromises)

        // Aplicar filtros pós-cálculo
        if (hasCredits) {
            balances = balances.filter(b => b.totalCredits > 0)
        }
        if (hasDebits) {
            balances = balances.filter(b => b.totalDebits > 0)
        }
        if (hasBalance) {
            balances = balances.filter(b => b.balance > 0)
        }

        // Aplicar ordenação
        balances.sort((a, b) => {
            let comparison = 0
            
            switch (orderBy) {
                case 'credits':
                    comparison = a.totalCredits - b.totalCredits
                    break
                case 'debits':
                    comparison = a.totalDebits - b.totalDebits
                    break
                case 'balance':
                    comparison = a.balance - b.balance
                    break
                case 'name':
                default:
                    comparison = a.name.localeCompare(b.name)
                    break
            }

            return orderDir === 'asc' ? comparison : -comparison
        })

        // Calcular resumo geral de TODOS os usuários (excluindo ID = 1)
        const [allCredits, allDebits] = await Promise.all([
            // Total de créditos de todos os usuários (exceto ID = 1)
            prisma.transaction.aggregate({
                where: {
                    userId: { not: BigInt(1) },
                    type: {
                        in: [...BONUS_TRANSACTION_TYPES, TransactionType.BONUS]
                    },
                    status: 'COMPLETED'
                },
                _sum: {
                    amount: true
                }
            }),
            // Total de débitos de todos os usuários (exceto ID = 1) - pendentes e confirmados
            // Nota: Saques aprovados estão incluídos nos PENDING (determinado pela descrição)
            prisma.transaction.aggregate({
                where: {
                    userId: { not: BigInt(1) },
                    type: { in: [TransactionType.WITHDRAWAL, TransactionType.BONUS_PAYMENT, TransactionType.SOLIDARITY_PAYMENT] },
                    status: { in: ['PENDING', 'COMPLETED'] } // Status válidos do enum TransactionStatus
                },
                _sum: {
                    amount: true
                }
            })
        ])

        const totalSystemCredits = Number(allCredits._sum.amount || 0)
        const totalSystemDebits = Number(allDebits._sum.amount || 0)

        // Total filtrado (após aplicar os filtros)
        const totalFiltered = balances.length

        // Aplicar paginação manual (já que filtramos depois da query)
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedBalances = balances.slice(startIndex, endIndex)

        // Total geral de usuários (para o resumo)
        const totalUsers = users.length

        const summary = {
            totalUsers: totalFiltered,
            totalBalance: totalSystemCredits - totalSystemDebits,
            totalCredits: totalSystemCredits,
            totalDebits: totalSystemDebits
        }

        return NextResponse.json({
            success: true,
            data: paginatedBalances,
            pagination: {
                page,
                limit,
                total: totalFiltered,
                pages: Math.ceil(totalFiltered / limit)
            },
            summary
        })
    } catch (error) {
        console.error('Erro ao buscar saldos:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar saldos' },
            { status: 500 }
        )
    }
}

