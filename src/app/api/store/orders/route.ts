import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Listar pedidos do usuário logado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      prisma.storeOrder.findMany({
        where: { userId: user.id },
        include: {
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              unitPrice: true,
              imageUrl: true
            }
          },
          transaction: {
            select: {
              id: true,
              status: true,
              paidAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.storeOrder.count({ where: { userId: user.id } })
    ])

    // Serializar BigInt e usar status da transação como fonte da verdade para pagamento
    const serialized = orders.map(order => {
      // Mapear status da transação para status de exibição do pedido
      // Se a transação está COMPLETED, o pedido deve mostrar como CONFIRMED
      // Se a transação está PENDING, o pedido deve mostrar como PENDING
      // Se a transação está REJECTED/FAILED, o pedido deve mostrar como CANCELLED
      let displayStatus = order.status // Status do pedido (logística)
      let paymentStatus = order.paymentStatus // Status de pagamento
      
      if (order.transaction) {
        // Usar status da transação como fonte da verdade para pagamento
        const transactionStatus = order.transaction.status
        
        // Mapear status da transação para paymentStatus
        if (transactionStatus === 'COMPLETED') {
          paymentStatus = 'PAID'
          // Se o pedido ainda está PENDING, atualizar para CONFIRMED quando pagamento confirmado
          if (order.status === 'PENDING') {
            displayStatus = 'CONFIRMED'
          }
        } else if (transactionStatus === 'PENDING') {
          paymentStatus = 'PENDING'
          displayStatus = 'PENDING'
        } else if (transactionStatus === 'FAILED' || transactionStatus === 'CANCELLED') {
          paymentStatus = 'FAILED'
          displayStatus = 'CANCELLED'
        }
      }
      
      return {
        ...order,
        id: order.id.toString(),
        userId: order.userId.toString(),
        shippingAddressId: order.shippingAddressId?.toString() ?? null,
        transactionId: order.transactionId?.toString(),
        status: displayStatus, // Status para exibição (baseado na transação quando aplicável)
        paymentStatus: paymentStatus, // Status de pagamento (sempre da transação)
        transaction: order.transaction ? {
          id: order.transaction.id.toString(),
          status: order.transaction.status,
          paidAt: order.transaction.paidAt
        } : null,
        items: order.items.map(item => ({
          ...item,
          id: item.id.toString()
        }))
      }
    })

    return NextResponse.json({
      orders: serialized,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Erro ao listar pedidos do usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao listar pedidos' },
      { status: 500 }
    )
  }
}
