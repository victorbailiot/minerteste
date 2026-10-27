import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { productListQuerySchema } from '@/lib/validations/store'

// GET - Listar produtos (API Pública)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validated = productListQuerySchema.parse(queryParams)

    const where: any = { 
      isActive: true,
      stock: { gt: 0 } // Apenas produtos em estoque
    }
    
    if (validated.search) {
      where.OR = [
        { name: { contains: validated.search, mode: 'insensitive' } },
        { description: { contains: validated.search, mode: 'insensitive' } },
        { shortDesc: { contains: validated.search, mode: 'insensitive' } }
      ]
    }

    if (validated.categoryId) {
      where.categoryId = BigInt(validated.categoryId)
    }

    if (validated.minPrice !== undefined || validated.maxPrice !== undefined) {
      where.price = {}
      if (validated.minPrice !== undefined) where.price.gte = validated.minPrice
      if (validated.maxPrice !== undefined) where.price.lte = validated.maxPrice
    }

    if (validated.featured) {
      where.featured = true
    }

    if (validated.tags && validated.tags.length > 0) {
      where.tags = { hasSome: validated.tags }
    }

    const orderBy: any = []
    switch (validated.sortBy) {
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

    const page = validated.page || 1
    const pageSize = validated.pageSize || 20
    const skip = (page - 1) * pageSize

    const [products, total] = await Promise.all([
      prisma.storeProduct.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          },
          reviews: {
            where: { isApproved: true },
            select: { rating: true }
          },
          _count: {
            select: { reviews: true }
          }
        },
        orderBy,
        skip,
        take: pageSize
      }),
      prisma.storeProduct.count({ where })
    ])

    const serialized = products.map(p => {
      const approvedReviews = p.reviews.filter(r => r.rating > 0)
      const averageRating = approvedReviews.length > 0 
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length 
        : 0

      return {
        id: p.id.toString(),
        name: p.name,
        description: p.description,
        shortDesc: p.shortDesc,
        sku: p.sku,
        slug: p.slug,
        price: Number(p.price),
        comparePrice: p.comparePrice ? Number(p.comparePrice) : undefined,
        categoryId: p.categoryId.toString(),
        type: p.type,
        stock: p.stock,
        lowStockAlert: p.lowStockAlert,
        images: p.images,
        mainImage: p.mainImage,
        featured: p.featured,
        tags: p.tags,
        generatesCoupon: p.generatesCoupon,
        promotionId: p.promotionId ? p.promotionId.toString() : null,
        createdAt: p.createdAt,
        category: p.category ? {
          id: p.category.id.toString(),
          name: p.category.name,
          slug: p.category.slug
        } : undefined,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewsCount: p._count.reviews
      }
    })

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
