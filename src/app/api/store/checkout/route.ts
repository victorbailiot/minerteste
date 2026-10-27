import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const checkoutSchema = z.object({
  // Itens do pedido
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive()
  })).min(1),
  
  // Endereço e envio (opcional para pedidos digitais)
  shippingAddressId: z.string().optional(),
  shippingMethod: z.string().optional(),
  shippingService: z.string().optional(),
  shippingCost: z.number().min(0).optional(),
  
  // Pagamento
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'BALANCE']),
  
  // Pedido apenas digital (sem endereço/frete)
  digitalOnly: z.boolean().optional(),
  
  // Cupom (opcional)
  couponCode: z.string().optional(),
  
  // Observações (opcional)
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.digitalOnly) return true
    return !!data.shippingAddressId && !!data.shippingMethod && data.shippingCost !== undefined
  },
  { message: 'Endereço e frete são obrigatórios para produtos físicos' }
)

/**
 * POST /api/store/checkout
 * 
 * Cria pedido e transação em uma única chamada
 * Retorna pedido criado e, se for PIX/Cartão, os dados de pagamento
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = checkoutSchema.parse(body)

    // 1. Buscar e validar produtos
    const productsData = await Promise.all(
      validatedData.items.map(async (item) => {
        if (item.variantId) {
          const variant = await prisma.storeProductVariant.findUnique({
            where: { id: BigInt(item.variantId) },
            include: { product: true }
          })
          return { type: 'variant' as const, data: variant, item }
        } else {
          const product = await prisma.storeProduct.findUnique({
            where: { id: BigInt(item.productId) }
          })
          return { type: 'product' as const, data: product, item }
        }
      })
    )

    // Validar estoque e calcular valores
    let subtotal = 0
    const orderItems: any[] = []

    for (const productInfo of productsData) {
      if (!productInfo.data) {
        return NextResponse.json(
          { error: `Produto não encontrado` },
          { status: 400 }
        )
      }

      const { type, data, item } = productInfo

      let price: number
      let name: string
      let sku: string
      let stock: number
      let imageUrl: string | null = null

      if (type === 'variant') {
        price = Number(data.price)
        name = `${data.product.name} - ${data.name}`
        sku = data.sku
        stock = data.stock
        imageUrl = data.imageUrl || data.product.images[0]
      } else {
        price = Number(data.price)
        name = data.name
        sku = data.sku || ''
        stock = data.stock
        imageUrl = data.images[0]
      }

      // Validar estoque
      if (stock < item.quantity) {
        return NextResponse.json(
          { error: `Estoque insuficiente para ${name}. Disponível: ${stock}` },
          { status: 400 }
        )
      }

      const itemSubtotal = price * item.quantity
      subtotal += itemSubtotal

      orderItems.push({
        productId: BigInt(item.productId),
        variantId: item.variantId ? BigInt(item.variantId) : null,
        name,
        sku,
        quantity: item.quantity,
        unitPrice: price,
        subtotal: itemSubtotal,
        imageUrl
      })
    }

    // 2. Aplicar cupom
    let discount = 0
    if (validatedData.couponCode) {
      const coupon = await prisma.storeDiscountCoupon.findUnique({
        where: { code: validatedData.couponCode }
      })

      if (coupon && coupon.isActive) {
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
          return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 })
        }

        if (coupon.minPurchase && subtotal < Number(coupon.minPurchase)) {
          return NextResponse.json(
            { error: `Valor mínimo para cupom: R$ ${Number(coupon.minPurchase).toFixed(2)}` },
            { status: 400 }
          )
        }

        if (coupon.discountType === 'PERCENTAGE') {
          discount = (subtotal * Number(coupon.value)) / 100
          if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
            discount = Number(coupon.maxDiscount)
          }
        } else {
          discount = Number(coupon.value)
        }
      }
    }

    const shippingCost = validatedData.digitalOnly ? 0 : (validatedData.shippingCost ?? 0)
    const total = subtotal + shippingCost - discount

    // 3. Gerar número do pedido
    const orderNumber = `LOJA-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    // 4. Criar transação APENAS para pagamento com BALANCE (saldo)
    // Para PIX e CREDIT_CARD, a transação será criada quando o pagamento for gerado
    let transactionId: bigint | null = null
    
    if (validatedData.paymentMethod === 'BALANCE') {
      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'BONUS_PAYMENT', // Pagamento com saldo de bônus
          amount: total,
          description: `Compra Loja #${orderNumber} - ${validatedData.items.length} item(ns)`,
          status: 'PENDING',
          correlationID: orderNumber // Usar como identificador único
        }
      })
      transactionId = transaction.id
    }

    // 5. Criar pedido usando UncheckedCreateInput para permitir shippingAddressId opcional (pedidos digitais)
    const orderData = {
      orderNumber,
      userId: user.id,
      status: 'PENDING' as const,
      subtotal,
      shippingCost,
      discount,
      total,
      shippingMethod: validatedData.digitalOnly ? 'Entrega digital' : (validatedData.shippingMethod ?? ''),
      shippingService: validatedData.digitalOnly ? 'Entrega digital' : (validatedData.shippingService ?? ''),
      paymentMethod: validatedData.paymentMethod,
      paymentStatus: 'PENDING' as const,
      transactionId: transactionId,
      couponCode: validatedData.couponCode ?? null,
      notes: validatedData.notes ?? null,
      shippingAddressId: validatedData.digitalOnly ? null : (validatedData.shippingAddressId ? BigInt(validatedData.shippingAddressId) : null),
      items: {
        create: orderItems
      }
    }

    const order = await prisma.storeOrder.create({
      data: orderData,
      include: {
        items: true,
        shippingAddress: true,
        transaction: transactionId ? true : false
      }
    })

    // 6. Atualizar cupom
    if (validatedData.couponCode) {
      await prisma.storeDiscountCoupon.update({
        where: { code: validatedData.couponCode },
        data: { usedCount: { increment: 1 } }
      })
    }

    // 7. Decrementar estoque
    for (const productInfo of productsData) {
      if (productInfo.type === 'variant') {
        await prisma.storeProductVariant.update({
          where: { id: BigInt(productInfo.item.variantId!) },
          data: { stock: { decrement: productInfo.item.quantity } }
        })
      } else {
        await prisma.storeProduct.update({
          where: { id: BigInt(productInfo.item.productId) },
          data: { stock: { decrement: productInfo.item.quantity } }
        })
      }
    }

    // 8. Se pagamento for PIX ou Cartão, retornar dados para processamento externo
    // O frontend chamará a API de pagamento com o orderId
    
    // Serializar resposta
    const serialized = {
      ...order,
      id: order.id.toString(),
      userId: order.userId.toString(),
      shippingAddressId: order.shippingAddressId?.toString() ?? null,
      transactionId: order.transactionId?.toString() || null,
      items: order.items.map(item => ({
        ...item,
        id: item.id.toString(),
        orderId: item.orderId.toString(),
        productId: item.productId.toString(),
        variantId: item.variantId?.toString()
      })),
      transaction: order.transaction ? {
        ...order.transaction,
        id: order.transaction.id.toString(),
        userId: order.transaction.userId?.toString() ?? ''
      } : null
    }

    return NextResponse.json({
      success: true,
      order: serialized,
      message: 'Pedido criado com sucesso',
      // Metadados para pagamento
      paymentMetadata: {
        tipo_compra: 'loja',
        order_id: order.id.toString(),
        order_number: orderNumber,
        user_id: user.id.toString(),
        transaction_id: transactionId?.toString() || null
      }
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Erro no checkout da loja:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao processar checkout', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
