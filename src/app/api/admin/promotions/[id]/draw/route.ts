import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    // Usar permissão genérica de admin ou criar específica depois
    if (!await hasPermission(userId, 'promotions.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar promoções' }, { status: 403 })
    }

    const { id } = await params
    const promotionId = BigInt(id)

    // Verificar se a promoção existe
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    })

    if (!promotion) {
      return NextResponse.json(
        { success: false, error: 'Promoção não encontrada' },
        { status: 404 }
      )
    }

    // Buscar todos os cupons da promoção
    const coupons = await prisma.coupon.findMany({
      where: { promotionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            sponsor: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (coupons.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum cupom disponível para sorteio' },
        { status: 400 }
      )
    }

    // Sortear um cupom aleatório
    const randomIndex = Math.floor(Math.random() * coupons.length)
    const winnerCoupon = coupons[randomIndex]

    // Marcar o cupom como ganhador
    await prisma.coupon.update({
      where: { id: winnerCoupon.id },
      data: {
        isWinner: true,
        wonAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        promotion: {
          id: promotion.id.toString(),
          title: promotion.title
        },
        winner: {
          id: winnerCoupon.user.id.toString(),
          name: winnerCoupon.user.name,
          email: winnerCoupon.user.email,
          luckyNumber: winnerCoupon.luckyNumber,
          sponsor: winnerCoupon.user.sponsor ? {
            id: winnerCoupon.user.sponsor.id.toString(),
            name: winnerCoupon.user.sponsor.name,
            email: winnerCoupon.user.sponsor.email
          } : null
        },
        totalCoupons: coupons.length
      }
    })
  } catch (error) {
    console.error('Erro ao sortear cupom:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao realizar sorteio' },
      { status: 500 }
    )
  }
}

