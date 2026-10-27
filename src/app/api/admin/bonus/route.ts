import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, TransactionType } from '@/generated/prisma'
import { BONUS_TRANSACTION_TYPES } from '@/lib/transaction-types'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parâmetros de filtro
    const type = searchParams.get('type') // DIRECT_BONUS, INDIRECT_BONUS, CYCLE_BONUS, PROFIT_SHARE
    const userId = searchParams.get('userId')
    const sourceUserId = searchParams.get('sourceUserId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Filtros para transactions (bônus)
    const transactionFilters: any = {
      type: {
        in: [...BONUS_TRANSACTION_TYPES]
      }
    }
    
    if (type && type !== 'all') {
      transactionFilters.type = type
    }
    
    if (userId) {
      transactionFilters.userId = BigInt(userId)
    }
    
    if (startDate || endDate) {
      transactionFilters.createdAt = {}
      if (startDate) {
        transactionFilters.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        transactionFilters.createdAt.lte = new Date(endDate)
      }
    }
    
    // Buscar transactions de bônus
    const [transactions, totalTransactions] = await Promise.all([
      prisma.transaction.findMany({
        where: transactionFilters,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              sponsor: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.transaction.count({
        where: transactionFilters
      })
    ])
    
    // Buscar cycles (para CYCLE_BONUS)
    const cycles = await prisma.cycle.findMany({
      where: {
        ...(userId && { userId: BigInt(userId) }),
        ...(startDate || endDate) && {
          completedAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: limit
    })
    
    // Buscar distribuições de lucro
    const profitDistributions = await prisma.profitDistribution.findMany({
      where: {
        ...(userId && { userId: BigInt(userId) }),
        ...(startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        package: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Buscar bônus binários (transações do tipo BINARY_BONUS)
    const binaryBonuses = await prisma.transaction.findMany({
      where: {
        type: TransactionType.BINARY_BONUS,
        ...(userId && { userId: BigInt(userId) }),
        ...(startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Para cada bônus binário, buscar informações adicionais do pacote do usuário
    const binaryBonusesWithDetails = await Promise.all(
      binaryBonuses.map(async (bonus) => {
        // Buscar pacote ativo do usuário na data do bônus
        const userPackage = await prisma.userPackage.findFirst({
          where: {
            userId: bonus.userId!,
            isActive: true,
            createdAt: {
              lte: bonus.createdAt
            }
          },
          include: {
            package: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        // Buscar pontos do usuário na data do bônus (aproximação)
        const pointsHistory = await prisma.userPointsHistory.findMany({
          where: {
            userId: bonus.userId!,
            createdAt: {
              lte: bonus.createdAt
            }
          }
        })

        let leftPoints = 0
        let rightPoints = 0

        for (const record of pointsHistory) {
          if (record.side === 'LEFT') {
            leftPoints += record.points
          } else {
            rightPoints += record.points
          }
        }

        const minorSidePoints = Math.min(leftPoints, rightPoints)

        return {
          ...bonus,
          userPackage,
          leftPoints,
          rightPoints,
          minorSidePoints,
          bonusPercent: userPackage?.package?.binaryBonusPercent || 0,
          dailyLimit: userPackage?.package?.binaryBonusDailyLimit || 0,
          dailyEarned: 0 // Será calculado se necessário
        }
      })
    )
    
    // Buscar histórico de pontos (para entender origem dos bônus)
    const pointsHistory = await prisma.userPointsHistory.findMany({
      where: {
        ...(userId && { userId: BigInt(userId) }),
        ...(sourceUserId && { sourceUserId: BigInt(sourceUserId) }),
        ...(startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        sourceUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        sourcePackage: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })
    
    // Estatísticas resumo
    const stats = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        type: {
          in: [...BONUS_TRANSACTION_TYPES]
        },
        ...(startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) })
          }
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })
    
    // Converter BigInt e Decimal para formato adequado para serialização JSON
    const formatBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'bigint') return obj.toString()
      
      // Tratar valores Decimal do Prisma - múltiplas formas de detecção
      if (obj && typeof obj === 'object') {
        // Verificar se é um Decimal (Prisma usa biblioteca decimal.js)
        if (obj.constructor && (
          obj.constructor.name === 'Decimal' || 
          obj.constructor.name === 'DecimalJS' ||
          typeof obj.toNumber === 'function' ||
          typeof obj.toString === 'function' && obj.d !== undefined // propriedade interna do decimal.js
        )) {
          try {
            return obj.toNumber ? obj.toNumber() : Number(obj.toString())
          } catch (e) {
            return Number(obj.toString())
          }
        }
      }
      
      if (Array.isArray(obj)) return obj.map(formatBigInt)
      if (typeof obj === 'object') {
        const result: any = {}
        for (const [key, value] of Object.entries(obj)) {
          result[key] = formatBigInt(value)
        }
        return result
      }
      return obj
    }
    
    const response = {
      transactions: formatBigInt(transactions),
      cycles: formatBigInt(cycles),
      profitDistributions: formatBigInt(profitDistributions),
      pointsHistory: formatBigInt(pointsHistory),
      binaryBonuses: formatBigInt(binaryBonusesWithDetails),
      stats: formatBigInt(stats),
      pagination: {
        page,
        limit,
        total: totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit)
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Erro ao buscar dados de bônus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 