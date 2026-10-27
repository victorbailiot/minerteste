import { NextRequest, NextResponse } from 'next/server'
import { checkAndFormCycles, getUserCycleData } from '@/lib/business-logic'
import { prisma } from '@/lib/prisma'

// Processa ciclos automaticamente (pode ser chamado por cron job)
export async function POST(request: NextRequest) {
  try {
    await checkAndFormCycles()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Ciclos processados com sucesso' 
    })
  } catch (error) {
    console.error('Erro ao processar ciclos:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// Obtém dados de ciclos de um usuário específico
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID do usuário é obrigatório' 
      }, { status: 400 })
    }

    const cycleData = await getUserCycleData(BigInt(userId))
    
    // Buscar histórico de ciclos do usuário
    const cycleHistory = await prisma.cycle.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: {
        current: cycleData,
        history: cycleHistory
      }
    })
  } catch (error) {
    console.error('Erro ao obter dados de ciclos:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 