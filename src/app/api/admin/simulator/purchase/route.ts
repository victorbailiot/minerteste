import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processPackagePurchase, getUserFinancialData } from '@/lib/business-logic'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, packageId, simulate = false } = body

    if (!userId || !packageId) {
      return NextResponse.json({
        success: false,
        error: 'userId e packageId são obrigatórios'
      }, { status: 400 })
    }

    // Validar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: {
        sponsor: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 })
    }

    // Validar se o pacote existe
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(packageId) }
    })

    if (!packageData) {
      return NextResponse.json({
        success: false,
        error: 'Pacote não encontrado'
      }, { status: 404 })
    }

    // Capturar estado inicial para comparação
    const initialState = await captureInitialState(BigInt(userId))

    // Logs de simulação
    const logs: string[] = []
    logs.push(`🎬 INÍCIO DA SIMULAÇÃO`)
    logs.push(`👤 Usuário: ${user.name} (ID: ${userId})`)
    logs.push(`📦 Pacote: ${packageData.name} - R$ ${packageData.price}`)
    logs.push(`💰 Valor do pacote: R$ ${packageData.price}`)
    
    if (user.sponsor) {
      logs.push(`🤝 Patrocinador: ${user.sponsor.name} (ID: ${user.sponsor.id})`)
    } else {
      logs.push(`🤝 Patrocinador: Nenhum`)
    }

    logs.push(``)
    logs.push(`🔄 EXECUTANDO LÓGICA DE NEGÓCIO...`)

    // Gerar correlationId único para esta simulação
    const correlationId = `SIM-${Date.now()}-${userId}-${packageId}`

    // Garantir que o sponsor esteja ativo para receber bônus
    if (user.sponsorId) {
      logs.push(`🔄 Verificando ativação do sponsor...`)
      
      // Verificar se o sponsor tem ativação
      const sponsorActivation = await prisma.userActivation.findFirst({
        where: {
          userId: user.sponsorId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() }
        }
      })
      
      // if (!sponsorActivation) {
      //   logs.push(`⚠️  Sponsor não está ativo, criando ativação automática para simulação...`)
        
      //   // Criar ativação automática para o sponsor no simulador
      //   await prisma.userActivation.create({
      //     data: {
      //       userId: user.sponsorId,
      //       type: 'BONUS_CONVERSION',
      //       amount: new Decimal(0),
      //       bonusUsed: new Decimal(0),
      //       conversionPercent: new Decimal(100),
      //       activatedAt: new Date(),
      //       expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      //       status: 'ACTIVE',
      //       correlationID: correlationId
      //     }
      //   })
        
      //   logs.push(`✅ Ativação automática criada para o sponsor`)
      // } else {
      //   logs.push(`✅ Sponsor já está ativo`)
      // }
    }

    // Executar lógica de processamento do pacote
    await processPackagePurchase(
      BigInt(userId),
      BigInt(packageId),
      packageData.price,
      user.sponsorId || undefined,
      correlationId
    )

    logs.push(`✅ Lógica de negócio executada com sucesso`)
    logs.push(``)

    // Capturar estado final para comparação
    const finalState = await captureFinalState(BigInt(userId), correlationId)

    // Calcular diferenças e impactos
    const analysis = await analyzeImpact(initialState, finalState, correlationId)

    logs.push(`📊 ANÁLISE DE IMPACTO:`)
    logs.push(`💵 Total de bônus distribuído: R$ ${analysis.totalBonusDistributed.toFixed(2)}`)
    logs.push(`👥 Usuários impactados: ${analysis.affectedUsers}`)
    logs.push(`📈 Pontos distribuídos: ${analysis.totalPointsDistributed}`)
    logs.push(`🔄 Ciclos formados: ${analysis.cyclesFormed}`)
    logs.push(``)

    // Buscar transações geradas
    const transactions = await prisma.transaction.findMany({
      where: {
        description: { contains: correlationId }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    logs.push(`💳 TRANSAÇÕES GERADAS:`)
    transactions.forEach(tx => {
      logs.push(`   ${tx.type}: R$ ${tx.amount} para ${tx.user?.name || 'Usuário desconhecido'}`)
    })

    // Buscar pontos distribuídos
    const pointsDistributed = await prisma.userPointsHistory.findMany({
      where: {
        description: { contains: correlationId }
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    logs.push(``)
    logs.push(`📊 PONTOS DISTRIBUÍDOS:`)
    pointsDistributed.forEach(point => {
      logs.push(`   ${point.points} pontos ${point.side} para ${point.user.name}`)
    })

    logs.push(``)
    logs.push(`🎉 SIMULAÇÃO CONCLUÍDA COM SUCESSO!`)

    // Preparar resposta detalhada
    const response = {
      success: true,
      message: 'Simulação executada com sucesso',
      data: {
        user: {
          id: Number(user.id),
          name: user.name,
          email: user.email
        },
        package: {
          id: Number(packageData.id),
          name: packageData.name,
          price: Number(packageData.price),
          cycleBonus: Number(packageData.cycleBonus)
        },
        bonuses: {
          directBonus: analysis.directBonus,
          indirectBonuses: analysis.indirectBonuses
        },
        points: {
          leftPoints: analysis.leftPoints,
          rightPoints: analysis.rightPoints,
          totalPoints: analysis.totalPointsDistributed
        },
        cycles: analysis.cyclesFormed,
        transactions: transactions.map(tx => ({
          type: tx.type,
          amount: Number(tx.amount),
          description: tx.description,
          recipientId: Number(tx.user?.id || 0),
          recipientName: tx.user?.name || 'Usuário desconhecido'
        })),
        networkImpact: {
          affectedUsers: analysis.affectedUsers,
          totalBonusDistributed: analysis.totalBonusDistributed
        },
        logs
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erro na simulação:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Capturar estado inicial do sistema
async function captureInitialState(userId: bigint) {
  const [userFinancial, allTransactions, allPoints] = await Promise.all([
    getUserFinancialData(userId),
    prisma.transaction.count(),
    prisma.userPointsHistory.findMany({
      select: {
        userId: true,
        points: true,
        side: true
      }
    })
  ])

  return {
    userBalance: userFinancial.balance,
    userTotalEarned: userFinancial.totalEarned,
    totalTransactions: allTransactions,
    totalPoints: allPoints.reduce((sum, p) => sum + p.points, 0)
  }
}

// Capturar estado final do sistema
async function captureFinalState(userId: bigint, correlationId: string) {
  const [userFinancial, newTransactions, newPoints] = await Promise.all([
    getUserFinancialData(userId),
    prisma.transaction.findMany({
      where: {
        description: { contains: correlationId }
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    }),
    prisma.userPointsHistory.findMany({
      where: {
        description: { contains: correlationId }
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })
  ])

  return {
    userBalance: userFinancial.balance,
    userTotalEarned: userFinancial.totalEarned,
    newTransactions,
    newPoints
  }
}

// Analisar impacto da simulação
async function analyzeImpact(initialState: any, finalState: any, correlationId: string) {
  const bonusTransactions = finalState.newTransactions.filter((tx: any) => 
    tx.type.includes('BONUS') || tx.type === 'DIRECT_BONUS' || tx.type === 'INDIRECT_BONUS'
  )

  const directBonusTransactions = bonusTransactions.filter((tx: any) => tx.type === 'DIRECT_BONUS')
  const indirectBonusTransactions = bonusTransactions.filter((tx: any) => tx.type === 'INDIRECT_BONUS')

  const totalBonusDistributed = bonusTransactions.reduce((sum: number, tx: any) => 
    sum + Number(tx.amount), 0
  )

  const affectedUserIds = new Set([
    ...finalState.newTransactions.map((tx: any) => tx.user.id),
    ...finalState.newPoints.map((point: any) => point.user.id)
  ])

  const totalPointsDistributed = finalState.newPoints.reduce((sum: number, point: any) => 
    sum + Math.max(0, point.points), 0
  )

  const leftPoints = finalState.newPoints
    .filter((point: any) => point.side === 'LEFT')
    .reduce((sum: number, point: any) => sum + Math.max(0, point.points), 0)

  const rightPoints = finalState.newPoints
    .filter((point: any) => point.side === 'RIGHT')
    .reduce((sum: number, point: any) => sum + Math.max(0, point.points), 0)

  // Buscar ciclos formados
  const cyclesFormed = await prisma.cycle.count({
    where: {
      completedAt: {
        gte: new Date(Date.now() - 60000) // Últimos 60 segundos
      }
    }
  })

  return {
    totalBonusDistributed: totalBonusDistributed || 0,
    affectedUsers: affectedUserIds.size || 0,
    totalPointsDistributed: totalPointsDistributed || 0,
    leftPoints: leftPoints || 0,
    rightPoints: rightPoints || 0,
    cyclesFormed: cyclesFormed || 0,
    directBonus: directBonusTransactions.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0),
    indirectBonuses: indirectBonusTransactions.map((tx: any) => ({
      level: 1, // Simplificado, pode ser refinado
      userId: Number(tx.user?.id || 0),
      userName: tx.user?.name || 'Usuário desconhecido',
      amount: Number(tx.amount || 0)
    })) || []
  }
} 