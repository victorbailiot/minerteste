import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Detalhes do produto por slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const product = await prisma.storeProduct.findUnique({
      where: { 
        slug,
        isActive: true
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        _count: {
          select: { reviews: true }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const approvedReviews = product.reviews.filter(r => r.rating > 0)
    const averageRating = approvedReviews.length > 0 
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length 
      : 0

    const serialized = {
      id: product.id.toString(),
      name: product.name,
      description: product.description,
      shortDesc: product.shortDesc,
      sku: product.sku,
      slug: product.slug,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined,
      costPrice: product.costPrice ? Number(product.costPrice) : undefined,
      categoryId: product.categoryId.toString(),
      type: product.type,
      stock: product.stock,
      lowStockAlert: product.lowStockAlert,
      weight: product.weight ? Number(product.weight) : undefined,
      width: product.width ? Number(product.width) : undefined,
      height: product.height ? Number(product.height) : undefined,
      length: product.length ? Number(product.length) : undefined,
      images: product.images,
      mainImage: product.mainImage,
      featured: product.featured,
      isActive: product.isActive,
      tags: product.tags,
      specifications: product.specifications,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      digitalFileUrl: product.type === 'DIGITAL' ? product.digitalFileUrl : undefined,
      generatesCoupon: product.generatesCoupon,
      promotionId: product.promotionId ? product.promotionId.toString() : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      category: product.category ? {
        id: product.category.id.toString(),
        name: product.category.name,
        slug: product.category.slug
      } : undefined,
      variants: product.variants.map(v => ({
        id: v.id.toString(),
        productId: v.productId.toString(),
        name: v.name,
        sku: v.sku,
        price: Number(v.price),
        comparePrice: v.comparePrice ? Number(v.comparePrice) : undefined,
        stock: v.stock,
        attributes: v.attributes,
        imageUrl: v.imageUrl,
        isActive: v.isActive,
        sortOrder: v.sortOrder
      })),
      reviews: product.reviews.map(r => ({
        id: r.id.toString(),
        productId: r.productId.toString(),
        userId: r.userId.toString(),
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isApproved: r.isApproved,
        isVerified: r.isVerified,
        helpfulCount: r.helpfulCount,
        createdAt: r.createdAt,
        user: {
          id: r.user.id.toString(),
          name: r.user.name
        }
      })),
      averageRating: Math.round(averageRating * 10) / 10,
      reviewsCount: product._count.reviews
    }

    return NextResponse.json({
      success: true,
      product: serialized
    })
  } catch (error) {
    console.error('Erro ao buscar produto:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar produto', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
