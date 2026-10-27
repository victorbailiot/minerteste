import { NextRequest, NextResponse } from 'next/server'
import { getActivePromotion } from '@/lib/promotion-service'

/**
 * GET /api/promotions/active
 * Buscar promoção ativa (público)
 */
export async function GET(request: NextRequest) {
  try {
    const promotion = await getActivePromotion()

    if (!promotion) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Nenhuma promoção ativa no momento'
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: promotion.id.toString(),
        title: promotion.title,
        description: promotion.description,
        image: promotion.image,
        startDate: promotion.startDate.toISOString(),
        endDate: promotion.endDate.toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar promoção ativa:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar promoção ativa', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

