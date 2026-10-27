/**
 * Endpoint Admin: Recalcular Pontos
 * 
 * Permite recalculo manual de pontos para usuários específicos ou todos
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  recalculateUserPoints, 
  recalculateAllPoints,
  processRecalcQueue 
} from '@/lib/points-calculator'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/points/recalculate
 * 
 * Body:
 * - userId?: number - ID do usuário específico (opcional)
 * - all?: boolean - Recalcular todos os usuários (opcional)
 * - processQueue?: boolean - Processar fila de recalculo (opcional)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e role admin
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, all, processQueue } = body

    // Opção 1: Recalcular usuário específico
    if (userId) {
      console.log(`🔄 Admin solicitou recalculo para usuário ${userId}`)
      
      const result = await recalculateUserPoints(BigInt(userId))
      
      return NextResponse.json({
        success: true,
        message: 'Pontos recalculados com sucesso',
        data: {
          userId,
          ownPoints: result.ownPoints,
          networkPoints: result.networkPoints,
          totalPoints: result.totalPoints
        }
      })
    }

    // Opção 2: Recalcular todos os usuários
    if (all) {
      console.log(`🔄 Admin solicitou recalculo de TODOS os usuários`)
      
      const result = await recalculateAllPoints()
      
      return NextResponse.json({
        success: true,
        message: 'Recalculo geral iniciado',
        data: {
          total: result.total,
          processed: result.processed,
          errors: result.errors
        }
      })
    }

    // Opção 3: Processar fila de recalculo
    if (processQueue) {
      console.log(`🔄 Admin solicitou processamento da fila`)
      
      const batchSize = body.batchSize || 100
      const result = await processRecalcQueue(batchSize)
      
      return NextResponse.json({
        success: true,
        message: 'Fila processada com sucesso',
        data: {
          processed: result.processed,
          errors: result.errors,
          details: result.details
        }
      })
    }

    // Nenhuma opção fornecida
    return NextResponse.json({
      error: 'Forneça userId, all=true ou processQueue=true',
      usage: {
        recalcularUsuario: { userId: 123 },
        recalcularTodos: { all: true },
        processarFila: { processQueue: true, batchSize: 100 }
      }
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Erro no endpoint de recalculo de pontos:', error)
    
    return NextResponse.json({
      error: 'Erro ao recalcular pontos',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

/**
 * GET /api/admin/points/recalculate
 * 
 * Retorna estatísticas da fila de recalculo
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e role admin
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      )
    }

    // Buscar estatísticas
    const stats = await prisma.unilevelUser.groupBy({
      by: ['pointsNeedsRecalc'],
      _count: {
        id: true
      }
    })

    const needsRecalc = stats.find(s => s.pointsNeedsRecalc)?._count.id || 0
    const upToDate = stats.find(s => !s.pointsNeedsRecalc)?._count.id || 0

    // Buscar usuários mais antigos na fila
    const oldestInQueue = await prisma.unilevelUser.findMany({
      where: {
        pointsNeedsRecalc: true,
        isActive: true
      },
      orderBy: {
        pointsLastUpdated: 'asc'
      },
      take: 10,
      select: {
        userId: true,
        pointsLastUpdated: true,
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

    return NextResponse.json({
      success: true,
      stats: {
        needsRecalc,
        upToDate,
        total: needsRecalc + upToDate,
        percentNeedsRecalc: ((needsRecalc / (needsRecalc + upToDate)) * 100).toFixed(2) + '%'
      },
      oldestInQueue: oldestInQueue.map(u => ({
        userId: Number(u.userId),
        name: u.user.name,
        email: u.user.email,
        referralCode: u.user.referralCode,
        totalPoints: u.totalPoints,
        lastUpdated: u.pointsLastUpdated,
        waitingTime: Math.round((Date.now() - u.pointsLastUpdated.getTime()) / 1000 / 60) + ' minutos'
      }))
    })

  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error)
    
    return NextResponse.json({
      error: 'Erro ao buscar estatísticas',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

