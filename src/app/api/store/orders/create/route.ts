import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createOrderSchema } from '@/lib/validations/store'
import { processOrderBonuses } from '@/lib/services/storeMLMService'

// POST - Criar pedido
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
    const validatedData = createOrderSchema.parse(body)

    // 1. Validar estoque de todos os produtos
    const productsToCheck = await Promise.all(
      validatedData.items.map(async (item) => {
        if (item.variantId) {
          return prisma.storeProductVariant.findUnique({
            where: { id: BigInt(item.variantId) },
            include: { product: true }
          })
        } else {
          return prisma.storeProduct.findUnique({
            where: { id: BigInt(item.productId) }
          })
        }
      })
    )

    // Verificar se todos os produtos existem e têm estoque
    for (let i = 0; i < productsToCheck.length; i++) {
      const item = validatedData.items[i]
      const productData = productsToCheck[i]

      if (!productData) {
        return NextResponse.json(
          { error: `Produto ${item.productId} não encontrado` },
          { status: 400 }
        )
      }

      const stock = productData.stock
      if (stock < item.quantity) {
        const name = 'product' in productData ? productData.product.name : productData.name
        return NextResponse.json(
          { error: `Estoque insuficiente para ${name}. Disponível: ${stock}` },
          { status: 400 }
        )
      }
    }

    // 2. Validar endereço de entrega
    const address = await prisma.address.findUnique({
      where: { id: BigInt(validatedData.shippingAddressId) }
    })

    if (!address || address.userId !== user.id) {
      return NextResponse.json(
        { error: 'Endereço de entrega inválido' },
        { status: 400 }
      )
    }

    // 3. Validar cupom (se fornecido)
    const couponDiscount = 0
    if (validatedData.couponCode) {
      const coupon = await prisma.storeDiscountCoupon.findUnique({
        where: { code: validatedData.couponCode }
      })

      if (!coupon || !coupon.isActive) {
        return NextResponse.json(
          { error: 'Cupom inválido' },
          { status: 400 }
        )
      }

      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Cupom expirado' },
          { status: 400 }
        )
      }

      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json(
          { error: 'Cupom esgotado' },
          { status: 400 }
        )
      }

      // Calcular desconto do cupom será feito abaixo
    }

    // 4. Calcular valores do pedido
    let subtotal = 0
    const orderItems: any[] = []

    for (let i = 0; i < validatedData.items.length; i++) {
      const item = validatedData.items[i]
      const productData = productsToCheck[i]

      let price: number
      let name: string
      let sku: string
      let imageUrl: string | null = null
      let attributes: any = null

      if (item.variantId && 'product' in productData!) {
        // É uma variante
        price = Number(productData!.price)
        name = `${productData!.product.name} - ${productData!.name}`
        sku = productData!.sku
        imageUrl = productData!.imageUrl || productData!.product.mainImage
        attributes = productData!.attributes
      } else {
        // É um produto normal
        const product = productData as any
        price = Number(product.price)
        name = product.name
        sku = product.sku
        imageUrl = product.mainImage || product.images[0]
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
        imageUrl,
        attributes
      })
    }

    // Aplicar desconto do cupom
    let discount = 0
    if (validatedData.couponCode) {
      const coupon = await prisma.storeDiscountCoupon.findUnique({
        where: { code: validatedData.couponCode }
      })

      if (coupon) {
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

    const shippingCost = validatedData.shippingCost
    const total = subtotal + shippingCost - discount

    // 5. Gerar número do pedido único
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // 6. Criar pedido
    const order = await prisma.storeOrder.create({
      data: {
        orderNumber,
        userId: user.id,
        status: 'PENDING',
        subtotal,
        shippingCost,
        discount,
        total,
        shippingAddressId: BigInt(validatedData.shippingAddressId),
        shippingMethod: validatedData.shippingMethod,
        shippingService: validatedData.shippingService,
        paymentMethod: validatedData.paymentMethod,
        paymentStatus: 'PENDING',
        couponCode: validatedData.couponCode,
        notes: validatedData.notes,
        items: {
          create: orderItems
        }
      },
      include: {
        items: true,
        shippingAddress: true
      }
    })

    // 7. Atualizar uso do cupom
    if (validatedData.couponCode) {
      await prisma.storeDiscountCoupon.update({
        where: { code: validatedData.couponCode },
        data: { usedCount: { increment: 1 } }
      })
    }

    // 8. Decrementar estoque
    for (let i = 0; i < validatedData.items.length; i++) {
      const item = validatedData.items[i]
      
      if (item.variantId) {
        await prisma.storeProductVariant.update({
          where: { id: BigInt(item.variantId) },
          data: { stock: { decrement: item.quantity } }
        })
      } else {
        await prisma.storeProduct.update({
          where: { id: BigInt(item.productId) },
          data: { stock: { decrement: item.quantity } }
        })
      }
    }

    // 9. Se pagamento for com saldo, processar imediatamente
    if (validatedData.paymentMethod === 'BALANCE') {
      // TODO: Implementar débito de saldo e processar bônus
      // await debitBalance(user.id, total)
      // await processOrderBonuses(order.id)
    }

    // Serializar resposta
    const serialized = {
      ...order,
      id: order.id.toString(),
      userId: order.userId.toString(),
      shippingAddressId: order.shippingAddressId?.toString(),
      transactionId: order.transactionId?.toString(),
      items: order.items.map(item => ({
        ...item,
        id: item.id.toString(),
        orderId: item.orderId.toString(),
        productId: item.productId.toString(),
        variantId: item.variantId?.toString()
      }))
    }

    return NextResponse.json({
      success: true,
      order: serialized,
      message: 'Pedido criado com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return NextResponse.json(
      { error: 'Erro ao criar pedido', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

// GET - Listar meus pedidos
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

    const orders = await prisma.storeOrder.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, mainImage: true }
            }
          }
        },
        shippingAddress: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const serialized = orders.map(order => ({
      ...order,
      id: order.id.toString(),
      userId: order.userId.toString(),
      shippingAddressId: order.shippingAddressId?.toString(),
      transactionId: order.transactionId?.toString(),
      items: order.items.map(item => ({
        ...item,
        id: item.id.toString(),
        orderId: item.orderId.toString(),
        productId: item.productId.toString(),
        variantId: item.variantId?.toString()
      }))
    }))

    return NextResponse.json({
      success: true,
      orders: serialized
    })
  } catch (error) {
    console.error('Erro ao listar pedidos:', error)
    return NextResponse.json(
      { error: 'Erro ao listar pedidos', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
