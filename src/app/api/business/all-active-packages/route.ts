import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canRenewUserPackage } from '@/lib/package-renewal'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    const userIdBigInt = BigInt(userId)

    // Buscar todos os pacotes ativos do usuário, inclusive os já expirados
    // (cotas expiradas podem ser renovadas uma única vez em "Minhas Cotas")
    const activePackages = await prisma.userPackage.findMany({
      where: {
        userId: userIdBigInt,
        isActive: true
      },
      include: {
        package: true,
        miner: true
      },
      orderBy: {
        package: {
          price: 'asc'
        }
      }
    })

    if (activePackages.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasActivePackages: false,
          activePackages: [],
          totalPackages: 0
        }
      })
    }

    const now = new Date()

    // Mapear os pacotes para o formato de resposta
    const mappedPackages = activePackages.map(pkg => {
      const priceSnapshot = Number(pkg.priceSnapshot)
      const price = Number(pkg.package.price)

      return {
        id: Number(pkg.id),
        name: pkg.package.name,
        price,
        priceSnapshot,
        paidAmount: priceSnapshot > 0 ? priceSnapshot : price,
        isActive: pkg.isActive,
        activatedAt: pkg.activatedAt.toISOString(),
        createdAt: pkg.createdAt.toISOString(),
        expiresAt: pkg.expiresAt?.toISOString() || null,
        renewedDays: pkg.renewedDays ?? null,
        canRenew: canRenewUserPackage(pkg, now),
        miner: pkg.miner
          ? {
              id: Number(pkg.miner.id),
              name: pkg.miner.name,
              city: pkg.miner.city,
              state: pkg.miner.state
            }
          : null,
        package: {
          id: Number(pkg.packageId),
          name: pkg.package.name,
          description: pkg.package.description,
          price,
          points: pkg.package.points,
          profitSharePercent: Number(pkg.package.profitSharePercent),
          isUnilevel: pkg.package.isUnilevel,
          directBonus: Number(pkg.package.directBonus),
          reactivationAmount: Number(pkg.package.reactivationAmount),
          reactivationBonus: Number(pkg.package.reactivationBonus),
          boosted: Number(pkg.package.boosted)
        }
      }
    })

    return NextResponse.json({
      success: true,
      hasActivePackages: true,
      data: {
        activePackages: mappedPackages,
        totalPackages: activePackages.length
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar todos os pacotes ativos:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
