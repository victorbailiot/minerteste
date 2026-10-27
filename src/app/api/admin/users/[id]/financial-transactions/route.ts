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

    // Buscar transações onde o usuário é o receptor (userId) ou a fonte (sourceUserId)
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { userId: BigInt(userId) },
          { sourceUserId: BigInt(userId) }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true,
        userId: true,
        sourceUserId: true,
        level: true,
        user: {
          select: {
            name: true
          }
        },
        sourceUser: {
          select: {
            name: true
          }
        }
      }
    })

    // Formatar transações e extrair tipos únicos
    const formattedTransactions = transactions.map(transaction => ({
      id: Number(transaction.id),
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      status: transaction.status,
      createdAt: transaction.createdAt.toISOString(),
      userId: transaction.userId ? Number(transaction.userId) : null,
      sourceUserId: transaction.sourceUserId ? Number(transaction.sourceUserId) : null,
      level: transaction.level,
      receiverName: transaction.user?.name || null,
      sourceName: transaction.sourceUser?.name || null,
      // Indicador para facilitar filtros no frontend
      isReceived: transaction.userId ? Number(transaction.userId) === userId : false,
      isGenerated: transaction.sourceUserId ? Number(transaction.sourceUserId) === userId : false
    }))

    // Extrair tipos únicos de transações
    const uniqueTypes = [...new Set(formattedTransactions.map(t => t.type))]

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      types: uniqueTypes
    })

  } catch (error) {
    console.error('Erro ao buscar transações financeiras:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 