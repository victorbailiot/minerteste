import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

const updatePromotionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  image: z.string().url().optional().nullable().or(z.literal('')),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
  maxCoupons: z.number().int().positive().nullable().optional(),
  triggerType: z.enum(['MANUAL', 'PACKAGE_UPGRADE', 'PACKAGE_PURCHASE']).optional(),
  fromPackageId: z.union([z.string(), z.number()]).nullable().optional(),
  toPackageId: z.union([z.string(), z.number()]).nullable().optional(),
  upgradeRules: z.array(z.object({
    fromPackageId: z.union([z.string(), z.number()]).nullable().optional(),
    toPackageId: z.union([z.string(), z.number()])
  })).optional().nullable(),
  sponsorExtraBonusPercent: z.number().min(0).max(100).optional(),
  sponsorPrizeDescription: z.string().optional().nullable(),
  prizesDescription: z.string().optional().nullable(),
  couponsPerAction: z.number().int().min(1).optional()
})

/**
 * GET /api/admin/promotions/[id]
 * Buscar promoção específica com detalhes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'promotions.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar promoções' }, { status: 403 })
    }

    const { id } = await params
    const promotionId = BigInt(id)

    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId },
      include: {
        fromPackage: {
          select: { id: true, name: true, price: true }
        },
        toPackage: {
          select: { id: true, name: true, price: true }
        },
        _count: {
          select: { coupons: true }
        }
      }
    })

    if (!promotion) {
      return NextResponse.json({ error: 'Promoção não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: promotion.id.toString(),
        title: promotion.title,
        description: promotion.description,
        image: promotion.image,
        startDate: promotion.startDate.toISOString(),
        endDate: promotion.endDate.toISOString(),
        isActive: promotion.isActive,
        maxCoupons: promotion.maxCoupons,
        triggerType: promotion.triggerType,
        fromPackageId: promotion.fromPackageId?.toString() || null,
        toPackageId: promotion.toPackageId?.toString() || null,
        upgradeRules: promotion.upgradeRules || null,
        fromPackage: promotion.fromPackage ? {
          id: promotion.fromPackage.id.toString(),
          name: promotion.fromPackage.name,
          price: Number(promotion.fromPackage.price)
        } : null,
        toPackage: promotion.toPackage ? {
          id: promotion.toPackage.id.toString(),
          name: promotion.toPackage.name,
          price: Number(promotion.toPackage.price)
        } : null,
        sponsorExtraBonusPercent: Number(promotion.sponsorExtraBonusPercent || 0),
        sponsorPrizeDescription: promotion.sponsorPrizeDescription,
        prizesDescription: promotion.prizesDescription,
        couponsPerAction: promotion.couponsPerAction || 1,
        createdAt: promotion.createdAt.toISOString(),
        updatedAt: promotion.updatedAt.toISOString(),
        couponsCount: (promotion as any)._count?.coupons || 0
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar promoção:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar promoção', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/promotions/[id]
 * Atualizar promoção
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'packages.read')) {
      return NextResponse.json({ error: 'Sem permissão para editar promoções' }, { status: 403 })
    }

    const { id } = await params
    const promotionId = BigInt(id)

    const body = await request.json()
    const data = updatePromotionSchema.parse(body)

    const existingPromotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    })

    if (!existingPromotion) {
      return NextResponse.json({ error: 'Promoção não encontrada' }, { status: 404 })
    }

    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate)
      const endDate = new Date(data.endDate)
      
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'Data de término deve ser posterior à data de início' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.image !== undefined) updateData.image = data.image || null
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate)
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate)
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.maxCoupons !== undefined) updateData.maxCoupons = data.maxCoupons
    if (data.triggerType !== undefined) updateData.triggerType = data.triggerType
    if (data.fromPackageId !== undefined) updateData.fromPackageId = data.fromPackageId ? BigInt(data.fromPackageId) : null
    if (data.toPackageId !== undefined) updateData.toPackageId = data.toPackageId ? BigInt(data.toPackageId) : null
    if (data.upgradeRules !== undefined) updateData.upgradeRules = data.upgradeRules ? (data.upgradeRules as any) : null
    if (data.sponsorExtraBonusPercent !== undefined) updateData.sponsorExtraBonusPercent = new Decimal(data.sponsorExtraBonusPercent || 0)
    if (data.sponsorPrizeDescription !== undefined) updateData.sponsorPrizeDescription = data.sponsorPrizeDescription || null
    if (data.prizesDescription !== undefined) updateData.prizesDescription = data.prizesDescription || null
    if (data.couponsPerAction !== undefined) updateData.couponsPerAction = data.couponsPerAction

    const promotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: {
        id: promotion.id.toString(),
        title: promotion.title
      },
      message: 'Promoção atualizada com sucesso'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('❌ Erro ao atualizar promoção:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar promoção', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/promotions/[id]
 * Deletar promoção
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'packages.read')) {
      return NextResponse.json({ error: 'Sem permissão para deletar promoções' }, { status: 403 })
    }

    const { id } = await params
    const promotionId = BigInt(id)

    const existingPromotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    })

    if (!existingPromotion) {
      return NextResponse.json({ error: 'Promoção não encontrada' }, { status: 404 })
    }

    await prisma.promotion.delete({
      where: { id: promotionId }
    })

    return NextResponse.json({
      success: true,
      message: 'Promoção deletada com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao deletar promoção:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar promoção', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
