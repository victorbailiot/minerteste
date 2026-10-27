import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { INCOME_TRANSACTION_TYPES } from '@/lib/transaction-types'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'

    // Calcular datas baseadas no período
    const now = new Date()
    let startDate: Date
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // 1. Novos usuários no período (excluindo usuário sistema ID=1)
    const newUsers = await prisma.user.count({
      where: {
        id: { not: 1 }, // Excluir usuário sistema
        createdAt: {
          gte: startDate,
          lte: now
        }
      }
    })

    // 2. Receita total no período (soma dos pacotes vendidos)
    const revenue = await prisma.transaction.aggregate({
      where: {
        type: {
          in: [...INCOME_TRANSACTION_TYPES]
        },
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      _sum: {
        amount: true
      }
    })

    // 3. Pacotes vendidos no período
    const packagesSold = await prisma.transaction.count({
      where: {
        type: {
          in: [...INCOME_TRANSACTION_TYPES]
        },
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: now
        }
      }
    })

    // 4. Ciclos completados no período
    const cyclesCompleted = await prisma.cycle.count({
      where: {
        completedAt: {
          gte: startDate,
          lte: now
        }
      }
    })

    // 5. Dados mensais dos últimos 6 meses
    const monthlyData = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        
        return Promise.all([
          prisma.user.count({
            where: {
              id: { not: 1 }, // Excluir usuário sistema
              createdAt: {
                gte: monthStart,
                lte: monthEnd
              }
            }
          }),
                     prisma.transaction.aggregate({
             where: {
               type: {
                 in: [...INCOME_TRANSACTION_TYPES]
               },
               status: 'COMPLETED',
               createdAt: {
                 gte: monthStart,
                 lte: monthEnd
               }
             },
             _sum: {
               amount: true
             }
           }),
          prisma.transaction.count({
            where: {
              type: {
                in: [...INCOME_TRANSACTION_TYPES]
              },
              status: 'COMPLETED',
              createdAt: {
                gte: monthStart,
                lte: monthEnd
              }
            }
          })
        ])
      })
    )

    // 6. Distribuição de pacotes
    const packageDistribution = await prisma.package.findMany({
      include: {
        _count: {
          select: {
            userPackages: true
          }
        }
      }
    })

    // 7. Comparação com período anterior
    const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))
    
    const previousNewUsers = await prisma.user.count({
      where: {
        id: { not: 1 }, // Excluir usuário sistema
        createdAt: {
          gte: previousStartDate,
          lte: startDate
        }
      }
    })

    const previousRevenue = await prisma.transaction.aggregate({
      where: {
        type: {
          in: [...INCOME_TRANSACTION_TYPES]
        },
        status: 'COMPLETED',
        createdAt: {
          gte: previousStartDate,
          lte: startDate
        }
      },
      _sum: {
        amount: true
      }
    })

    const previousPackagesSold = await prisma.transaction.count({
      where: {
        type: {
          in: [...INCOME_TRANSACTION_TYPES]
        },
        status: 'COMPLETED',
        createdAt: {
          gte: previousStartDate,
          lte: startDate
        }
      }
    })

    const previousCyclesCompleted = await prisma.cycle.count({
      where: {
        completedAt: {
          gte: previousStartDate,
          lte: startDate
        }
      }
    })

    // Calcular percentuais de crescimento
    const userGrowth = previousNewUsers > 0 ? ((newUsers - previousNewUsers) / previousNewUsers) * 100 : 0
    const currentRevenue = Number(revenue._sum?.amount || 0)
    const previousRevenueAmount = Number(previousRevenue._sum?.amount || 0)
    const revenueGrowth = previousRevenueAmount > 0 
      ? ((currentRevenue - previousRevenueAmount) / previousRevenueAmount) * 100 
      : 0
    const packageGrowth = previousPackagesSold > 0 ? ((packagesSold - previousPackagesSold) / previousPackagesSold) * 100 : 0
    const cycleGrowth = previousCyclesCompleted > 0 ? ((cyclesCompleted - previousCyclesCompleted) / previousCyclesCompleted) * 100 : 0

    // Formatar dados mensais
    const formattedMonthlyData = monthlyData.reverse().map(([users, revenue, packages], index) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - index))
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      
      return {
        month: monthNames[date.getMonth()],
        users,
        revenue: Number(revenue._sum?.amount || 0),
        packages
      }
    })

    // Formatar distribuição de pacotes
    const totalUsers = packageDistribution.reduce((sum, pkg) => sum + pkg._count.userPackages, 0)
    const formattedPackageDistribution = packageDistribution.map((pkg, index) => {
      const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500']
      return {
        name: pkg.name,
        count: pkg._count.userPackages,
        percentage: totalUsers > 0 ? Math.round((pkg._count.userPackages / totalUsers) * 100) : 0,
        color: colors[index] || 'bg-gray-500'
      }
    })

    return NextResponse.json({
      metrics: {
        newUsers,
        revenue: currentRevenue,
        packagesSold,
        cyclesCompleted,
        userGrowth: Math.round(userGrowth),
        revenueGrowth: Math.round(revenueGrowth),
        packageGrowth: Math.round(packageGrowth),
        cycleGrowth: Math.round(cycleGrowth)
      },
      monthlyData: formattedMonthlyData,
      packageDistribution: formattedPackageDistribution
    })

  } catch (error) {
    console.error('Erro ao buscar relatórios:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 