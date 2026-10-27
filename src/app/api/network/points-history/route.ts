// Forçar renderização dinâmica para evitar erro de build
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserPointsHistory } from '@/lib/business-logic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      )
    }

    const userIdBigInt = BigInt(userId)
    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    const pointsData = await getUserPointsHistory(userIdBigInt, start, end)

    return NextResponse.json({
      success: true,
      data: pointsData
    })

  } catch (error) {
    console.error('Erro ao buscar histórico de pontos:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 