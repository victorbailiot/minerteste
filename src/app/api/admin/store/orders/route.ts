import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema para atualizar pedido
const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  trackingCode: z.string().optional(),
  notes: z.string().optional(),
})

// GET - Listar todos os pedidos (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const skip = (page - 1) * limit

    const where: any = {}

    // Filtro por status
    if (status) {
      where.status = status
    }

    // Busca por número do pedido ou nome do cliente
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    const [orders, total] = await Promise.all([
      prisma.storeOrder.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              unitPrice: true,
              subtotal: true,
              imageUrl: true
            }
          },
          shippingAddress: true,
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
      prisma.storeOrder.count({ where })
    ])

    // Serializar BigInt e usar status da transação como fonte da verdade para pagamento
    const serialized = orders.map(order => {
      // Mapear status da transação para status de exibição do pedido
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
        user: {
          ...order.user,
          id: order.user.id.toString()
        },
        items: order.items.map(item => ({
          ...item,
          id: item.id.toString()
        })),
        shippingAddress: order.shippingAddress ? {
          ...order.shippingAddress,
          id: order.shippingAddress.id.toString(),
          userId: order.shippingAddress.userId.toString()
        } : null
      }
    })

    return NextResponse.json({
      orders: serialized,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Erro ao listar pedidos:', error)
    return NextResponse.json(
      { error: 'Erro ao listar pedidos' },
      { status: 500 }
    )
  }
}
