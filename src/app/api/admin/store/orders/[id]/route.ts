import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  trackingCode: z.string().optional(),
  notes: z.string().optional(),
})

// GET - Buscar pedido por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const orderId = BigInt(params.id)

    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true, cpf: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true }
            }
          }
        },
        shippingAddress: true,
        transaction: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

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

    // Serializar BigInt e usar status da transação como fonte da verdade
    const serialized = {
      ...order,
      id: order.id.toString(),
      userId: order.userId.toString(),
      shippingAddressId: order.shippingAddressId?.toString() ?? null,
      transactionId: order.transactionId?.toString(),
      status: displayStatus, // Status para exibição (baseado na transação quando aplicável)
      paymentStatus: paymentStatus, // Status de pagamento (sempre da transação)
      user: {
        ...order.user,
        id: order.user.id.toString()
      },
      items: order.items.map(item => ({
        ...item,
        id: item.id.toString(),
        orderId: item.orderId.toString(),
        productId: item.productId.toString(),
        variantId: item.variantId?.toString(),
        product: {
          ...item.product,
          id: item.product.id.toString()
        }
      })),
      shippingAddress: order.shippingAddress ? {
        ...order.shippingAddress,
        id: order.shippingAddress.id.toString(),
        userId: order.shippingAddress.userId.toString()
      } : null,
      transaction: order.transaction ? {
        ...order.transaction,
        id: order.transaction.id.toString(),
        userId: order.transaction.userId?.toString() ?? '',
        status: order.transaction.status
      } : null
    }

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Erro ao buscar pedido:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar pedido' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar pedido
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const orderId = BigInt(params.id)
    const body = await request.json()
    const validatedData = updateOrderSchema.parse(body)

    // Verificar se pedido existe (com transaction para checar pagamento)
    const existingOrder = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: { transaction: true }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Status do pedido só pode ser alterado quando o pagamento estiver concluído
    const paymentCompleted = existingOrder.paymentStatus === 'PAID' ||
      (existingOrder.transaction?.status === 'COMPLETED')

    const updateData: any = {}

    if (validatedData.status) {
      if (!paymentCompleted) {
        return NextResponse.json(
          { error: 'Só é possível alterar o status do pedido quando o pagamento estiver concluído.' },
          { status: 400 }
        )
      }
      updateData.status = validatedData.status
      
      // Atualizar timestamps baseado no status
      if (validatedData.status === 'SHIPPED') {
        updateData.shippedAt = new Date()
      } else if (validatedData.status === 'DELIVERED') {
        updateData.deliveredAt = new Date()
      } else if (validatedData.status === 'CANCELLED') {
        updateData.cancelledAt = new Date()
      }
    }

    if (validatedData.trackingCode !== undefined) {
      updateData.trackingCode = validatedData.trackingCode
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    const updatedOrder = await prisma.storeOrder.update({
      where: { id: orderId },
      data: updateData
    })

    // Serializar
    const serialized = {
      ...updatedOrder,
      id: updatedOrder.id.toString(),
      userId: updatedOrder.userId.toString(),
      shippingAddressId: updatedOrder.shippingAddressId?.toString() ?? null,
      transactionId: updatedOrder.transactionId?.toString()
    }

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao atualizar pedido' },
      { status: 500 }
    )
  }
}
