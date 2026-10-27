import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'

/**
 * GET /api/user/promotions/my-coupons?promotionId=X
 * Retorna os números da sorte acumulados pelo usuário na promoção solicitada
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const promotionIdStr = searchParams.get('promotionId')

    const userId = BigInt(user.id)

    const where: any = { userId }
    if (promotionIdStr) {
      where.promotionId = BigInt(promotionIdStr)
    }

    const coupons = await prisma.coupon.findMany({
      where,
      include: {
        promotion: {
          select: {
            id: true,
            title: true,
            prizesDescription: true,
            endDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedCoupons = coupons.map(c => ({
      id: c.id.toString(),
      promotionId: c.promotionId.toString(),
      luckyNumber: c.luckyNumber,
      isWinner: c.isWinner,
      wonAt: c.wonAt?.toISOString() || null,
      sourceType: c.sourceType || 'AUTOMATIC',
      createdAt: c.createdAt.toISOString(),
      promotionTitle: c.promotion.title,
      prizesDescription: c.promotion.prizesDescription,
      endDate: c.promotion.endDate.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: formattedCoupons,
      totalCoupons: formattedCoupons.length
    })

  } catch (error) {
    console.error('Erro ao buscar cupons do usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar números da sorte' },
      { status: 500 }
    )
  }
}
