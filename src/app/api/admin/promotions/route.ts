import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

const createPromotionSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255, 'Título muito longo'),
  description: z.string().optional().nullable(),
  image: z.string().url('URL da imagem inválida').optional().nullable().or(z.literal('')),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().default(true),
  maxCoupons: z.number().int().positive().nullable().optional(),
  triggerType: z.enum(['MANUAL', 'PACKAGE_UPGRADE', 'PACKAGE_PURCHASE']).default('MANUAL'),
  fromPackageId: z.union([z.string(), z.number()]).nullable().optional(),
  toPackageId: z.union([z.string(), z.number()]).nullable().optional(),
  upgradeRules: z.array(z.object({
    fromPackageId: z.union([z.string(), z.number()]).nullable().optional(),
    toPackageId: z.union([z.string(), z.number()])
  })).optional().nullable(),
  sponsorExtraBonusPercent: z.number().min(0).max(100).default(0),
  sponsorPrizeDescription: z.string().optional().nullable(),
  prizesDescription: z.string().optional().nullable(),
  couponsPerAction: z.number().int().min(1).default(1)
})

/**
 * GET /api/admin/promotions
 * Listar todas as promoções com detalhes avançados
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'promotions.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar promoções' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeCoupons = searchParams.get('includeCoupons') === 'true'
    const isActive = searchParams.get('isActive')
    
    const where: any = {}
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const promotions = await prisma.promotion.findMany({
      where,
      include: {
        fromPackage: {
          select: { id: true, name: true, price: true }
        },
        toPackage: {
          select: { id: true, name: true, price: true }
        },
        ...(includeCoupons && {
          _count: {
            select: { coupons: true }
          }
        })
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedPromotions = promotions.map(promo => ({
      id: promo.id.toString(),
      title: promo.title,
      description: promo.description,
      image: promo.image,
      startDate: promo.startDate.toISOString(),
      endDate: promo.endDate.toISOString(),
      isActive: promo.isActive,
      maxCoupons: promo.maxCoupons,
      triggerType: promo.triggerType,
      fromPackageId: promo.fromPackageId?.toString() || null,
      toPackageId: promo.toPackageId?.toString() || null,
      upgradeRules: promo.upgradeRules || null,
      fromPackage: promo.fromPackage ? {
        id: promo.fromPackage.id.toString(),
        name: promo.fromPackage.name,
        price: Number(promo.fromPackage.price)
      } : null,
      toPackage: promo.toPackage ? {
        id: promo.toPackage.id.toString(),
        name: promo.toPackage.name,
        price: Number(promo.toPackage.price)
      } : null,
      sponsorExtraBonusPercent: Number(promo.sponsorExtraBonusPercent || 0),
      sponsorPrizeDescription: promo.sponsorPrizeDescription,
      prizesDescription: promo.prizesDescription,
      couponsPerAction: promo.couponsPerAction || 1,
      createdAt: promo.createdAt.toISOString(),
      updatedAt: promo.updatedAt.toISOString(),
      ...(includeCoupons && {
        couponsCount: (promo as any)._count?.coupons || 0
      })
    }))

    return NextResponse.json({
      success: true,
      data: formattedPromotions
    })

  } catch (error) {
    console.error('❌ Erro ao listar promoções:', error)
    return NextResponse.json(
      { error: 'Erro ao listar promoções', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/promotions
 * Criar nova promoção avançada
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'packages.read')) {
      return NextResponse.json({ error: 'Sem permissão para criar promoções' }, { status: 403 })
    }

    const body = await request.json()
    const data = createPromotionSchema.parse(body)

    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    
    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'Data de término deve ser posterior à data de início' },
        { status: 400 }
      )
    }

    const promotion = await prisma.promotion.create({
      data: {
        title: data.title,
        description: data.description || null,
        image: data.image || null,
        startDate,
        endDate,
        isActive: data.isActive ?? true,
        maxCoupons: data.maxCoupons ?? null,
        triggerType: data.triggerType,
        fromPackageId: data.fromPackageId ? BigInt(data.fromPackageId) : null,
        toPackageId: data.toPackageId ? BigInt(data.toPackageId) : null,
        upgradeRules: data.upgradeRules ? (data.upgradeRules as any) : null,
        sponsorExtraBonusPercent: new Decimal(data.sponsorExtraBonusPercent || 0),
        sponsorPrizeDescription: data.sponsorPrizeDescription || null,
        prizesDescription: data.prizesDescription || null,
        couponsPerAction: data.couponsPerAction || 1
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: promotion.id.toString(),
        title: promotion.title
      },
      message: 'Promoção criada com sucesso'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('❌ Erro ao criar promoção:', error)
    return NextResponse.json(
      { error: 'Erro ao criar promoção', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
