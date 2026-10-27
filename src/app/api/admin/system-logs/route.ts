import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/generated/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const category = searchParams.get('category')
    const level = searchParams.get('level')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: any = {}
    
    if (category) where.category = category
    if (level) where.level = level
    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } }
      ]
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          level: true,
          category: true,
          message: true,
          details: true,
          metadata: true,
          createdAt: true
        }
      }),
      prisma.systemLog.count({ where })
    ])

    // Estatísticas por categoria
    const categoryStats = await prisma.systemLog.groupBy({
      by: ['category'],
      where,
      _count: {
        category: true
      }
    })

    // Estatísticas por nível
    const levelStats = await prisma.systemLog.groupBy({
      by: ['level'],
      where,
      _count: {
        level: true
      }
    })

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        byCategory: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.category
        })),
        byLevel: levelStats.map(stat => ({
          level: stat.level,
          count: stat._count.level
        }))
      }
    })

  } catch (error) {
    console.error('Erro ao buscar logs do sistema:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Endpoint para limpar logs antigos (apenas para admins)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const result = await prisma.systemLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `${result.count} logs removidos (mais antigos que ${days} dias)`,
      deletedCount: result.count
    })

  } catch (error) {
    console.error('Erro ao limpar logs do sistema:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 