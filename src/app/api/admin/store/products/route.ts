import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  productListQuerySchema,
  createProductSchema,
} from '@/lib/validations/store'

// GET - Listar produtos
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    // Validar query params com tratamento de erro
    let validatedQuery
    try {
      validatedQuery = productListQuerySchema.parse(queryParams)
    } catch (error: any) {
      console.error('Erro de validação de query params:', error)
      return NextResponse.json(
        { 
          error: 'Parâmetros de busca inválidos', 
          details: error?.errors || error?.message || 'Erro na validação dos parâmetros' 
        },
        { status: 400 }
      )
    }

    const where: any = {isActive: true}
    
    if (validatedQuery.search) {
      where.OR = [
        { name: { contains: validatedQuery.search, mode: 'insensitive' } },
        { description: { contains: validatedQuery.search, mode: 'insensitive' } },
        { sku: { contains: validatedQuery.search, mode: 'insensitive' } },
      ]
    }

    if (validatedQuery.categoryId) {
      where.categoryId = BigInt(validatedQuery.categoryId)
    }

    if (validatedQuery.minPrice !== undefined || validatedQuery.maxPrice !== undefined) {
      where.price = {}
      if (validatedQuery.minPrice !== undefined) where.price.gte = validatedQuery.minPrice
      if (validatedQuery.maxPrice !== undefined) where.price.lte = validatedQuery.maxPrice
    }

    if (validatedQuery.inStock !== undefined) {
      where.stock = validatedQuery.inStock ? { gt: 0 } : { lte: 0 }
    }

    if (validatedQuery.featured !== undefined) {
      where.featured = validatedQuery.featured
    }

    if (validatedQuery.tags && validatedQuery.tags.length > 0) {
      where.tags = { hasSome: validatedQuery.tags }
    }

    const orderBy: any = []
    switch (validatedQuery.sortBy) {
      case 'price_asc':
        orderBy.push({ price: 'asc' })
        break
      case 'price_desc':
        orderBy.push({ price: 'desc' })
        break
      case 'name_asc':
        orderBy.push({ name: 'asc' })
        break
      case 'name_desc':
        orderBy.push({ name: 'desc' })
        break
      case 'newest':
        orderBy.push({ createdAt: 'desc' })
        break
      default:
        orderBy.push({ featured: 'desc' }, { createdAt: 'desc' })
    }

    const page = validatedQuery.page || 1
    const pageSize = validatedQuery.pageSize || 20
    const skip = (page - 1) * pageSize

    const [products, total] = await Promise.all([
      prisma.storeProduct.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          },
          _count: {
            select: { reviews: true, variants: true }
          }
        },
        orderBy,
        skip,
        take: pageSize
      }),
      prisma.storeProduct.count({ where })
    ])

    const serialized = products.map(p => ({
      ...p,
      id: p.id.toString(),
      categoryId: p.categoryId.toString(),
      category: p.category ? {
        ...p.category,
        id: p.category.id.toString()
      } : undefined,
      reviewsCount: p._count.reviews,
      variantsCount: p._count.variants
    }))

    return NextResponse.json({
      success: true,
      products: serialized,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Erro ao listar produtos:', error)
    return NextResponse.json(
      { error: 'Erro ao listar produtos', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

// POST - Criar produto
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    
    // Validar e transformar dados (gera slug e sku automaticamente se necessário)
    let validatedData
    try {
      validatedData = createProductSchema.parse(body)
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

    // Garantir que sku e slug existam após o transform
    if (!validatedData.sku || !validatedData.slug) {
      return NextResponse.json(
        { error: 'Erro ao gerar SKU ou slug automaticamente' },
        { status: 500 }
      )
    }

    // Verificar se SKU já existe
    const skuExists = await prisma.storeProduct.findUnique({
      where: { sku: validatedData.sku }
    })

    if (skuExists) {
      return NextResponse.json(
        { error: 'Já existe um produto com este SKU' },
        { status: 400 }
      )
    }

    // Verificar se slug já existe (se já existe, adicionar sufixo numérico)
    let finalSlug = validatedData.slug
    let slugCounter = 1
    while (true) {
      const slugExists = await prisma.storeProduct.findUnique({
        where: { slug: finalSlug }
      })

      if (!slugExists) break

      // Adicionar sufixo numérico ao slug
      finalSlug = `${validatedData.slug}-${slugCounter}`
      slugCounter++

      // Limite de segurança para evitar loop infinito
      if (slugCounter > 1000) {
        return NextResponse.json(
          { error: 'Não foi possível gerar um slug único' },
          { status: 500 }
        )
      }
    }

    validatedData.slug = finalSlug

    const { promotionId, ...createData } = validatedData
    const product = await prisma.storeProduct.create({
      data: {
        ...createData,
        categoryId: BigInt(validatedData.categoryId),
        promotionId: promotionId ? BigInt(promotionId) : null
      },
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
        category: product.category ? {
          ...product.category,
          id: product.category.id.toString()
        } : undefined
      },
      message: 'Produto criado com sucesso'
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar produto:', error)
    return NextResponse.json(
      { error: 'Erro ao criar produto', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
