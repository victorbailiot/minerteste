import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const querySchema = z.object({
  isActive: z.string().optional().transform(val => val === 'true'),
  minerId: z.string().regex(/^\d+$/).optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    const whereClause: any = {}
    
    if (query.isActive !== undefined) {
      whereClause.isActive = query.isActive
    }

    if (query.minerId) {
      whereClause.packageMiners = {
        some: {
          minerId: BigInt(query.minerId)
        }
      }
    }

    const packages = await prisma.package.findMany({
      where: whereClause,
      include: {
        packageMiners: {
          include: {
            miner: true
          }
        }
      },
      orderBy: {
        price: 'asc'
      }
    })

    // Serializar campos Decimal para número
    const serializedPackages = packages.map(pkg => ({
      ...pkg,
      visibleOnlyForActiveUsers: pkg.visibleOnlyForActiveUsers,
      price: Number(pkg.price),
      profitSharePercent: Number(pkg.profitSharePercent),
      percentExtra: Number(pkg.percentExtra || 0),
      directBonus: Number(pkg.directBonus),
      reactivationAmount: Number(pkg.reactivationAmount),
      reactivationBonus: Number(pkg.reactivationBonus),
      cycleBonus: Number(pkg.cycleBonus),
      binaryBonusPercent: Number(pkg.binaryBonusPercent),
      binaryBonusDailyLimit: Number(pkg.binaryBonusDailyLimit),
      boosted: Number(pkg.boosted),
      id: pkg.id.toString(),
      miners: pkg.packageMiners.map((item) => ({
        id: item.miner.id.toString(),
        name: item.miner.name
      }))
    }))

    return NextResponse.json({
      success: true,
      data: serializedPackages,
      message: 'Pacotes unilevel carregados com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao buscar pacotes unilevel:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar os pacotes unilevel'
      },
      { status: 500 }
    )
  }
} 