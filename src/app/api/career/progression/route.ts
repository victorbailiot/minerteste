import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentCareerLevel, getCareerHistory } from '@/lib/business-logic-unilevel'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    // Buscar nível atual de carreira
    const currentCareer = await getCurrentCareerLevel(userId)
    
    // Buscar histórico de carreira
    const careerHistory = await getCareerHistory(userId)
    
    // Buscar todos os níveis de carreira disponíveis
    const allCareerLevels = await prisma.careerLevel.findMany({
      where: { isActive: true },
      orderBy: { requiredPoints: 'asc' },
      select: {
        id: true,
        name: true,
        requiredPoints: true,
        requiredDirects: true,
        maxTeamVolumePercent: true,
        indirectBonusLevels: true,
        reactivationLevels: true,
        extraProfitPercent: true,
        travelBonus: true,
        travelValue: true,
        careerBonusAmount: true,
        careerPrizeDescription: true,
        careerPrizeValue: true,
        hasPrizeChoice: true,
        pinImageUrl: true,
      }
    })

    // Buscar requisitos de pernas para TODOS os níveis de carreira
    const allCareerLevelsWithLegReqs = await Promise.all(
      allCareerLevels.map(async (level) => {
        const legReqs = await prisma.careerLevelLegRequirement.findMany({
          where: { careerId: level.id },
          include: {
            requiredCareer: { select: { id: true, name: true } }
          },
          orderBy: { legSlot: 'asc' }
        })

        const legReqsFormatted = legReqs.map(r => ({
          legSlot: r.legSlot,
          requiredCareerId: Number(r.requiredCareerId),
          requiredCareerName: r.requiredCareer?.name || '',
          includeIndirects: r.includeIndirects,
          minOccurrences: r.minOccurrences,
          isSatisfied: false, // Será verificado no frontend quando necessário
          satisfiedCount: 0 // Será preenchido no frontend quando necessário
        }))

        return {
          ...level,
          legRequirements: legReqsFormatted
        }
      })
    )

    // Buscar requisitos por perna (será definido mais tarde quando soubermos o próximo nível)

    // Buscar dados do usuário unilevel
    const unilevelUser = await prisma.unilevelUser.findUnique({
      where: { userId },
      select: {
        networkPoints: true,
        ownPoints: true,
        teamVolume: true,
        pointsNeedsRecalc: true,
        pointsLastUpdated: true
      }
    })

    // Buscar diretos do usuário
    const directReferrals = await prisma.unilevelUser.findMany({
      where: { sponsorId: userId },
      select: {
        id: true,
        userId: true,
        totalPoints: true,
        user: {
          select: {
            name: true,
            email: true,
            referralCode: true
          }
        }
      }
    })

    // Calcular progresso para o próximo nível
    let nextLevel: any = null
    let progressToNext: any = null
    let currentLevelIndex = -1

    if (currentCareer) {
      // Usuário tem graduação - calcular progresso para o próximo nível
      currentLevelIndex = allCareerLevelsWithLegReqs.findIndex(level => level.id === currentCareer.careerId)
      
      if (currentLevelIndex >= 0 && currentLevelIndex < allCareerLevelsWithLegReqs.length - 1) {
        const nextLevelData = allCareerLevelsWithLegReqs[currentLevelIndex + 1]
        
        // CORREÇÃO: Para o progresso para o próximo nível, usar o VME do próximo nível
        // Isso mostra quantos pontos válidos o usuário terá no próximo nível
        const nextLevelMaxTeamVolumePercent = nextLevelData.maxTeamVolumePercent.toNumber() / 100
        
        // Calcular pontos válidos que o usuário terá no próximo nível (baseado no VME do próximo nível)
        const currentValidPoints = directReferrals.reduce((sum, direct) => {
          const validPoints = direct.totalPoints * nextLevelMaxTeamVolumePercent
          return sum + validPoints
        }, 0)
        
        // Calcular pontos válidos necessários para o próximo nível
        const nextLevelRequiredPoints = nextLevelData.requiredPoints
        
        // Calcular quantos pontos adicionais são necessários
        const additionalPointsNeeded = nextLevelRequiredPoints - currentValidPoints
        
        // Calcular percentual de progresso
        const progressPercent = Math.min(100, Math.max(0, (currentValidPoints / nextLevelRequiredPoints) * 100))
        
        nextLevel = {
          id: Number(nextLevelData.id),
          name: nextLevelData.name,
          requiredPoints: nextLevelData.requiredPoints,
          requiredDirects: nextLevelData.requiredDirects,
          maxTeamVolumePercent: nextLevelData.maxTeamVolumePercent.toNumber(),
          indirectBonusLevels: nextLevelData.indirectBonusLevels,
          reactivationLevels: nextLevelData.reactivationLevels,
          extraProfitPercent: nextLevelData.extraProfitPercent.toNumber(),
          travelBonus: nextLevelData.travelBonus,
          travelValue: nextLevelData.travelValue?.toNumber(),
          pinImageUrl: nextLevelData.pinImageUrl || null,
          legRequirements: nextLevelData.legRequirements
        }
        
        progressToNext = {
          currentValidPoints: currentValidPoints,
          requiredPoints: nextLevelRequiredPoints,
          additionalPointsNeeded: Math.max(0, additionalPointsNeeded),
          progressPercent: Math.round(progressPercent),
          maxTeamVolumePercent: nextLevelMaxTeamVolumePercent * 100
        }
      }
    } else if (allCareerLevelsWithLegReqs.length > 0) {
      // Usuário não tem graduação - calcular progresso para o primeiro nível (Cobre)
      const firstLevelData = allCareerLevelsWithLegReqs[0]
      
      // Para usuários sem graduação, usar o VME do primeiro nível
      const firstLevelMaxTeamVolumePercent = firstLevelData.maxTeamVolumePercent.toNumber() / 100
      
      // Calcular pontos válidos que o usuário terá no primeiro nível
      const currentValidPoints = directReferrals.reduce((sum, direct) => {
        const validPoints = direct.totalPoints * firstLevelMaxTeamVolumePercent
        console.log('---------------')
        console.log(`🔍 DEBUG API - Usuário sem graduação - Direto ${direct.user.name}:`)
        console.log(`   Pontos diretos: ${direct.totalPoints}`)
        console.log(`   VME do primeiro nível: ${firstLevelMaxTeamVolumePercent}`)
        console.log(`   Pontos válidos: ${validPoints}`)
        return sum + validPoints
      }, 0)
      
      // Calcular pontos válidos necessários para o primeiro nível
      const firstLevelRequiredPoints = firstLevelData.requiredPoints
      
      // Calcular quantos pontos adicionais são necessários
      const additionalPointsNeeded = firstLevelRequiredPoints - currentValidPoints
      
      // Calcular percentual de progresso
      const progressPercent = Math.min(100, Math.max(0, (currentValidPoints / firstLevelRequiredPoints) * 100))
      
      nextLevel = {
        id: Number(firstLevelData.id),
        name: firstLevelData.name,
        requiredPoints: firstLevelData.requiredPoints,
        requiredDirects: firstLevelData.requiredDirects,
        maxTeamVolumePercent: firstLevelData.maxTeamVolumePercent.toNumber(),
        indirectBonusLevels: firstLevelData.indirectBonusLevels,
        reactivationLevels: firstLevelData.reactivationLevels,
        extraProfitPercent: firstLevelData.extraProfitPercent.toNumber(),
        travelBonus: firstLevelData.travelBonus,
        travelValue: firstLevelData.travelValue?.toNumber(),
        pinImageUrl: firstLevelData.pinImageUrl || null,
        legRequirements: firstLevelData.legRequirements
      }
      
      progressToNext = {
        currentValidPoints: currentValidPoints,
        requiredPoints: firstLevelRequiredPoints,
        additionalPointsNeeded: Math.max(0, additionalPointsNeeded),
        progressPercent: Math.round(progressPercent),
        maxTeamVolumePercent: firstLevelMaxTeamVolumePercent * 100
      }
    }

    // Preparar dados dos diretos para análise
    const directReferralsData = directReferrals.map(direct => {
      // Calcular pontos válidos para o próximo nível ou primeiro nível
      let validPointsForNextLevel = 0
      
      if (nextLevel && progressToNext) {
        // Usuário tem graduação - calcular baseado no próximo nível
        const nextLevelMaxTeamVolumePercent = nextLevel.maxTeamVolumePercent / 100
        validPointsForNextLevel = direct.totalPoints * nextLevelMaxTeamVolumePercent
      } else if (!currentCareer && allCareerLevelsWithLegReqs.length > 0) {
        // Usuário não tem graduação - calcular baseado no primeiro nível (Cobre)
        const firstLevel = allCareerLevelsWithLegReqs[0]
        const firstLevelMaxTeamVolumePercent = firstLevel.maxTeamVolumePercent.toNumber() / 100
        validPointsForNextLevel = direct.totalPoints * firstLevelMaxTeamVolumePercent
      }

      return {
        id: Number(direct.id),
        userId: Number(direct.userId),
        name: direct.user.name,
        referralCode: direct.user.referralCode || undefined,
        totalPoints: direct.totalPoints,
        validPointsForNextLevel
      }
    })

    const networkPoints = unilevelUser?.networkPoints || 0
    console.log(`📊 Total de pontos da rede: ${networkPoints}`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        currentCareer: currentCareer ? {
          id: Number(currentCareer.careerId),
          name: currentCareer.careerName,
          indirectBonusLevels: currentCareer.indirectBonusLevels,
          totalNetworkPoints: currentCareer.totalNetworkPoints,
          validPoints: currentCareer.validPoints,
          maxTeamVolumePercent: currentCareer.maxTeamVolumePercent,
          graduatedAt: currentCareer.graduatedAt.toISOString(),
          pinImageUrl: (allCareerLevelsWithLegReqs.find(l => l.id === currentCareer.careerId)?.pinImageUrl) || null,
          hasPrizeChoice: currentCareer.hasPrizeChoice,
          careerPrizeValue: currentCareer.careerPrizeValue,
          careerPrizeDescription: currentCareer.careerPrizeDescription,
          prizeChoice: currentCareer.prizeChoice,
        } : null,
        careerHistory: careerHistory.map(history => ({
          id: Number(history.careerId),
          name: history.careerName,
          totalNetworkPoints: history.totalNetworkPoints,
          validPoints: history.validPoints,
          maxTeamVolumePercent: history.maxTeamVolumePercent,
          graduatedAt: history.graduatedAt.toISOString(),
          prizeChoice: history.prizeChoice,
          hasPrizeChoice: history.hasPrizeChoice,
          careerPrizeValue: history.careerPrizeValue,
          careerPrizeDescription: history.careerPrizeDescription,
        })),
        allCareerLevels: allCareerLevelsWithLegReqs.map(level => ({
          id: Number(level.id),
          name: level.name,
          requiredPoints: level.requiredPoints,
          requiredDirects: level.requiredDirects,
          maxTeamVolumePercent: level.maxTeamVolumePercent.toNumber(),
          indirectBonusLevels: level.indirectBonusLevels,
          reactivationLevels: level.reactivationLevels,
          extraProfitPercent: level.extraProfitPercent.toNumber(),
          travelBonus: level.travelBonus,
          travelValue: level.travelValue?.toNumber(),
          careerBonusAmount: level.careerBonusAmount?.toNumber(),
          careerPrizeDescription: level.careerPrizeDescription,
          careerPrizeValue: level.careerPrizeValue?.toNumber(),
          hasPrizeChoice: level.hasPrizeChoice,
          pinImageUrl: level.pinImageUrl || null,
          isCurrentLevel: currentCareer?.careerId === level.id,
          isNextLevel: nextLevel?.id === level.id,
          legRequirements: level.legRequirements // Agora todos os níveis têm os requisitos de pernas
        })),
        nextLevel,
        progressToNext,
        userStats: {
          networkPoints: networkPoints, // Pontos da rede (total de pontos do usuário)
          ownPoints: 0, // Pontos próprios (será implementado futuramente)
          teamVolume: Number(unilevelUser?.teamVolume || 0),
          directReferralsCount: directReferrals.length,
          pointsNeedsRecalc: unilevelUser?.pointsNeedsRecalc || false,
          pointsLastUpdated: unilevelUser?.pointsLastUpdated?.toISOString()
        },
        directReferrals: directReferralsData
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar progressão de carreira:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
