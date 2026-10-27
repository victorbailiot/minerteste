import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = BigInt(id)

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 })
    }

    // Buscar informações de carreira atual do usuário
    const unilevelUser = await prisma.unilevelUser.findUnique({
      where: { userId: userId },
      select: {
        id: true,
        careerLevelId: true,
        ownPoints: true,
        networkPoints: true,
        totalPoints: true,
        teamVolume: true,
        isActive: true,
        pointsLastUpdated: true,
        careerLevel: {
          select: {
            id: true,
            name: true,
            requiredPoints: true,
            maxTeamVolumePercent: true,
            indirectBonusLevels: true,
            reactivationLevels: true,
            extraProfitPercent: true,
            travelBonus: true,
            travelValue: true,
            requiredDirects: true,
            careerBonusAmount: true,
            careerPrizeDescription: true,
            careerPrizeValue: true
          }
        }
      }
    })

    // Buscar histórico de progressão de carreira
    const careerHistory = await prisma.unilevelUserCareer.findMany({
      where: { userId: userId },
      orderBy: { graduatedAt: 'desc' },
      select: {
        id: true,
        careerId: true,
        totalNetworkPoints: true,
        validPoints: true,
        maxTeamVolumePercent: true,
        graduatedAt: true,
        career: {
          select: {
            id: true,
            name: true,
            requiredPoints: true,
            indirectBonusLevels: true,
            reactivationLevels: true,
            extraProfitPercent: true,
            travelBonus: true,
            travelValue: true,
            careerBonusAmount: true,
            careerPrizeDescription: true,
            careerPrizeValue: true
          }
        }
      }
    })

    // Buscar todos os níveis de carreira para referência
    const allCareerLevels = await prisma.careerLevel.findMany({
      where: { isActive: true },
      orderBy: { requiredPoints: 'asc' },
      select: {
        id: true,
        name: true,
        requiredPoints: true,
        maxTeamVolumePercent: true,
        indirectBonusLevels: true,
        reactivationLevels: true,
        extraProfitPercent: true,
        requiredDirects: true
      }
    })

    // Formatar resposta
    const response = {
      currentLevel: unilevelUser ? {
        levelId: Number(unilevelUser.careerLevelId),
        levelName: unilevelUser.careerLevel?.name || 'Nenhum',
        ownPoints: unilevelUser.ownPoints,
        networkPoints: unilevelUser.networkPoints,
        totalPoints: unilevelUser.totalPoints,
        teamVolume: Number(unilevelUser.teamVolume),
        isActive: unilevelUser.isActive,
        lastUpdated: unilevelUser.pointsLastUpdated.toISOString(),
        benefits: unilevelUser.careerLevel ? {
          requiredPoints: unilevelUser.careerLevel.requiredPoints,
          maxTeamVolumePercent: Number(unilevelUser.careerLevel.maxTeamVolumePercent),
          indirectBonusLevels: unilevelUser.careerLevel.indirectBonusLevels,
          reactivationLevels: unilevelUser.careerLevel.reactivationLevels,
          extraProfitPercent: Number(unilevelUser.careerLevel.extraProfitPercent),
          travelBonus: unilevelUser.careerLevel.travelBonus,
          travelValue: unilevelUser.careerLevel.travelValue ? Number(unilevelUser.careerLevel.travelValue) : null,
          requiredDirects: unilevelUser.careerLevel.requiredDirects,
          careerBonusAmount: unilevelUser.careerLevel.careerBonusAmount ? Number(unilevelUser.careerLevel.careerBonusAmount) : null,
          careerPrizeDescription: unilevelUser.careerLevel.careerPrizeDescription,
          careerPrizeValue: unilevelUser.careerLevel.careerPrizeValue ? Number(unilevelUser.careerLevel.careerPrizeValue) : null
        } : null
      } : null,
      history: careerHistory.map(ch => ({
        id: Number(ch.id),
        levelId: Number(ch.careerId),
        levelName: ch.career.name,
        totalNetworkPoints: ch.totalNetworkPoints,
        validPoints: ch.validPoints,
        maxTeamVolumePercent: Number(ch.maxTeamVolumePercent),
        graduatedAt: ch.graduatedAt.toISOString(),
        benefits: {
          requiredPoints: ch.career.requiredPoints,
          indirectBonusLevels: ch.career.indirectBonusLevels,
          reactivationLevels: ch.career.reactivationLevels,
          extraProfitPercent: Number(ch.career.extraProfitPercent),
          travelBonus: ch.career.travelBonus,
          travelValue: ch.career.travelValue ? Number(ch.career.travelValue) : null,
          careerBonusAmount: ch.career.careerBonusAmount ? Number(ch.career.careerBonusAmount) : null,
          careerPrizeDescription: ch.career.careerPrizeDescription,
          careerPrizeValue: ch.career.careerPrizeValue ? Number(ch.career.careerPrizeValue) : null
        }
      })),
      allLevels: allCareerLevels.map(level => ({
        id: Number(level.id),
        name: level.name,
        requiredPoints: level.requiredPoints,
        maxTeamVolumePercent: Number(level.maxTeamVolumePercent),
        indirectBonusLevels: level.indirectBonusLevels,
        reactivationLevels: level.reactivationLevels,
        extraProfitPercent: Number(level.extraProfitPercent),
        requiredDirects: level.requiredDirects
      }))
    }

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Erro ao buscar informações de carreira:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}




