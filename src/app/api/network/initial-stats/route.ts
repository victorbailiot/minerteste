import { NextRequest, NextResponse } from 'next/server'
import { getInitialNetworkStats } from '@/lib/initial-network'

export async function GET(request: NextRequest) {
  try {
    // Obter estatísticas da rede inicial
    const stats = await getInitialNetworkStats()

    return NextResponse.json({
      success: true,
      stats,
      message: stats.shouldUseInitialLogic
        ? `Fase inicial ativa - ${10 - stats.totalUsers} usuários restantes`
        : 'Usando spillover normal (mais de 10 usuários)'
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas iniciais:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
} 