import { NextRequest, NextResponse } from 'next/server'
import { getUserPointsDisplay } from '@/lib/business-logic'
import { getUnilevelUserStats } from '@/lib/business-logic-unilevel'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    const userIdBigInt = BigInt(userId)
    
    // Obter dados de ciclo (ainda usado para compatibilidade)
    const pointsDisplay = await getUserPointsDisplay(userIdBigInt)
    
    // Obter dados unilevel
    const unilevelStats = await getUnilevelUserStats(userIdBigInt)

    return NextResponse.json({
      success: true,
      data: {
        cycle: {
          leftPoints: pointsDisplay.cycle.leftPoints,
          rightPoints: pointsDisplay.cycle.rightPoints,
          majorSide: pointsDisplay.cycle.majorSide,
          minorSide: pointsDisplay.cycle.minorSide,
          canFormCycle: pointsDisplay.cycle.canFormCycle,
          cyclesAvailable: pointsDisplay.cycle.cyclesAvailable,
          nextCycleProgress: pointsDisplay.cycle.nextCycleProgress
        },
        unilevel: {
          totalReferrals: unilevelStats.totalReferrals,
          totalPoints: unilevelStats.totalPoints,
          teamVolume: Number(unilevelStats.teamVolume),
          careerLevel: unilevelStats.careerLevel || 'Sem nível',
          totalBonuses: Number(unilevelStats.totalBonuses),
          directBonuses: Number(unilevelStats.directBonuses),
          indirectBonuses: Number(unilevelStats.indirectBonuses),
          reactivationBonuses: Number(unilevelStats.reactivationBonuses),
          profitShares: Number(unilevelStats.profitShares),
          careerBonuses: Number(unilevelStats.careerBonuses),
          travelBonuses: Number(unilevelStats.travelBonuses)
        }
      }
    })

  } catch (error) {
    console.error('Erro ao obter dados de pontos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 