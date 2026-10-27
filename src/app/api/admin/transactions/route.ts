import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TransactionStatus, TransactionType } from '@/generated/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission, isSuperAdmin } from '@/lib/authorization'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'transactions.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar transações' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parâmetros de filtro
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const filterUserId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    
    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}
    
    // Bônus de Ajuste só é visível para super admin
    const canSeeBonusAdjustment = await isSuperAdmin(userId)

    // Excluir transações de compra (PURCHASE) da listagem
    where.type = { notIn: canSeeBonusAdjustment ? ['PURCHASE'] : ['PURCHASE', 'BONUS_ADJUSTMENT'] }

    if (type && type !== 'all' && (type !== 'BONUS_ADJUSTMENT' || canSeeBonusAdjustment)) {
      where.type = type as TransactionType
    }
    
    if (status && status !== 'all') {
      where.status = status as TransactionStatus
    }
    
    if (filterUserId) {
      where.userId = BigInt(filterUserId)
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z')
      }
    }
    
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { referenceId: { contains: search, mode: 'insensitive' } },
        { correlationID: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Buscar transações com dados do usuário
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          userPackages: {
            include: {
              package: {
                select: {
                  id: true,
                  name: true,
                  price: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.transaction.count({ where })
    ])

    // Formatar resposta
    const formattedTransactions = transactions.map(transaction => ({
      id: Number(transaction.id),
      type: transaction.type,
      status: transaction.status,
      amount: Number(transaction.amount),
      description: transaction.description,
      referenceId: transaction.referenceId,
      correlationID: transaction.correlationID,
      chargeId: transaction.chargeId,
      customerName: transaction.customerName,
      customerEmail: transaction.customerEmail,
      customerPhone: transaction.customerPhone,
      customerCpfCnpj: transaction.customerCpfCnpj,
      expiresAt: transaction.expiresAt?.toISOString(),
      paidAt: transaction.paidAt?.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      user: transaction.user ? {
        id: Number(transaction.user.id),
        name: transaction.user.name,
        email: transaction.user.email
      } : null,
      userPackages: transaction.userPackages.map(up => ({
        id: Number(up.id),
        package: {
          id: Number(up.package.id),
          name: up.package.name,
          price: Number(up.package.price)
        }
      }))
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    })

  } catch (error) {
    console.error('Erro ao buscar transações:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 