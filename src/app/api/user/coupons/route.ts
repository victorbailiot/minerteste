import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'

/**
 * GET /api/user/coupons
 * Listar cupons do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)

    const coupons = await prisma.coupon.findMany({
      where: { userId },
      include: {
        promotion: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            startDate: true,
            endDate: true,
            isActive: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedCoupons = coupons.map(coupon => ({
      id: coupon.id.toString(),
      promotionId: coupon.promotionId.toString(),
      luckyNumber: coupon.luckyNumber,
      createdAt: coupon.createdAt.toISOString(),
      promotion: {
        id: coupon.promotion.id.toString(),
        title: coupon.promotion.title,
        description: coupon.promotion.description,
        image: coupon.promotion.image,
        startDate: coupon.promotion.startDate.toISOString(),
        endDate: coupon.promotion.endDate.toISOString(),
        isActive: coupon.promotion.isActive
      }
    }))

    return NextResponse.json({
      success: true,
      data: formattedCoupons
    })

  } catch (error) {
    console.error('❌ Erro ao listar cupons do usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao listar cupons', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

