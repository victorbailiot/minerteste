import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema para adicionar item ao carrinho
const addItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive().default(1)
})

// Schema para atualizar quantidade
const updateItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive()
})

// Schema para remover item
const removeItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional()
})

/**
 * GET /api/store/cart
 * Retorna o carrinho do usuário autenticado
 */
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

    // Buscar ou criar carrinho
    let cart = await prisma.storeCart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                type: true,
                weight: true,
                width: true,
                height: true,
                length: true,
                mainImage: true,
                images: true,
                isActive: true,
                stock: true
              }
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                imageUrl: true,
                attributes: true,
                isActive: true,
                stock: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    // Se não existe carrinho, criar um vazio
    if (!cart) {
      cart = await prisma.storeCart.create({
        data: {
          userId: user.id,
          items: {
            create: []
          }
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  type: true,
                  weight: true,
                  width: true,
                  height: true,
                  length: true,
                  mainImage: true,
                  images: true,
                  isActive: true,
                  stock: true
                }
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  imageUrl: true,
                  attributes: true,
                  isActive: true,
                  stock: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      })
    }

    // Transformar para formato do frontend
    const cartItems = cart.items.map(item => {
      const product = item.product
      const variant = item.variant
      const price = variant ? Number(variant.price) : Number(product.price)
      const imageUrl = variant?.imageUrl || product.mainImage || (product.images && product.images.length > 0 ? product.images[0] : undefined)
      const sku = variant?.sku || product.sku
      const name = variant ? `${product.name} - ${variant.name}` : product.name

      return {
        id: `${item.productId}-${item.variantId || 'no-variant'}`,
        productId: String(product.id),
        variantId: variant ? String(variant.id) : undefined,
        variantName: variant?.name,
        name,
        sku,
        price,
        quantity: item.quantity,
        imageUrl,
        attributes: variant?.attributes || undefined,
        type: product.type,
        weight: product.weight ? Number(product.weight) : undefined,
        width: product.width ? Number(product.width) : undefined,
        height: product.height ? Number(product.height) : undefined,
        length: product.length ? Number(product.length) : undefined
      }
    })

    return NextResponse.json({
      items: cartItems,
      totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    })
  } catch (error) {
    console.error('Erro ao buscar carrinho:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar carrinho' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/store/cart
 * Adiciona item ao carrinho
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { productId, variantId, quantity } = addItemSchema.parse(body)

    // Validar produto
    const product = await prisma.storeProduct.findUnique({
      where: { id: BigInt(productId) },
      select: { id: true, isActive: true, stock: true, type: true }
    })

    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Produto não encontrado ou inativo' }, { status: 404 })
    }

    // Validar variante se fornecida
    if (variantId) {
      const variant = await prisma.storeProductVariant.findUnique({
        where: { id: BigInt(variantId) },
        select: { id: true, isActive: true, stock: true, productId: true }
      })

      if (!variant || !variant.isActive) {
        return NextResponse.json({ error: 'Variante não encontrada ou inativa' }, { status: 404 })
      }

      if (String(variant.productId) !== productId) {
        return NextResponse.json({ error: 'Variante não pertence ao produto' }, { status: 400 })
      }

      if (variant.stock < quantity) {
        return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 })
      }
    } else {
      if (product.stock < quantity) {
        return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 })
      }
    }

    // Buscar ou criar carrinho
    let cart = await prisma.storeCart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: { select: { type: true } }
          }
        }
      }
    })

    if (!cart) {
      cart = await prisma.storeCart.create({
        data: { userId: user.id },
        include: {
          items: {
            include: {
              product: { select: { type: true } }
            }
          }
        }
      })
      // Carrinho novo está vazio - não precisa validar mistura de tipos
    } else {
      // Validar: não permitir misturar produtos físicos com digitais no carrinho
      if (cart.items.length > 0) {
        const cartProductTypes = new Set(cart.items.map(item => item.product.type))
        const newProductType = product.type

        const hasPhysical = cartProductTypes.has('PHYSICAL') || newProductType === 'PHYSICAL'
        const hasDigital = cartProductTypes.has('DIGITAL') || newProductType === 'DIGITAL'

        if (hasPhysical && hasDigital) {
          return NextResponse.json(
            { error: 'Não é possível misturar produtos físicos com digitais no carrinho. Remova os itens do outro tipo antes de adicionar.' },
            { status: 400 }
          )
        }
      }
    }

    // Verificar se item já existe no carrinho
    // Usar findFirst porque variantId pode ser null e o unique constraint não funciona bem com null
    const existingItem = await prisma.storeCartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: BigInt(productId),
        variantId: variantId ? BigInt(variantId) : null
      }
    })

    if (existingItem) {
      // Atualizar quantidade
      const newQuantity = existingItem.quantity + quantity
      
      // Validar estoque novamente
      if (variantId) {
        const variant = await prisma.storeProductVariant.findUnique({
          where: { id: BigInt(variantId) },
          select: { stock: true }
        })
        if (variant && variant.stock < newQuantity) {
          return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 })
        }
      } else {
        if (product.stock < newQuantity) {
          return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 })
        }
      }

      await prisma.storeCartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      })
    } else {
      // Criar novo item
      await prisma.storeCartItem.create({
        data: {
          cartId: cart.id,
          productId: BigInt(productId),
          variantId: variantId ? BigInt(variantId) : null,
          quantity
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao adicionar item ao carrinho:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar item ao carrinho' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/store/cart
 * Atualiza quantidade de um item no carrinho
 */
export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { productId, variantId, quantity } = updateItemSchema.parse(body)

    // Buscar carrinho
    const cart = await prisma.storeCart.findUnique({
      where: { userId: user.id }
    })

    if (!cart) {
      return NextResponse.json({ error: 'Carrinho não encontrado' }, { status: 404 })
    }

    // Buscar item
    // Usar findFirst porque variantId pode ser null e o unique constraint não funciona bem com null
    const cartItem = await prisma.storeCartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: BigInt(productId),
        variantId: variantId ? BigInt(variantId) : null
      },
      include: {
        product: { select: { stock: true } },
        variant: { select: { stock: true } }
      }
    })

    if (!cartItem) {
      return NextResponse.json({ error: 'Item não encontrado no carrinho' }, { status: 404 })
    }

    // Validar estoque
    const availableStock = cartItem.variant 
      ? cartItem.variant.stock 
      : cartItem.product.stock

    if (availableStock < quantity) {
      return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 })
    }

    // Atualizar quantidade
    await prisma.storeCartItem.update({
      where: { id: cartItem.id },
      data: { quantity }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar item do carrinho:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar item do carrinho' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/store/cart
 * Remove item do carrinho ou limpa o carrinho
 */
export async function DELETE(request: NextRequest) {
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
    const productId = searchParams.get('productId')
    const variantId = searchParams.get('variantId')
    const clearAll = searchParams.get('clearAll') === 'true'

    // Buscar carrinho
    const cart = await prisma.storeCart.findUnique({
      where: { userId: user.id }
    })

    if (!cart) {
      return NextResponse.json({ success: true })
    }

    if (clearAll) {
      // Limpar todo o carrinho
      await prisma.storeCartItem.deleteMany({
        where: { cartId: cart.id }
      })
    } else if (productId) {
      // Remover item específico
      await prisma.storeCartItem.deleteMany({
        where: {
          cartId: cart.id,
          productId: BigInt(productId),
          variantId: variantId ? BigInt(variantId) : null
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover item do carrinho:', error)
    return NextResponse.json(
      { error: 'Erro ao remover item do carrinho' },
      { status: 500 }
    )
  }
}
