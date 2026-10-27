import { NextRequest, NextResponse } from 'next/server'
import { processPackagePurchaseUnilevel, getCurrentCareerLevel } from '../../../../lib/business-logic-unilevel'
import { prisma } from '../../../../lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { BONUS_TRANSACTION_TYPES } from '../../../../lib/transaction-types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, packageId, sponsorId, correlationID } = body

    console.log('🧪 Testando sistema unilevel...')
    console.log(`   UserId: ${userId}`)
    console.log(`   PackageId: ${packageId}`)
    console.log(`   SponsorId: ${sponsorId || 'NENHUM'}`)
    console.log(`   CorrelationID: ${correlationID || 'NENHUM'}`)

    // Validar dados de entrada
    if (!userId || !packageId) {
      return NextResponse.json(
        { error: 'userId e packageId são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar o pacote para obter o valor
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(packageId) }
    })

    if (!packageData) {
      return NextResponse.json(
        { error: `Pacote unilevel com ID ${packageId} não encontrado` },
        { status: 404 }
      )
    }

    // Processar a compra
    await processPackagePurchaseUnilevel(
      BigInt(userId),
      BigInt(packageId),
      packageData.price,
      sponsorId ? BigInt(sponsorId) : undefined,
      correlationID
    )

    // Buscar dados atualizados
    const unilevelUser = await prisma.unilevelUser.findUnique({
      where: { userId: BigInt(userId) },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },

        bonuses: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    })

    // Buscar pacote ativo separadamente
    const activePackage = await prisma.userPackage.findFirst({
      where: {
        userId: BigInt(userId),
        isUnilevel: true,
        isActive: true
      },
      include: {
        package: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Compra unilevel processada com sucesso',
      data: {
        user: unilevelUser?.user,
        unilevelUser: unilevelUser ? {
          id: Number(unilevelUser.id),
          userId: Number(unilevelUser.userId),
          sponsorId: unilevelUser.sponsorId ? Number(unilevelUser.sponsorId) : null,
          careerLevel: await getCurrentCareerLevel(BigInt(userId)).then(data => data?.careerName || 'Iniciante'),
          monthlyPoints: 0, // Campo removido do modelo
          totalPoints: unilevelUser.totalPoints,
          teamVolume: unilevelUser.teamVolume.toString(),
          isActive: unilevelUser.isActive
        } : null,
        activePackage: activePackage?.package,
        recentBonuses: unilevelUser?.bonuses.map(b => ({
          id: Number(b.id),
          type: b.type,
          amount: b.amount.toString(),
          level: b.level,
          description: b.description,
          createdAt: b.createdAt
        }))
      }
    })

  } catch (error) {
    console.error('❌ Erro no teste unilevel:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Buscar estatísticas gerais
    const [
      totalUsers,
      totalPackages,
      totalCareerLevels,
      totalBonuses,
      totalProfitDistributions
    ] = await Promise.all([
      prisma.unilevelUser.count(),
      prisma.package.count({ where: { isUnilevel: true } }),
      prisma.careerLevel.count(),
      prisma.transaction.count({
        where: {
          type: {
            in: [...BONUS_TRANSACTION_TYPES]
          }
        }
      }),
      prisma.unilevelProfitDistribution.count()
    ])

    // Buscar pacotes ativos
    const packages = await prisma.package.findMany({
      where: { 
        isActive: true,
        isUnilevel: true
      },
      orderBy: { price: 'asc' }
    })

    // Buscar níveis de carreira
    const careerLevels = await prisma.careerLevel.findMany({
      where: { isActive: true },
      orderBy: { requiredPoints: 'asc' }
    })

    // Buscar parâmetros unilevel
    const parameters = await prisma.parameter.findMany({
      where: {
        key: {
          startsWith: 'unilevel_'
        }
      },
      orderBy: { key: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          totalUsers,
          totalPackages,
          totalCareerLevels,
          totalBonuses,
          totalProfitDistributions
        },
        packages: packages.map(p => ({
          id: Number(p.id),
          name: p.name,
          price: p.price.toString(),
          points: p.points,
          directBonus: p.directBonus.toString(),
          profitSharePercent: p.profitSharePercent.toString(),
          reactivationAmount: p.reactivationAmount.toString(),
          reactivationBonus: p.reactivationBonus.toString()
        })),
        careerLevels: careerLevels.map(c => ({
          id: Number(c.id),
          name: c.name,
          requiredPoints: c.requiredPoints,
          maxTeamVolumePercent: c.maxTeamVolumePercent.toString(),
          indirectBonusLevels: c.indirectBonusLevels,
          reactivationLevels: c.reactivationLevels,
          extraProfitPercent: c.extraProfitPercent.toString(),
          travelBonus: c.travelBonus,
          travelValue: c.travelValue?.toString()
        })),
        parameters: parameters.map(p => ({
          key: p.key,
          value: p.value,
          type: p.type,
          description: p.description
        }))
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar dados unilevel:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 