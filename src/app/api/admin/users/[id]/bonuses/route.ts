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
    // Paginação
    const pageParam = searchParams.get('page')
    const perPageParam = searchParams.get('perPage')
    const page = Math.max(parseInt(pageParam || '1', 10) || 1, 1)
    const perPageRaw = Math.max(parseInt(perPageParam || '10', 10) || 10, 1)
    const perPage = Math.min(perPageRaw, 100)
    const skip = (page - 1) * perPage

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

    const whereClause = {
      userId: userId,
      type: typeFilter
        ? (typeFilter as any)
        : { in: [...BONUS_TRANSACTION_TYPES] as any }
    }

    // Total para paginação
    const total = await prisma.transaction.count({ where: whereClause as any })

    // Buscar transações de bônus do usuário (paginado)
    const bonuses = await prisma.transaction.findMany({
      where: whereClause as any,
      orderBy: { createdAt: 'desc' },
      skip,
      take: perPage,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true
      }
    })

    // Formatar resposta
    const formattedBonuses = bonuses.map(bonus => ({
      id: Number(bonus.id),
      type: bonus.type,
      amount: Number(bonus.amount),
      description: bonus.description || 'Bônus do sistema',
      status: bonus.status,
      createdAt: bonus.createdAt.toISOString()
    }))

    const totalPages = Math.max(Math.ceil(total / perPage), 1)

    return NextResponse.json({
      success: true,
      data: formattedBonuses,
      meta: {
        page,
        perPage,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('Erro ao buscar bônus do usuário:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 