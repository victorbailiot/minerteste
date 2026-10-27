import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateOrderSchema = z.object({
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'BALANCE']).optional(),
  notes: z.string().optional(),
  shippingCost: z.number().min(0).optional(),
  shippingMethod: z.string().optional(),
  shippingService: z.string().optional()
})

// GET - Buscar pedido específico do usuário
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const orderId = BigInt(id)

    const order = await prisma.storeOrder.findUnique({
      where: { 
        id: orderId,
        userId: user.id // Garantir que o pedido pertence ao usuário
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true }
            }
          }
        },
        shippingAddress: true,
        transaction: {
          select: {
            id: true,
            status: true,
            paidAt: true,
            createdAt: true,
            updatedAt: true
          }
        }
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
      transaction: order.transaction ? {
        id: order.transaction.id.toString(),
        status: order.transaction.status,
        paidAt: order.transaction.paidAt,
        createdAt: order.transaction.createdAt,
        updatedAt: order.transaction.updatedAt
      } : null,
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

// PUT - Atualizar pedido (especialmente forma de pagamento)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const orderId = BigInt(id)

    // Verificar se o pedido existe e pertence ao usuário
    const existingOrder = await prisma.storeOrder.findUnique({
      where: { 
        id: orderId,
        userId: user.id
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    // Verificar se o pedido ainda está pendente (permite atualizar apenas se pendente)
    if (existingOrder.paymentStatus !== 'PENDING') {
      return NextResponse.json(
        { error: 'Pedido já foi processado e não pode ser alterado' },
        { status: 400 }
      )
    }

    // Validar body da requisição
    const body = await request.json()
    const validation = updateOrderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { paymentMethod, notes, shippingCost, shippingMethod, shippingService } = validation.data

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {}
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }
    if (shippingCost !== undefined) {
      updateData.shippingCost = shippingCost
    }
    if (shippingMethod !== undefined) {
      updateData.shippingMethod = shippingMethod
    }
    if (shippingService !== undefined) {
      updateData.shippingService = shippingService
    }

    // Recalcular total se o frete foi alterado
    if (shippingCost !== undefined) {
      const subtotal = Number(existingOrder.subtotal)
      const discount = Number(existingOrder.discount)
      updateData.total = subtotal - discount + shippingCost
    }

    // Atualizar pedido
    const order = await prisma.storeOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true }
            }
          }
        },
        shippingAddress: true
      }
    })

    // Serializar BigInt
    const serialized = {
      ...order,
      id: order.id.toString(),
      userId: order.userId.toString(),
      shippingAddressId: order.shippingAddressId?.toString() ?? null,
      transactionId: order.transactionId?.toString(),
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
      } : null
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido atualizado com sucesso',
      order: serialized
    })
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar pedido', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
