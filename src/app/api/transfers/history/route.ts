import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/transfers/history
 * Busca histórico de transferências do usuário (enviadas e recebidas)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Buscar transferências enviadas (userId = userId, sourceUserId != null)
    const sentTransfers = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'TRANSFER',
        sourceUserId: { not: null }
      },
      include: {
        sourceUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Buscar transferências recebidas (sourceUserId = userId)
    const receivedTransfers = await prisma.transaction.findMany({
      where: {
        type: 'TRANSFER',
        sourceUserId: userId,
        status: 'COMPLETED'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Combinar e ordenar todas as transferências
    const allTransfers = [
      ...sentTransfers.map(t => ({
        id: Number(t.id),
        amount: Number(t.amount),
        description: t.description,
        type: 'SENT' as const,
        status: t.status,
        createdAt: t.createdAt,
        transferId: t.transferId,
        otherUser: t.sourceUser ? {
          id: Number(t.sourceUser.id),
          name: t.sourceUser.name,
          email: t.sourceUser.email
        } : null
      })),
      ...receivedTransfers.map(t => ({
        id: Number(t.id),
        amount: Number(t.amount),
        description: t.description,
        type: 'RECEIVED' as const,
        status: t.status,
        createdAt: t.createdAt,
        transferId: t.transferId,
        otherUser: t.user ? {
          id: Number(t.user.id),
          name: t.user.name,
          email: t.user.email
        } : null
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Aplicar paginação
    const paginatedTransfers = allTransfers.slice(skip, skip + limit)
    const total = allTransfers.length

    // Calcular estatísticas
    const totalSent = sentTransfers.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalReceived = receivedTransfers.reduce((sum, t) => sum + Number(t.amount), 0)

    return NextResponse.json({
      success: true,
      data: paginatedTransfers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalSent,
        totalReceived,
        totalSentCount: sentTransfers.length,
        totalReceivedCount: receivedTransfers.length
      }
    })

  } catch (error) {
    console.error('Erro ao buscar histórico de transferências:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de transferências' },
      { status: 500 }
    )
  }
}

