import { prisma } from '@/lib/prisma'

interface OrderBonusResult {
  directBonus: number
  indirectBonuses: Array<{ level: number; userId: string; amount: number }>
  pointsGenerated: number
  totalBonuses: number
}

/**
 * Processa bônus e pontos de um pedido da loja
 * Deve ser chamado APÓS o pagamento ser confirmado
 */
export async function processOrderBonuses(orderId: bigint): Promise<OrderBonusResult> {
  console.log(`🎁 Processando bônus do pedido ${orderId}`)

  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: {
      user: {
        include: {
          sponsor: true,
          unilevelUser: {
            include: {
              sponsor: {
                include: {
                  unilevelUser: {
                    include: {
                      careerLevel: true,
                      sponsor: {
                        include: {
                          unilevelUser: {
                            include: {
                              careerLevel: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  if (!order) {
    throw new Error('Pedido não encontrado')
  }

  if (!order.user) {
    throw new Error('Usuário do pedido não encontrado')
  }

  const result: OrderBonusResult = {
    directBonus: 0,
    indirectBonuses: [],
    pointsGenerated: 0,
    totalBonuses: 0
  }

  // Buscar parâmetros de configuração
  const directBonusParam = await prisma.parameter.findUnique({
    where: { key: 'STORE_DIRECT_BONUS_PERCENT' }
  })

  const indirectBonusParam = await prisma.parameter.findUnique({
    where: { key: 'STORE_INDIRECT_BONUS_LEVELS' }
  })

  // Valores padrão se não configurado
  const directBonusPercent = directBonusParam 
    ? parseFloat(directBonusParam.value) / 100 
    : 0.10 // 10% padrão

  const indirectBonusLevels = indirectBonusParam
    ? JSON.parse(indirectBonusParam.value)
    : [0.05, 0.04, 0.03, 0.02, 0.01, 0.01] // 5%, 4%, 3%, 2%, 1%, 1%

  const orderTotal = Number(order.total)

  // 1. BÔNUS DIRETO para o Patrocinador
  if (order.user.sponsorId) {
    const directBonus = orderTotal * directBonusPercent

    await prisma.transaction.create({
      data: {
        userId: order.user.sponsorId,
        type: 'DIRECT_BONUS',
        amount: directBonus,
        description: `Bônus Direto - Pedido Loja #${order.orderNumber}`,
        status: 'COMPLETED',
        paidAt: new Date(),
        referenceId: order.id.toString()
      }
    })

    console.log(`  ✅ Bônus direto: R$ ${directBonus.toFixed(2)} para usuário ${order.user.sponsorId}`)

    result.directBonus = directBonus
    result.totalBonuses += directBonus
  }

  // 2. BÔNUS INDIRETOS (Unilevel) - Níveis 2-7
  let currentSponsor = order.user.sponsor
  let level = 2

  while (currentSponsor && level <= 7 && level - 2 < indirectBonusLevels.length) {
    const bonusPercent = indirectBonusLevels[level - 2]
    const bonusAmount = orderTotal * bonusPercent

    // Verificar se o usuário tem nível de carreira suficiente
    const canReceive = await checkCanReceiveBonusLevel(
      currentSponsor.id, 
      level
    )

    if (canReceive) {
      await prisma.transaction.create({
        data: {
          userId: currentSponsor.id,
          type: 'INDIRECT_BONUS',
          amount: bonusAmount,
          description: `Bônus Indireto Nível ${level} - Pedido #${order.orderNumber}`,
          status: 'COMPLETED',
          paidAt: new Date(),
          level,
          referenceId: order.id.toString()
        }
      })

      console.log(`  ✅ Bônus indireto N${level}: R$ ${bonusAmount.toFixed(2)} para usuário ${currentSponsor.id}`)

      result.indirectBonuses.push({
        level,
        userId: currentSponsor.id.toString(),
        amount: bonusAmount
      })

      result.totalBonuses += bonusAmount
    } else {
      console.log(`  ⏭️  Bônus indireto N${level} bloqueado (carreira insuficiente)`)
    }

    // Subir para o próximo nível
    const nextSponsor = await prisma.user.findUnique({
      where: { id: currentSponsor.id },
      include: {
        sponsor: true,
        unilevelUser: {
          include: {
            careerLevel: true
          }
        }
      }
    })

    currentSponsor = nextSponsor?.sponsor || null
    level++
  }

  // 3. GERAR PONTOS NA REDE
  const pointsGenerated = await generateNetworkPoints(order.user.id, orderTotal)
  result.pointsGenerated = pointsGenerated

  console.log(`🎉 Total de bônus distribuídos: R$ ${result.totalBonuses.toFixed(2)}`)
  console.log(`📊 Pontos gerados: ${pointsGenerated}`)

  return result
}

/**
 * Verifica se o usuário pode receber bônus do nível especificado
 */
async function checkCanReceiveBonusLevel(userId: bigint, level: number): Promise<boolean> {
  const unilevelUser = await prisma.unilevelUser.findUnique({
    where: { userId },
    include: {
      careerLevel: true
    }
  })

  if (!unilevelUser || !unilevelUser.careerLevel) {
    // Sem carreira = apenas nível 2
    return level === 2
  }

  // Verificar se a carreira permite receber bônus deste nível
  const allowedLevels = unilevelUser.careerLevel.indirectBonusLevels

  return allowedLevels >= (level - 1)
}

/**
 * Gera pontos na rede baseado no valor da compra
 */
async function generateNetworkPoints(userId: bigint, orderTotal: number): Promise<number> {
  // Buscar parâmetro de conversão
  const pointsParam = await prisma.parameter.findUnique({
    where: { key: 'STORE_POINTS_PER_REAL' }
  })

  // Padrão: R$20 = 1 ponto
  const reaisPerPoint = pointsParam ? parseFloat(pointsParam.value) : 20

  const points = Math.floor(orderTotal / reaisPerPoint)

  if (points > 0) {
    // Buscar usuário para determinar lado preferido
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredSide: true }
    })

    await prisma.userPointsHistory.create({
      data: {
        userId,
        points,
        packageValue: orderTotal,
        side: user?.preferredSide || 'LEFT',
        description: `Pontos da Loja - Compra de R$ ${orderTotal.toFixed(2)}`,
        pointType: 'ACCRUAL'
      }
    })

    console.log(`  ✅ ${points} pontos gerados para usuário ${userId}`)
  }

  return points
}

/**
 * Registra a criação de parâmetros padrão se não existirem
 */
export async function ensureStoreParameters() {
  const params = [
    {
      key: 'STORE_DIRECT_BONUS_PERCENT',
      value: '10',
      type: 'PERCENTUAL' as const,
      description: 'Percentual de bônus direto nas compras da loja (10 = 10%)',
      status: 'ATIVO' as const
    },
    {
      key: 'STORE_INDIRECT_BONUS_LEVELS',
      value: '[5, 4, 3, 2, 1, 1]',
      type: 'JSON' as const,
      description: 'Percentuais de bônus indireto por nível (níveis 2-7)',
      status: 'ATIVO' as const
    },
    {
      key: 'STORE_POINTS_PER_REAL',
      value: '20',
      type: 'INTEIRO' as const,
      description: 'Quantidade de reais para gerar 1 ponto (20 = R$20 por ponto)',
      status: 'ATIVO' as const
    }
  ]

  for (const param of params) {
    const existing = await prisma.parameter.findUnique({
      where: { key: param.key }
    })

    if (!existing) {
      await prisma.parameter.create({ data: param })
      console.log(`✅ Parâmetro criado: ${param.key}`)
    }
  }
}
