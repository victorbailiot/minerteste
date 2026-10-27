import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/promotions/hub
 * Retorna todas as campanhas (ativas e com histórico do usuário) e os cupons agrupados
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const now = new Date()

    // 1. Buscar todas as promoções relevantes:
    // - Ou estão ativas
    // - Ou o usuário tem cupons nelas (histórico)
    const promotions = await prisma.promotion.findMany({
      where: {
        OR: [
          { isActive: true },
          {
            coupons: {
              some: { userId }
            }
          }
        ]
      },
      include: {
        coupons: {
          where: { userId },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { coupons: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { endDate: 'desc' }
      ]
    })

    // 2. Formatar e categorizar as promoções
    let totalUserCoupons = 0
    let totalWinningCoupons = 0

    const formattedPromotions = promotions.map(promo => {
      const isCurrentlyActive = promo.isActive && new Date(promo.endDate) >= now
      const userCoupons = promo.coupons.map(c => {
        totalUserCoupons++
        if (c.isWinner) totalWinningCoupons++

        return {
          id: c.id.toString(),
          luckyNumber: c.luckyNumber,
          isWinner: c.isWinner,
          wonAt: c.wonAt?.toISOString() || null,
          sourceType: c.sourceType || 'AUTOMATIC',
          notes: c.notes,
          createdAt: c.createdAt.toISOString()
        }
      })

      return {
        id: promo.id.toString(),
        title: promo.title,
        description: promo.description,
        image: promo.image,
        startDate: promo.startDate.toISOString(),
        endDate: promo.endDate.toISOString(),
        isActive: promo.isActive,
        isCurrentlyActive,
        triggerType: promo.triggerType,
        prizesDescription: promo.prizesDescription,
        sponsorPrizeDescription: promo.sponsorPrizeDescription,
        sponsorExtraBonusPercent: Number(promo.sponsorExtraBonusPercent || 0),
        upgradeRules: promo.upgradeRules,
        userCoupons,
        userCouponsCount: userCoupons.length,
        totalCampaignCouponsCount: promo._count.coupons
      }
    })

    const activePromotions = formattedPromotions.filter(p => p.isCurrentlyActive)
    const endedPromotions = formattedPromotions.filter(p => !p.isCurrentlyActive)

    // Lista plana de todos os cupons do usuário para visualização geral
    const allUserCoupons = formattedPromotions.flatMap(p => 
      p.userCoupons.map(c => ({
        ...c,
        promotionId: p.id,
        promotionTitle: p.title,
        isPromotionActive: p.isCurrentlyActive,
        promotionEndDate: p.endDate
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalUserCoupons,
          totalWinningCoupons,
          activeCampaignsCount: activePromotions.length,
          endedCampaignsCount: endedPromotions.length
        },
        activePromotions,
        endedPromotions,
        allUserCoupons
      }
    })

  } catch (error: any) {
    console.error('Erro no hub de promoções do usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar dados de promoções', message: error.message },
      { status: 500 }
    )
  }
}
