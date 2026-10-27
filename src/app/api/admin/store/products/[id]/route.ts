import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  updateProductSchema,
  productIdSchema,
} from '@/lib/validations/store'

// GET - Buscar produto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const validated = productIdSchema.parse({ id })
    
    const product = await prisma.storeProduct.findUnique({
      where: { id: BigInt(validated.id), isActive: true },
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        },
        promotion: {
          select: { id: true, title: true }
        },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: { reviews: true, variants: true }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Retornar produto diretamente (sem wrapper) para compatibilidade com a página de edição
    // Converter campos Decimal para Number e BigInt para string
    return NextResponse.json({
      ...product,
      id: product.id.toString(),
      categoryId: product.categoryId.toString(),
      promotionId: product.promotionId?.toString() ?? null,
      promotion: product.promotion ? { ...product.promotion, id: product.promotion.id.toString() } : null,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined,
      costPrice: product.costPrice ? Number(product.costPrice) : undefined,
      weight: product.weight ? Number(product.weight) : undefined,
      width: product.width ? Number(product.width) : undefined,
      height: product.height ? Number(product.height) : undefined,
      length: product.length ? Number(product.length) : undefined,
      category: product.category ? {
        ...product.category,
        id: product.category.id.toString()
      } : undefined,
      variants: product.variants.map(v => ({
        ...v,
        id: v.id.toString(),
        productId: v.productId.toString(),
        price: Number(v.price),
        comparePrice: v.comparePrice ? Number(v.comparePrice) : undefined
      })),
      reviewsCount: product._count.reviews,
      variantsCount: product._count.variants
    })
  } catch (error) {
    console.error('Erro ao buscar produto:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produto', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar produto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const validated = productIdSchema.parse({ id })
    const body = await request.json()
    
    // Validar dados de atualização
    let validatedData
    try {
      validatedData = updateProductSchema.parse(body)
    } catch (error: any) {
      console.error('Erro de validação:', error)
      return NextResponse.json(
        { 
          error: 'Dados inválidos', 
          details: error?.errors || error?.message || 'Erro na validação dos dados' 
        },
        { status: 400 }
      )
    }

    // Verificar se produto existe
    const existing = await prisma.storeProduct.findUnique({
      where: { id: BigInt(validated.id) }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Se mudando SKU, verificar duplicação
    if (validatedData.sku && validatedData.sku !== existing.sku) {
      const skuExists = await prisma.storeProduct.findUnique({
        where: { sku: validatedData.sku }
      })

      if (skuExists) {
        return NextResponse.json(
          { error: 'Já existe um produto com este SKU' },
          { status: 400 }
        )
      }
    }

    // Se mudando slug, verificar duplicação
    if (validatedData.slug && validatedData.slug !== existing.slug) {
      const slugExists = await prisma.storeProduct.findUnique({
        where: { slug: validatedData.slug }
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'Já existe um produto com este slug' },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização
    const updateData: any = { ...validatedData }
    
    // Converter categoryId para BigInt se fornecido
    if (validatedData.categoryId) {
      updateData.categoryId = BigInt(validatedData.categoryId)
    }

    // Converter promotionId para BigInt ou null se fornecido
    if ('promotionId' in validatedData) {
      updateData.promotionId = validatedData.promotionId ? BigInt(validatedData.promotionId) : null
    }

    // Definir mainImage como primeira imagem se não especificado
    if (validatedData.images && validatedData.images.length > 0 && !validatedData.mainImage) {
      updateData.mainImage = validatedData.images[0]
    }

    const product = await prisma.storeProduct.update({
      where: { id: BigInt(validated.id) },
      data: updateData,
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      product: {
        ...product,
        id: product.id.toString(),
        categoryId: product.categoryId.toString(),
        price: Number(product.price),
        comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined,
        costPrice: product.costPrice ? Number(product.costPrice) : undefined,
        weight: product.weight ? Number(product.weight) : undefined,
        width: product.width ? Number(product.width) : undefined,
        height: product.height ? Number(product.height) : undefined,
        length: product.length ? Number(product.length) : undefined,
        category: product.category ? {
          ...product.category,
          id: product.category.id.toString()
        } : undefined
      },
      message: 'Produto atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar produto:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar produto', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

// DELETE - Remover produto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const validated = productIdSchema.parse({ id })

    // Verificar se produto existe
    const existing = await prisma.storeProduct.findUnique({
      where: { id: BigInt(validated.id) },
      include: {
        _count: {
          select: { 
            orderItems: true,
            reviews: true,
            variants: true
          }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Verificar se tem pedidos associados (não permite excluir para preservar histórico)
    if (existing._count.orderItems > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir. Existem ${existing._count.orderItems} pedido(s) com este produto.` },
        { status: 400 }
      )
    }

    // Hard delete: remove o produto do banco (variantes, reviews e itens do carrinho são removidos em cascade)
    await prisma.storeProduct.delete({
      where: { id: BigInt(validated.id) }
    })

    return NextResponse.json({
      success: true,
      message: 'Produto removido com sucesso'
    })
  } catch (error) {
    console.error('Erro ao remover produto:', error)
    return NextResponse.json(
      { error: 'Erro ao remover produto', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
