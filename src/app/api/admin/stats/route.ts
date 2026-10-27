import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Calcular estatísticas em paralelo para melhor performance
    const [
      totalUsers,
      activeUsers,
      totalPackages,
      pendingWithdrawals,
      totalRevenue,
      cyclesCompleted,
      pendingApprovals,
      monthlyGrowth,
      recentActivity
    ] = await Promise.all([
      // Total de usuários (exceto admin)
      prisma.user.count({
        where: { id: { gt: 1 } }
      }),
      
      // Usuários ativos (com ativação válida)
      prisma.userActivation.count({
        where: {
          expiresAt: { gt: new Date() }
        }
      }),
      
      // Total de pacotes vendidos
      prisma.userPackage.count({
        where: { isActive: true }
      }),
      
      // Saques pendentes
      prisma.transaction.count({
        where: {
          type: 'WITHDRAWAL',
          status: 'PENDING'
        }
      }),
      
      // Receita total (transações de compra completadas)
      prisma.transaction.aggregate({
        where: {
          type: { in: ['PURCHASE', 'PIX_PAYMENT'] },
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      }),
      
      // Ciclos completados
      prisma.cycle.count(),
      
      // Aprovações pendentes (transações pendentes)
      prisma.transaction.count({
        where: {
          status: 'PENDING',
          type: { notIn: ['WITHDRAWAL'] }
        }
      }),
      
      // Crescimento mensal (usuários criados no último mês vs mês anterior)
      calculateMonthlyGrowth(),
      
      // Atividades recentes
      getRecentActivity()
    ])

    const stats = {
      totalUsers,
      activeUsers,
      totalPackages,
      pendingWithdrawals,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      monthlyGrowth,
      cyclesCompleted,
      pendingApprovals
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentActivity
      }
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas administrativas:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

async function calculateMonthlyGrowth(): Promise<number> {
  try {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    const [currentMonthUsers, lastMonthUsers] = await Promise.all([
      prisma.user.count({
        where: {
          id: { gt: 1 },
          createdAt: { gte: currentMonth }
        }
      }),
      prisma.user.count({
        where: {
          id: { gt: 1 },
          createdAt: { gte: lastMonth, lt: currentMonth }
        }
      })
    ])

    if (lastMonthUsers === 0) {
      return currentMonthUsers > 0 ? 100 : 0
    }

    return Number(((currentMonthUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1))
  } catch (error) {
    console.error('Erro ao calcular crescimento mensal:', error)
    return 0
  }
}

interface RecentActivity {
  id: string
  type: 'user_registration' | 'package_purchase' | 'withdrawal_request' | 'cycle_completed'
  description: string
  timestamp: string
  status: 'success' | 'pending' | 'warning'
}

async function getRecentActivity(): Promise<RecentActivity[]> {
  try {
    const activities: RecentActivity[] = []

    // Últimos usuários registrados
    const recentUsers = await prisma.user.findMany({
      where: { id: { gt: 1 } },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    })

    for (const user of recentUsers) {
      activities.push({
        id: `user_${user.id}`,
        type: 'user_registration',
        description: `Novo usuário: ${user.name} se registrou`,
        timestamp: formatTimeAgo(user.createdAt),
        status: 'success'
      })
    }

    // Últimas compras de pacotes
    const recentPackages = await prisma.userPackage.findMany({
      where: { isActive: true },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: { name: true }
        },
        package: {
          select: { name: true, price: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    })

    for (const pkg of recentPackages) {
      activities.push({
        id: `package_${pkg.id}`,
        type: 'package_purchase',
        description: `${pkg.user.name} comprou pacote ${pkg.package.name} ($${Number(pkg.package.price)})`,
        timestamp: formatTimeAgo(pkg.createdAt),
        status: 'success'
      })
    }

    // Últimas solicitações de saque
    const recentWithdrawals = await prisma.transaction.findMany({
      where: {
        type: 'WITHDRAWAL',
        status: 'PENDING'
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    })

    for (const withdrawal of recentWithdrawals) {
      if (withdrawal.user) {
        activities.push({
          id: `withdrawal_${withdrawal.id}`,
          type: 'withdrawal_request',
          description: `Solicitação de saque: $${Number(withdrawal.amount)} - ${withdrawal.user.name}`,
          timestamp: formatTimeAgo(withdrawal.createdAt),
          status: 'pending'
        })
      }
    }

    // Últimos ciclos completados
    const recentCycles = await prisma.cycle.findMany({
      select: {
        id: true,
        bonusAmount: true,
        completedAt: true,
        user: {
          select: { name: true }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: 3
    })

    for (const cycle of recentCycles) {
      if (cycle.user) {
        activities.push({
          id: `cycle_${cycle.id}`,
          type: 'cycle_completed',
          description: `Ciclo completado: ${cycle.user.name} recebeu $${Number(cycle.bonusAmount)}`,
          timestamp: formatTimeAgo(cycle.completedAt),
          status: 'success'
        })
      }
    }

    // Ordenar por timestamp e retornar os 10 mais recentes
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

  } catch (error) {
    console.error('Erro ao buscar atividades recentes:', error)
    return []
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds} segundos atrás`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'} atrás`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'} atrás`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'} atrás`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'semana' : 'semanas'} atrás`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  return `${diffInMonths} ${diffInMonths === 1 ? 'mês' : 'meses'} atrás`
} 