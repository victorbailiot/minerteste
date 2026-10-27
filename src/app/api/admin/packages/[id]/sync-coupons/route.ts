import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission, isSuperAdmin } from '@/lib/authorization'
import { createCouponForUser } from '@/lib/promotion-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    
    // Apenas SUPER_ADMIN pode sincronizar cupons
    if (!await isSuperAdmin(userId)) {
      return NextResponse.json({ error: 'Apenas super administradores podem sincronizar cupons' }, { status: 403 })
    }
    
    if (!await hasPermission(userId, 'packages.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar pacotes' }, { status: 403 })
    }

    const { id } = await params
    const packageId = BigInt(id)

    const body = await request.json()
    const targetUserId = BigInt(body.userId)
    const promotionId = BigInt(3) // Promoção ID 3

    // Verificar se a promoção existe
    const promotion = await prisma.promotion.findUnique({
      where: { id: promotionId }
    })

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promoção não encontrada' },
        { status: 404 }
      )
    }

    // Buscar pacote Átomo pelo nome (pode ser "Átomo" ou "atomo")
    const atomoPackage = await prisma.package.findFirst({
      where: {
        id: 7
      }
    })

    console.log(atomoPackage?.name)

    if (!atomoPackage) {
      return NextResponse.json(
        { error: 'Pacote Átomo não encontrado' },
        { status: 404 }
      )
    }

    // Período: 19/12/2025 00:00h até 05/01/2026 23:59h
    // Usar UTC para garantir consistência
    const startDate = new Date('2025-12-19T00:00:00.000Z')
    const endDate = new Date('2026-01-06T06:00:00.000Z')

    // Buscar pacotes Átomo inativos do usuário no período
    const now = new Date()
    const inactiveAtomoPackages = await prisma.userPackage.findMany({
      where: {
        userId: targetUserId,
        packageId: atomoPackage.id,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
      }
    })
    console.log('startDate', startDate)
    console.log('endDate', endDate)
    const inactivePackagesCount = inactiveAtomoPackages.length

    console.log('inactiveAtomoPackages', inactivePackagesCount)

    // Buscar cupons existentes da promoção 3 para o usuário
    const existingCoupons = await prisma.coupon.findMany({
      where: {
        userId: targetUserId,
        promotionId: promotionId
      }
    })

    const existingCouponsCount = existingCoupons.length
    console.log('existingCouponsCount', existingCouponsCount)

    // Calcular quantos cupons precisam ser criados
    const couponsToCreate = Math.max(0, inactivePackagesCount - existingCouponsCount)
    console.log('couponsToCreate', couponsToCreate)

    const createdCoupons: Array<{ id: number; luckyNumber: number }> = []

    // Criar cupons faltantes
    if (couponsToCreate > 0) {
      for (let i = 0; i < couponsToCreate; i++) {
        try {
          const coupon = await createCouponForUser(
            targetUserId,
            promotionId,
            true // skipPeriodValidation = true para admin
          )

          if (coupon) {
            createdCoupons.push({
              id: Number(coupon.id),
              luckyNumber: coupon.luckyNumber
            })
          }
        } catch (error) {
          console.error(`Erro ao criar cupom ${i + 1}/${couponsToCreate}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        inactivePackagesCount,
        existingCouponsCount,
        couponsToCreate,
        createdCoupons,
        message: couponsToCreate > 0
          ? `${createdCoupons.length} cupom(ns) criado(s) com sucesso`
          : 'Usuário já possui a quantidade correta de cupons'
      }
    })

  } catch (error) {
    console.error('Erro ao sincronizar cupons:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível sincronizar os cupons' 
      },
      { status: 500 }
    )
  }
}

