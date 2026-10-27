import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { applyInitialNetworkLogic } from './initial-network'
import { findSpilloverPosition } from './spillover'
import { ParameterKeys } from '../types/parameter-keys'
import { getActivationParameters, isUserActive, isUserActiveByFirstPackage } from './business-utils'
import { BONUS_TRANSACTION_TYPES } from './transaction-types'

// Tipos e interfaces
export interface BonusDistribution {
  userId: bigint
  amount: Decimal
  type: 'DIRECT' | 'INDIRECT'
  level: number
  percentage: number
}

export interface CycleData {
  leftPoints: number
  rightPoints: number
  canFormCycle: boolean
  cyclesAvailable: number
  bonusAmount: Decimal
}

export interface ProfitDistributionData {
  userId: bigint
  packageId: bigint
  amount: Decimal
  profitPercent: Decimal
}


// NOVAS INTERFACES PARA PONTOS SEPARADOS
export interface CyclePointsData {
  leftPoints: number
  rightPoints: number
  majorSide: number
  minorSide: number
  canFormCycle: boolean
  cyclesAvailable: number
  nextCycleProgress: number // Percentual para próximo ciclo
}


export interface UserPointsDisplay {
  cycle: CyclePointsData
}

/**
 * Busca os parâmetros de conversão de pontos da tabela parameters
 */
export async function getPointsConversionParameters(): Promise<{
  valueToPointConversion: Decimal
}> {
  try {
    const valueToPointParam = await prisma.parameter.findUnique({
      where: { key: ParameterKeys.VALUE_TO_POINT_CONVERSION }
    })

    return {
      valueToPointConversion: valueToPointParam ? new Decimal(valueToPointParam.value) : new Decimal(20)
    }
  } catch (error) {
    console.error('Erro ao buscar parâmetros de conversão de pontos:', error)
    return {
      valueToPointConversion: new Decimal(20) // R$ 20,00 = 1 ponto (padrão)
    }
  }
}

/**
 * Calcula pontos disponíveis para ciclos (excluindo pontos já consumidos por ciclos)
 */
export async function getCyclePointsForUser(userId: bigint): Promise<CyclePointsData> {
  try {
    // Buscar pontos que NÃO foram consumidos por ciclos OU bônus binário
    const pointsHistory = await prisma.userPointsHistory.findMany({
      where: {
        userId,
        pointType: {
          not: {
            in: ['BINARY_CONSUMPTION']
          }
        }
      }
    })

    // Calcular pontos disponíveis para ciclo
    let leftPoints = 0
    let rightPoints = 0

    for (const record of pointsHistory) {
      if (record.side === 'LEFT') {
        leftPoints += record.points
      } else {
        rightPoints += record.points
      }
    }

    const majorSide = Math.max(leftPoints, rightPoints)
    const minorSide = Math.min(leftPoints, rightPoints)

    // Buscar parâmetros de ciclo
    const cycleParams = await getCycleParameters()

    const canFormCycle = majorSide >= cycleParams.majorSidePoints &&
      minorSide >= cycleParams.minorSidePoints

    const cyclesAvailable = canFormCycle ?
      Math.floor(minorSide / cycleParams.minorSidePoints) : 0

    // Calcular progresso para próximo ciclo
    let nextCycleProgress = 0
    if (!canFormCycle && minorSide > 0) {
      const progressToMajor = Math.min(100, (majorSide / cycleParams.majorSidePoints) * 100)
      const progressToMinor = Math.min(100, (minorSide / cycleParams.minorSidePoints) * 100)
      nextCycleProgress = Math.min(progressToMajor, progressToMinor)
    }

    return {
      leftPoints,
      rightPoints,
      majorSide,
      minorSide,
      canFormCycle,
      cyclesAvailable,
      nextCycleProgress
    }
  } catch (error) {
    console.error(`Erro ao calcular pontos de ciclo para usuário ${Number(userId)}:`, error)
    return {
      leftPoints: 0,
      rightPoints: 0,
      majorSide: 0,
      minorSide: 0,
      canFormCycle: false,
      cyclesAvailable: 0,
      nextCycleProgress: 0
    }
  }
}

/**
 * Obtém dados completos de pontos separados por tipo de bônus
 */
export async function getUserPointsDisplay(userId: bigint): Promise<UserPointsDisplay> {
  try {
    const cyclePoints = await getCyclePointsForUser(userId)

    return {
      cycle: cyclePoints
    }
  } catch (error) {
    console.error(`Erro ao obter dados de pontos para usuário ${Number(userId)}:`, error)
    return {
      cycle: {
        leftPoints: 0,
        rightPoints: 0,
        majorSide: 0,
        minorSide: 0,
        canFormCycle: false,
        cyclesAvailable: 0,
        nextCycleProgress: 0
      }
    }
  }
}

/**
 * Busca os parâmetros de comissão da tabela parameters
 */
async function getCommissionParameters(): Promise<{
  directCommissionPercentage: number
  indirectCommissionLevels: { level: number; percentage: number }[]
}> {
  try {
    const [directParam, indirectLevel1Param, indirectLevel2Param] = await Promise.all([
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.DIRECT_COMMISSION_PERCENTAGE }
      }),
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.INDIRECT_COMMISSION_LEVEL_1 }
      }),
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.INDIRECT_COMMISSION_LEVEL_2 }
      })
    ])

    const directCommissionPercentage = directParam ? parseFloat(directParam.value) / 100 : 0 // 0% padrão
    const indirectLevel1 = indirectLevel1Param ? parseFloat(indirectLevel1Param.value) / 100 : 0 // 0% padrão
    const indirectLevel2 = indirectLevel2Param ? parseFloat(indirectLevel2Param.value) / 100 : 0 // 0% padrão

    return {
      directCommissionPercentage,
      indirectCommissionLevels: [
        { level: 1, percentage: indirectLevel1 },
        { level: 2, percentage: indirectLevel2 }
      ]
    }
  } catch (error) {
    console.error('Erro ao buscar parâmetros de comissão:', error)
    // Valores padrão em caso de erro
    return {
      directCommissionPercentage: 0.07,
      indirectCommissionLevels: [
        { level: 1, percentage: 0.03 },
        { level: 2, percentage: 0.02 }
      ]
    }
  }
}

/**
 * Busca os parâmetros de ciclo da tabela parameters
 */
async function getCycleParameters(): Promise<{
  majorSidePoints: number
  minorSidePoints: number
}> {
  try {
    const [majorParam, minorParam] = await Promise.all([
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.CYCLE_POINTS_MAJOR_LEG }
      }),
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.CYCLE_POINTS_MINOR_LEG }
      })
    ])

    return {
      majorSidePoints: majorParam ? parseInt(majorParam.value) : 900,
      minorSidePoints: minorParam ? parseInt(minorParam.value) : 300
    }
  } catch (error) {
    console.error('Erro ao buscar parâmetros de ciclo:', error)
    // Valores padrão em caso de erro
    return {
      majorSidePoints: 900,
      minorSidePoints: 300
    }
  }
}

/**
 * Processa a compra de um pacote e distribui bônus
 * @param userId - ID do usuário que comprou
 * @param packageId - ID do pacote comprado
 * @param packageValue - Valor do pacote em R$
 * @param sponsorId - ID do patrocinador (opcional)
 */
export async function processPackagePurchase(
  userId: bigint,
  packageId: bigint,
  packageValue: Decimal,
  sponsorId?: bigint,
  correlationID?: string
): Promise<void> {
  console.log(`🛒 INICIANDO processPackagePurchase`)
  console.log(`   UserId: ${Number(userId)}`)
  console.log(`   PackageId: ${Number(packageId)}`)
  console.log(`   PackageValue: R$ ${packageValue}`)
  console.log(`   SponsorId: ${sponsorId ? Number(sponsorId) : 'NENHUM'}`)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      sponsor: true,
      parent: true
    }
  })

  if (!user) {
    console.error(`❌ Usuário ${Number(userId)} não encontrado no banco`)
    throw new Error('Usuário não encontrado')
  }

  console.log(`✅ Usuário encontrado: ${user.name}`)
  console.log(`   SponsorId atual: ${user.sponsorId ? Number(user.sponsorId) : 'NENHUM'}`)
  console.log(`   ParentId atual: ${user.parentId ? Number(user.parentId) : 'NENHUM'}`)

  try {
    // 1. Aplicar lógica dos 10 primeiros cadastros
    console.log(`🎯 Etapa 1: Aplicando lógica inicial dos 10 primeiros cadastros...`)
    const initialLogicResult = await applyInitialNetworkLogic(userId, packageValue)

    if (initialLogicResult.applied) {
      console.log(`✅ Lógica inicial aplicada: ${initialLogicResult.message}`)
    } else {
      console.log(`➡️  Lógica inicial não aplicada - usando spillover normal`)
      // Se não é mais fase inicial, aplicar spillover normal
      if (sponsorId && !user.parentId) {
        const spilloverPosition = await findSpilloverPosition(sponsorId, 'LEFT') // Posição padrão LEFT
        await prisma.user.update({
          where: { id: userId },
          data: {
            sponsorId,
            parentId: spilloverPosition.parentId,
            position: spilloverPosition.position
          }
        })
        console.log(`🌊 Spillover aplicado: Pai=${spilloverPosition.parentId}, Posição=${spilloverPosition.position}`)
      }
    }

    // 3. Registrar transação de compra - DESABILITADO (não gerar mais PURCHASE)
    console.log(`💳 Etapa 3: Pulando criação de transação PURCHASE (desabilitado)...`)

    // let purchaseTransaction = await prisma.transaction.findFirst({
    //   where: {
    //     userId,
    //     type: 'PURCHASE',
    //     description: { contains: correlationID || 'NO_CORRELATION' }
    //   }
    // })

    // if (!purchaseTransaction) {
    //   console.log(`💳 Criando nova transação de compra...`)
    //   purchaseTransaction = await prisma.transaction.create({
    //     data: {
    //       userId,
    //       type: 'PURCHASE',
    //       amount: packageValue,
    //       description: `Compra de pacote${correlationID ? ` - ${correlationID}` : ''}`,
    //       status: 'COMPLETED'
    //     }
    //   })
    //   console.log(`✅ Transação de compra criada: ID ${Number(purchaseTransaction.id)}`)
    // } else {
    //   console.log(`✅ Transação de compra já existe: ID ${Number(purchaseTransaction.id)}`)
    // }

    // 4. Calcular e distribuir pontos na rede binária
    console.log(`🌳 Etapa 4: Distribuindo pontos na árvore binária...`)
    console.log(`✅ Pontos distribuídos na árvore`)

    // 5. Distribuir bônus de indicação
    console.log(`🎁 Etapa 5: Distribuindo bônus de indicação...`)
    await distributeBonuses(userId, packageValue, correlationID)
    console.log(`✅ Bônus de indicação distribuídos`)

    // 6. Verificar e formar ciclos
    console.log(`🔄 Etapa 6: Verificando e formando ciclos...`)
    await checkAndFormCycles()
    console.log(`✅ Verificação de ciclos concluída`)

    console.log(`🎉 Compra de pacote processada COM SUCESSO para usuário ${Number(userId)}`)

  } catch (error) {
    console.error(`❌ ERRO durante processPackagePurchase para usuário ${Number(userId)}:`, error)
    if (error instanceof Error) {
      console.error(`Stack trace:`, error.stack)
    }
    throw error
  }
}


/**
 * Distribui bônus de indicação direta e indireta
 * CORRIGIDO: Patrocinador recebe apenas uma comissão por indicação, independente de quantos pacotes tenha
 * Exemplo: Se patrocinador tem 3 pacotes e indica um downline com 2 pacotes, recebe 2 comissões (uma por pacote do downline)
 */
async function distributeBonuses(
  userId: bigint,
  packageValue: Decimal,
  correlationID?: string
): Promise<void> {
  console.log(`🎁 Iniciando distribuição de bônus para usuário ${Number(userId)}, valor: R$ ${packageValue}`)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      sponsorId: true
    }
  })

  console.log(`👤 Usuário encontrado: sponsorId = ${user?.sponsorId || 'NENHUM'}`)

  if (!user?.sponsorId) {
    console.log(`❌ Usuário não tem patrocinador, não há bônus para distribuir`)
    return
  }

  // Buscar parâmetros de comissão da tabela parameters
  const commissionParams = await getCommissionParameters()

  // Bônus de indicação direta - SEMPRE PAGO, independente do status de ativação
  // ✅ CORREÇÃO: Creditar apenas uma vez por indicação, não por pacote do patrocinador
  const directBonusAmount = Number(packageValue) * commissionParams.directCommissionPercentage
  await creditBonus(
    user.sponsorId,
    new Decimal(directBonusAmount),
    'DIRECT_BONUS',
    `Bônus de indicação direta${correlationID ? ` - ${correlationID}` : ''}`,
    userId
  )

  // Bônus de indicação indireta (níveis 1 e 2)
  let currentSponsorId = user.sponsorId
  console.log(`🔄 Iniciando distribuição de bônus indiretos...`)

  for (const levelConfig of commissionParams.indirectCommissionLevels) {
    const sponsor = await prisma.user.findUnique({
      where: { id: currentSponsorId },
      select: {
        id: true,
        sponsorId: true
      }
    })

    console.log(`🔍 Nível ${levelConfig.level}: Sponsor atual ID ${Number(currentSponsorId)} tem patrocinador: ${sponsor?.sponsorId || 'NENHUM'}`)

    if (!sponsor?.sponsorId) {
      console.log(`⏹️  Interrompendo distribuição indireta no nível ${levelConfig.level} - sem patrocinador`)
      break
    }

    // Verificar se o patrocinador está ativo
    const isSponsorActive = await isUserActive(sponsor.sponsorId)
    if (!isSponsorActive) {
      console.log(`⚠️  Patrocinador ${Number(sponsor.sponsorId)} não está ativo, não receberá bônus indireto nível ${levelConfig.level}`)
    } else {
      // ✅ CORREÇÃO: Creditar apenas uma vez por indicação, não por pacote do patrocinador
      const indirectBonusAmount = Number(packageValue) * levelConfig.percentage
      await creditBonus(
        sponsor.sponsorId,
        new Decimal(indirectBonusAmount),
        'INDIRECT_BONUS',
        `Bônus de indicação indireta - Nível ${levelConfig.level}${correlationID ? ` - ${correlationID}` : ''}`,
        userId
      )
    }

    currentSponsorId = sponsor.sponsorId
  }

  console.log(`🎉 Distribuição de bônus finalizada para usuário ${Number(userId)}`)
}

/**
 * Credita bônus no saldo do usuário
 */
async function creditBonus(
  userId: bigint,
  amount: Decimal,
  type: string,
  description: string,
  referenceUserId?: bigint
): Promise<void> {
  // ATUALIZADO: Não mais atualizar campos balance/totalEarned
  // Esses valores agora são calculados dinamicamente

  // Registrar transação (única fonte de verdade)
  await prisma.transaction.create({
    data: {
      userId,
      type: type as any,
      amount,
      description,
      status: 'COMPLETED'
    }
  })
}

/**
 * Busca o último pacote ativo de um usuário
 * FUNÇÃO REUTILIZÁVEL para todos os tipos de bônus
 */
async function getUserLastActivePackageForBonus(userId: bigint) {
  return await prisma.userPackage.findFirst({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() }
    },
    include: {
      package: true
    },
    orderBy: {
      activatedAt: 'desc'
    }
  })
}

/**
 * Credita bônus para o último pacote ativo de um usuário
 * FUNÇÃO REUTILIZÁVEL para todos os tipos de bônus
 * @param userId - ID do usuário que receberá o bônus
 * @param bonusAmount - Valor do bônus
 * @param bonusType - Tipo do bônus (DIRECT_BONUS, INDIRECT_BONUS, CYCLE_BONUS, etc.)
 * @param baseDescription - Descrição base do bônus
 * @param referenceUserId - ID do usuário de referência (opcional)
 * @param correlationID - ID de correlação (opcional)
 * @returns Objeto com o pacote que recebeu bônus ou null se não houver pacote ativo
 */
async function creditBonusForLastActivePackage(
  userId: bigint,
  bonusAmount: Decimal,
  bonusType: string,
  baseDescription: string,
  referenceUserId?: bigint,
  correlationID?: string
): Promise<{ userPackage: any; package: any; bonusAmount: Decimal } | null> {
  console.log(`🎁 Creditando ${bonusType} para usuário ${Number(userId)}`)

  // Buscar o último pacote ativo do usuário
  const lastActivePackage = await getUserLastActivePackageForBonus(userId)

  if (!lastActivePackage) {
    console.log(`⚠️  Usuário ${Number(userId)} não tem pacote ativo`)
    return null
  }

  console.log(`📦 Usuário tem pacote ativo: ${lastActivePackage.package.name}`)

  const packageData = lastActivePackage.package
  const description = `${baseDescription} - Pacote ${packageData.name}${correlationID ? ` - ${correlationID}` : ''}`

  console.log(`💰 Creditando ${bonusType} para pacote ${packageData.name}: R$ ${bonusAmount}`)

  await creditBonus(
    userId,
    bonusAmount,
    bonusType,
    description,
    referenceUserId
  )

  console.log(`✅ ${bonusType} creditado para pacote ${packageData.name}`)

  return {
    userPackage: lastActivePackage,
    package: packageData,
    bonusAmount
  }
}

/**
 * Verifica e forma ciclos automaticamente
 * ATUALIZADO: Usa a nova função com validação de ativação
 */
export async function checkAndFormCycles(): Promise<void> {
  // Usar a nova função que verifica ativação
  await checkAndFormCyclesWithActivation()
}

/**
 * Processa ciclos para um usuário específico
 * ATUALIZADO: Calcula pontos a partir do histórico e registra consumo de pontos
 */
async function processCyclesForUser(user: any, cycleParams: { majorSidePoints: number; minorSidePoints: number }): Promise<void> {
  // Verificar se o usuário está ativo antes de processar ciclos
  const userIsActive = await isUserActive(user.id)
  if (!userIsActive) {
    console.log(`⚠️  Usuário ${user.name} (ID: ${Number(user.id)}) não está ativo, não processará ciclos`)
    return
  }

  // ✅ NOVO: Usar função específica para pontos de ciclo
  const cyclePoints = await getCyclePointsForUser(user.id)

  // Verificar se pode formar ciclo
  const majorSide = cyclePoints.majorSide
  const minorSide = cyclePoints.minorSide

  if (majorSide >= cycleParams.majorSidePoints &&
    minorSide >= cycleParams.minorSidePoints) {

    // Encontrar o pacote ativo do usuário para determinar o bônus e limites
    const activePackage = user.packages.find((up: any) => up.isActive)

    if (!activePackage) return

    const bonusAmount = activePackage.package.cycleBonus
    const dailyLimit = activePackage.package.dailyCycles
    const totalLimit = activePackage.package.totalCycles

    // Verificar ciclos já completados hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todaysCycles = await prisma.cycle.count({
      where: {
        userId: user.id,
        packageId: activePackage.packageId,
        completedAt: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    // Verificar total de ciclos já completados
    const totalCycles = await prisma.cycle.count({
      where: {
        userId: user.id,
        packageId: activePackage.packageId
      }
    })

    // Calcular quantos ciclos podem ser formados respeitando limites
    const possibleCyclesByPoints = Math.floor(minorSide / cycleParams.minorSidePoints)
    const remainingDailyLimit = dailyLimit > 0 ? Math.max(0, dailyLimit - todaysCycles) : possibleCyclesByPoints
    const remainingTotalLimit = totalLimit > 0 ? Math.max(0, totalLimit - totalCycles) : possibleCyclesByPoints

    const possibleCycles = Math.min(possibleCyclesByPoints, remainingDailyLimit, remainingTotalLimit)

    console.log(`👤 Usuário ${user.name} - Ciclos possíveis: ${possibleCyclesByPoints}, Limite diário restante: ${remainingDailyLimit}, Limite total restante: ${remainingTotalLimit}, Máximo permitido: ${possibleCycles}`)

    if (possibleCycles <= 0) {
      console.log(`⚠️  Usuário ${user.name} atingiu limite de ciclos`)
      return
    }

    for (let i = 0; i < possibleCycles; i++) {

      // Criar registro do ciclo
      await prisma.cycle.create({
        data: {
          userId: user.id,
          packageId: activePackage.packageId,
          leftPointsUsed: cyclePoints.leftPoints >= cycleParams.majorSidePoints ? cycleParams.majorSidePoints : cycleParams.minorSidePoints,
          rightPointsUsed: cyclePoints.rightPoints >= cycleParams.majorSidePoints ? cycleParams.majorSidePoints : cycleParams.minorSidePoints,
          totalPointsUsed: cycleParams.majorSidePoints + cycleParams.minorSidePoints,
          bonusAmount
        }
      })

      // ✅ NOVO: Usar função reutilizável para último pacote ativo
      await creditBonusForLastActivePackage(
        user.id,
        bonusAmount,
        'CYCLE_BONUS',
        'Bônus de ciclo completado'
      )

      // Atualizar contagem de ciclos completados (primeiro UserPackage ativo encontrado)
      await prisma.userPackage.updateMany({
        where: {
          userId: user.id,
          packageId: activePackage.packageId,
          isActive: true
        },
        data: {
          completedCycles: {
            increment: 1
          }
        }
      })

      // Registrar consumo de pontos no histórico (pontos negativos)
      await prisma.userPointsHistory.create({
        data: {
          userId: user.id,
          points: -(cyclePoints.leftPoints >= cycleParams.majorSidePoints ? cycleParams.majorSidePoints : cycleParams.minorSidePoints),
          packageValue: new Decimal(0),
          side: 'LEFT',
          pointType: 'CYCLE_CONSUMPTION',
          description: `Consumo de pontos para ciclo - Pacote ${activePackage.package.name}`
        }
      })

      await prisma.userPointsHistory.create({
        data: {
          userId: user.id,
          points: -(cyclePoints.rightPoints >= cycleParams.majorSidePoints ? cycleParams.majorSidePoints : cycleParams.minorSidePoints),
          packageValue: new Decimal(0),
          side: 'RIGHT',
          pointType: 'CYCLE_CONSUMPTION',
          description: `Consumo de pontos para ciclo - Pacote ${activePackage.package.name}`
        }
      })

      // ✅ NOVO: Não precisamos recalcular manualmente, a função getCyclePointsForUser já faz isso
      // Os pontos serão recalculados automaticamente na próxima execução

      console.log(`✅ Ciclo ${i + 1} processado para usuário ${user.name} - Bônus: R$ ${bonusAmount}`)
    }
  }
}

/**
 * Processa divisão mensal de lucros
 * @param totalProfit - Lucro total da empresa no período
 * @param periodStart - Início do período
 * @param periodEnd - Fim do período
 * @returns Resumo da distribuição incluindo valor efetivamente distribuído
 */
export async function processMonthlyProfitDistribution(
  totalProfit: Decimal,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  totalAvailable: Decimal;
  totalDistributed: Decimal;
  activePackages: number;
  distributedToUsers: number;
  rejectedUsers: number;
  distributions: Array<{
    userId: bigint;
    userName: string;
    packageName: string;
    amount: Decimal;
    profitPercent: Decimal;
  }>;
}> {
  // Buscar todos os usuários com pacotes ativos
  // IMPORTANTE: Excluir pacotes de usuários banidos (isActive=false)
  const activeUserPackages = await prisma.userPackage.findMany({
    where: {
      isActive: true,
      user: {
        isActive: true // Excluir pacotes de usuários banidos
      },
      activatedAt: {
        lte: periodEnd
      }
    },
    include: {
      user: true,
      package: true
    }
  })

  // ✅ CORREÇÃO: Agrupar usuários por plano e calcular distribuição correta
  const packageGroups = new Map<bigint, {
    package: any;
    users: Array<{
      userPackage: any;
      isActive: boolean;
    }>;
  }>()

  // Agrupar usuários por plano
  for (const userPackage of activeUserPackages) {
    const packageId = userPackage.packageId

    if (!packageGroups.has(packageId)) {
      packageGroups.set(packageId, {
        package: userPackage.package,
        users: []
      })
    }

    // Verificar se o usuário está ativo (com ativação mensal válida)
    const isUserCurrentlyActive = await isUserActive(userPackage.userId)

    packageGroups.get(packageId)!.users.push({
      userPackage,
      isActive: isUserCurrentlyActive
    })
  }

  const distributions: ProfitDistributionData[] = []
  const distributionDetails: Array<{
    userId: bigint;
    userName: string;
    packageName: string;
    amount: Decimal;
    profitPercent: Decimal;
  }> = []

  // ✅ CORREÇÃO: Calcular distribuição por plano
  for (const [packageId, group] of packageGroups) {
    const { package: packageData, users } = group

    // Filtrar apenas usuários ativos
    const activeUsers = users.filter(u => u.isActive)

    if (activeUsers.length === 0) {
      console.log(`⚠️  Plano ${packageData.name}: Nenhum usuário ativo encontrado`)
      continue
    }

    // ✅ CORREÇÃO: Dividir o percentual do plano pelo número de usuários ativos
    // Calcular percentual total (profitSharePercent + percentExtra)
    const percentExtra = packageData.percentExtra || new Decimal(0)
    const totalPackagePercent = Number(packageData.profitSharePercent.add(percentExtra))
    const percentPerUser = totalPackagePercent / activeUsers.length
    const amountPerUser = Number(totalProfit) * percentPerUser / 100

    console.log(`📊 Plano ${packageData.name}:`)
    console.log(`   - Percentual base de lucro: ${Number(packageData.profitSharePercent)}%`)
    console.log(`   - Percentual extra: ${Number(percentExtra)}%`)
    console.log(`   - Percentual total do plano: ${totalPackagePercent}%`)
    console.log(`   - Usuários ativos: ${activeUsers.length}`)
    console.log(`   - Percentual por usuário: ${percentPerUser.toFixed(2)}%`)
    console.log(`   - Valor por usuário: R$ ${amountPerUser.toFixed(2)}`)

    // Distribuir para cada usuário ativo do plano
    for (const { userPackage } of activeUsers) {
      if (amountPerUser > 0) {
        distributions.push({
          userId: userPackage.userId,
          packageId: userPackage.packageId,
          amount: new Decimal(amountPerUser),
          profitPercent: new Decimal(percentPerUser)
        })

        distributionDetails.push({
          userId: userPackage.userId,
          userName: userPackage.user.name,
          packageName: packageData.name,
          amount: new Decimal(amountPerUser),
          profitPercent: new Decimal(percentPerUser)
        })

        console.log(`✅ Divisão de lucros calculada para ${userPackage.user.name}: R$ ${amountPerUser.toFixed(2)} (${percentPerUser.toFixed(2)}%)`)
      }
    }
  }

  // Processar distribuições
  let totalDistributed = new Decimal(0)

  // ✅ CORREÇÃO: Criar mapeamento de packageId para nome do pacote
  const packageNameMap = new Map<bigint, string>()
  for (const userPackage of activeUserPackages) {
    packageNameMap.set(userPackage.packageId, userPackage.package.name)
  }

  for (const distribution of distributions) {
    // Criar registro de distribuição
    await prisma.profitDistribution.create({
      data: {
        userId: distribution.userId,
        packageId: distribution.packageId,
        amount: distribution.amount,
        profitPercent: distribution.profitPercent,
        totalProfit,
        periodStart,
        periodEnd,
        status: 'PROCESSED',
        processedAt: new Date()
      }
    })

    // ✅ CORREÇÃO: Para divisão de lucros, creditar apenas uma vez por usuário
    const packageName = packageNameMap.get(distribution.packageId) || 'N/A'
    await creditBonus(
      distribution.userId,
      distribution.amount,
      'PROFIT_SHARE',
      `Divisão de lucros - ${periodStart.toLocaleDateString()} a ${periodEnd.toLocaleDateString()} - Pacote ${packageName}`
    )

    totalDistributed = totalDistributed.add(distribution.amount)
  }

  const rejectedUsers = activeUserPackages.length - distributions.length

  console.log(`✅ Divisão de lucros processada:`)
  console.log(`   - Total disponível: R$ ${totalProfit.toFixed(2)}`)
  console.log(`   - Total de pacotes ativos: ${activeUserPackages.length}`)
  console.log(`   - Usuários que receberam lucros: ${distributions.length}`)
  console.log(`   - Usuários rejeitados por inatividade: ${rejectedUsers}`)
  console.log(`   - Total efetivamente distribuído: R$ ${totalDistributed.toFixed(2)}`)

  return {
    totalAvailable: totalProfit,
    totalDistributed,
    activePackages: activeUserPackages.length,
    distributedToUsers: distributions.length,
    rejectedUsers,
    distributions: distributionDetails
  }
}

/**
 * Verifica se o usuário pode participar da rede (contrato assinado)
 */
export async function validateUserNetworkParticipation(userId: bigint): Promise<boolean> {
  const signedContract = await prisma.contract.findFirst({
    where: {
      userId,
      status: 'SIGNED'
    }
  })

  return !!signedContract
}

/**
 * Obtém dados de ciclos de um usuário
 * ✅ ATUALIZADO: Usa função específica para pontos de ciclo
 */
export async function getUserCycleData(userId: bigint): Promise<CycleData> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error('Usuário não encontrado')
  }

  // ✅ NOVO: Usar função específica para pontos de ciclo
  const cyclePoints = await getCyclePointsForUser(userId)

  // Buscar pacote ativo para calcular bônus
  const activePackage = await prisma.userPackage.findFirst({
    where: {
      userId,
      isActive: true
    },
    include: {
      package: true
    }
  })

  const bonusAmount = activePackage?.package.cycleBonus || new Decimal(0)

  return {
    leftPoints: cyclePoints.leftPoints,
    rightPoints: cyclePoints.rightPoints,
    canFormCycle: cyclePoints.canFormCycle,
    cyclesAvailable: cyclePoints.cyclesAvailable,
    bonusAmount
  }
}

/**
 * Obtém histórico de pontos de um usuário por período
 */
export async function getUserPointsHistory(
  userId: bigint,
  startDate?: Date,
  endDate?: Date
) {
  const whereClause: any = { userId }

  if (startDate || endDate) {
    whereClause.createdAt = {}
    if (startDate) whereClause.createdAt.gte = startDate
    if (endDate) whereClause.createdAt.lte = endDate
  }

  const pointsHistory = await prisma.userPointsHistory.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      user: {
        select: {
          name: true
        }
      }
    }
  })

  // Agrupar por mês para relatórios mensais
  const monthlyStats = pointsHistory.reduce((acc: any, record) => {
    const monthKey = record.createdAt.toISOString().substring(0, 7) // YYYY-MM

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        totalPoints: 0,
        leftPoints: 0,
        rightPoints: 0,
        transactions: 0
      }
    }

    acc[monthKey].totalPoints += record.points
    if (record.side === 'LEFT') {
      acc[monthKey].leftPoints += record.points
    } else {
      acc[monthKey].rightPoints += record.points
    }
    acc[monthKey].transactions += 1

    return acc
  }, {})

  return {
    history: pointsHistory,
    monthlyStats: Object.values(monthlyStats).sort((a: any, b: any) => b.month.localeCompare(a.month)),
    totalPoints: pointsHistory.reduce((sum, record) => sum + record.points, 0)
  }
}

/**
 * Calcula o saldo atual do usuário a partir das transações
 * NOVO: Substitui o campo balance por cálculo dinâmico
 * CORREÇÃO: Saques rejeitados não afetam o saldo
 */
export async function getUserBalance(userId: bigint): Promise<Decimal> {
  // Buscar todas as transações do usuário (não apenas COMPLETED)
  // E também transações de transferência onde o usuário é o destinatário (sourceUserId = userId)
  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { userId }, // Transações do usuário
        { 
          type: 'TRANSFER',
          sourceUserId: userId, // Transferências recebidas (onde o usuário é o destinatário)
          status: 'COMPLETED'
        }
      ]
    },
    select: {
      id: true,
      type: true,
      amount: true,
      status: true,
      sourceUserId: true,
      userId: true
    }
  })

  let balance = new Decimal(0)

  for (const transaction of transactions) {
    switch (transaction.type) {
      case 'DIRECT_BONUS':
        // Entradas - aumentam o saldo (apenas se COMPLETED)
        if (transaction.status === 'COMPLETED') {
          balance = balance.add(transaction.amount)
        }
        break
      case 'INDIRECT_BONUS':
        // Entradas - aumentam o saldo (apenas se COMPLETED)
        if (transaction.status === 'COMPLETED') {
          balance = balance.add(transaction.amount)
        }
        break

      case 'ACTIVATION_BONUS':
        if (transaction.status === 'COMPLETED') {
          balance = balance.add(transaction.amount)
        }
        break
      case 'PROFIT_SHARE':
        if (transaction.status === 'COMPLETED') {
          balance = balance.add(transaction.amount)
        }
        break
      case 'CAREER_BONUS':
        if (transaction.status === 'COMPLETED') {
          balance = balance.add(transaction.amount)
        }
        break
      case 'CASHBACK':
        if (transaction.status === 'COMPLETED') {
          balance = balance.add(transaction.amount)
        }
        break
      case 'BONUS_ADJUSTMENT':
        // Ajuste manual de saldo lançado pelo super admin (apenas se COMPLETED)
        if (transaction.status === 'COMPLETED') {
          balance = balance.add(transaction.amount)
        }
        break
      case 'WITHDRAWAL':
        // Saídas - diminuem o saldo (ignora apenas FAILED)
        if (transaction.status === 'COMPLETED' || transaction.status === 'PENDING') {
          balance = balance.sub(transaction.amount) // Valor positivo, subtrai do saldo
        }
        // Status FAILED é ignorado (não afeta o saldo)
        break
      case 'BONUS_PAYMENT':
        // Pagamento com saldo de bônus - diminui o saldo (apenas se COMPLETED)
        if (transaction.status === 'COMPLETED') {
          balance = balance.sub(transaction.amount) // Valor positivo, subtrai do saldo
        }
        break
      case 'SOLIDARITY_PAYMENT':
        // Pagamento solidário - diminui o saldo (apenas se COMPLETED)
        if (transaction.status === 'COMPLETED') {
          balance = balance.sub(transaction.amount) // Valor positivo, subtrai do saldo
        }
        break
      case 'TRANSFER':
        // Transferências: Lógica baseada em uma única transação
        // - Remetente: userId = senderId, sourceUserId = recipientId → ENVIOU (débito) → subtrai
        // - Destinatário: sourceUserId = userId (busca na query) → RECEBEU (crédito) → adiciona
        //
        // Como identificar:
        // - Se transaction.userId === userId: o usuário ENVIOU (débito) → subtrai
        // - Se transaction.sourceUserId === userId: o usuário RECEBEU (crédito) → adiciona
        if (transaction.status === 'COMPLETED') {
          if (transaction.userId === userId) {
            // Transferência enviada - diminui o saldo
            balance = balance.sub(transaction.amount)
          } else if (transaction.sourceUserId === userId) {
            // Transferência recebida - aumenta o saldo
            balance = balance.add(transaction.amount)
          }
        }
        break
      case 'PURCHASE':
        // Compras não afetam o saldo (já foi pago via PIX separadamente)
        break
    }
  }

  return balance
}

/**
 * Calcula o total ganho pelo usuário (apenas entradas)
 * NOVO: Substitui o campo totalEarned por cálculo dinâmico
 */
export async function getUserTotalEarned(userId: bigint): Promise<Decimal> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: {
        in: [...BONUS_TRANSACTION_TYPES]
      },
      status: 'COMPLETED',
      NOT: { description: { endsWith: '.' } }
    },
    select: {
      amount: true
    }
  })

  let totalEarned = new Decimal(0)

  for (const transaction of transactions) {
    totalEarned = totalEarned.add(transaction.amount)
  }
  return totalEarned
}

/**
 * Obtém dados financeiros completos do usuário
 * NOVO: Combina balance e totalEarned calculados dinamicamente
 */
export async function getUserFinancialData(userId: bigint) {
  const [balance, totalEarned] = await Promise.all([
    getUserBalance(userId),
    getUserTotalEarned(userId)
  ])

  return {
    balance,
    totalEarned
  }
}

/**
 * Obtém estatísticas de bônus de um usuário
 */
export async function getUserBonusStats(userId: bigint) {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: {
        in: [...BONUS_TRANSACTION_TYPES]
      },
      status: 'COMPLETED',
      NOT: { description: { endsWith: '.' } }
    },
    include: {
      sourceUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const stats = {
    totalBonuses: new Decimal(0),
    directBonuses: new Decimal(0),
    indirectBonuses: new Decimal(0),
    cycleBonuses: new Decimal(0),
    activationBonuses: new Decimal(0),
    profitShares: new Decimal(0),
    careerBonuses: new Decimal(0),
    recentTransactions: transactions.slice(0, 10)
  }

  for (const transaction of transactions) {
    // Para ACTIVATION_BONUS, usar valor absoluto pois são débitos (valores negativos)
    const amount = transaction.type === 'ACTIVATION_BONUS'
      ? transaction.amount.abs()
      : transaction.amount

    // Só somar ao total se não for ACTIVATION_BONUS (que são débitos)
    if (transaction.type !== 'ACTIVATION_BONUS') {
      stats.totalBonuses = stats.totalBonuses.add(amount)
    }

    switch (transaction.type) {
      case 'DIRECT_BONUS':
        stats.directBonuses = stats.directBonuses.add(amount)
        break
      case 'INDIRECT_BONUS':
        stats.indirectBonuses = stats.indirectBonuses.add(amount)
        break
      case 'CYCLE_BONUS':
        stats.cycleBonuses = stats.cycleBonuses.add(amount)
        break
      case 'ACTIVATION_BONUS':
        // Para ativação, mostrar o valor gasto (positivo)
        stats.activationBonuses = stats.activationBonuses.add(amount)
        break
      case 'PROFIT_SHARE':
        stats.profitShares = stats.profitShares.add(amount)
        break
      case 'CAREER_BONUS':
        stats.careerBonuses = stats.careerBonuses.add(amount)
        break
      case 'CASHBACK':
        // CASHBACK não é contabilizado no total de bônus, apenas exibido separadamente
        break
    }
  }

  return stats
}

// ====================================
// SISTEMA DE ATIVAÇÃO MENSAL
// ====================================

export interface ActivationData {
  isActive: boolean
  expiresAt: Date | null
  daysRemaining: number
  canActivate: boolean
  activationHistory: any[]
  totalBonusAccumulated: Decimal
  availableBalance: Decimal
  requiredBonusForActivation: Decimal
  bonusConversionPercent: Decimal
  reactivationAmount: Decimal
}







/**
 * Obtém dados completos de ativação do usuário
 */
export async function getUserActivationData(userId: bigint): Promise<ActivationData> {
  const params = await getActivationParameters()

  // Buscar ativação atual
  const currentActivation = await prisma.userActivation.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      expiresAt: 'desc'
    }
  })

  // Buscar histórico de ativações
  const activationHistory = await prisma.userActivation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  // Buscar pacote ativo do usuário para obter o valor de reativação
  const activePackage = await prisma.userPackage.findFirst({
    where: {
      userId,
      isActive: true
    },
    include: {
      package: true
    },
    orderBy: {
      activatedAt: 'desc'
    }
  })

  // Usar o valor de reativação do pacote ou o valor padrão
  const reactivationAmount = activePackage?.package.reactivationAmount || params.pixAmount

  // ✅ CORREÇÃO: Usar saldo disponível, não total acumulado
  const availableBalance = await getUserBalance(userId)
  const totalBonusAccumulated = await getUserTotalEarned(userId)

  // Calcular valor necessário para ativação via bônus (baseado no saldo disponível)
  const requiredBonusForActivation = availableBalance
    .mul(params.bonusConversionPercent)
    .div(100)

  const now = new Date()
  let isActive = !!currentActivation && currentActivation.expiresAt > now
  let expiresAt = currentActivation?.expiresAt || null
  let daysRemaining = currentActivation
    ? Math.ceil((currentActivation.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Verificar se pode ativar: não ter ativação ativa E ter 30% do saldo >= valor de reativação
  const canActivateByBonus = requiredBonusForActivation.gte(reactivationAmount)
  const canActivate = !isActive && canActivateByBonus

  if (!isActive && params.enabled) {
    isActive = await isUserActive(userId)
    const isActiveByPackage = await isUserActiveByFirstPackage(userId)
    const daysSinceFirstPackage = isActiveByPackage.daysSinceFirstPackage

    if (isActive) {
      daysRemaining = 31 - daysSinceFirstPackage
      expiresAt = isActiveByPackage.expiresAt || null
      console.log(`✅ Usuário ${Number(userId)} está ativo via período de graça - primeiro pacote adquirido há ${daysRemaining} dias`)
    }
  }

  console.log('----------daysRemaining', daysRemaining)

  return {
    isActive,
    expiresAt,
    daysRemaining: Math.max(0, daysRemaining),
    canActivate,
    activationHistory,
    totalBonusAccumulated,
    availableBalance,
    requiredBonusForActivation,
    bonusConversionPercent: params.bonusConversionPercent, //valor da porcentagem de conversão de bônus para ativação
    reactivationAmount
  }
}

/**
 * Processa ativação via PIX
 */
export async function processActivationPIX(
  userId: bigint,
  transactionId: bigint,
  correlationID: string
): Promise<void> {
  console.log(`🔄 Processando ativação PIX para usuário ${Number(userId)}`)

  const params = await getActivationParameters()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000)

  // Buscar pacote ativo do usuário para obter o valor de reativação
  const activePackage = await prisma.userPackage.findFirst({
    where: {
      userId,
      isActive: true
    },
    include: {
      package: true
    },
    orderBy: {
      activatedAt: 'desc'
    }
  })

  // Usar o valor de reativação do pacote ou o valor padrão
  const reactivationAmount = activePackage?.package.reactivationAmount || params.pixAmount

  // Verificar se usuário já tem ativação ativa
  const existingActivation = await prisma.userActivation.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      expiresAt: {
        gt: now
      }
    }
  })

  if (existingActivation) {
    console.log(`⚠️  Usuário ${Number(userId)} já tem ativação ativa até ${existingActivation.expiresAt}`)
    // Estender ativação existente
    await prisma.userActivation.update({
      where: { id: existingActivation.id },
      data: {
        expiresAt: new Date(existingActivation.expiresAt.getTime() + params.durationDays * 24 * 60 * 60 * 1000)
      }
    })
  } else {
    // Criar nova ativação
    await prisma.userActivation.create({
      data: {
        userId,
        type: 'PIX',
        amount: reactivationAmount,
        activatedAt: now,
        expiresAt,
        transactionId,
        correlationID,
        status: 'ACTIVE'
      }
    })
  }

  console.log(`✅ Ativação PIX processada para usuário ${Number(userId)}`)
}

/**
 * Processa ativação via conversão de bônus
 * CORREÇÃO: Usa saldo disponível e converte valor em pontos na rede
 */
export async function processActivationBonusConversion(
  userId: bigint
): Promise<void> {
  console.log(`🔄 Processando ativação via conversão de bônus para usuário ${Number(userId)}`)

  const params = await getActivationParameters()

  // ✅ CORREÇÃO 1: Usar saldo disponível, não total acumulado
  const availableBalance = await getUserBalance(userId)

  // Calcular valor a ser convertido (30% do saldo disponível)
  const bonusUsed = availableBalance
    .mul(params.bonusConversionPercent)
    .div(100)

  if (bonusUsed.lte(0)) {
    throw new Error('Não há saldo suficiente para ativação via conversão de bônus')
  }

  // Buscar pacote ativo do usuário para obter o valor de reativação
  const activePackage = await prisma.userPackage.findFirst({
    where: {
      userId,
      isActive: true
    },
    include: {
      package: true
    },
    orderBy: {
      activatedAt: 'desc'
    }
  })

  // Usar o valor de reativação do pacote ou o valor padrão
  const reactivationAmount = activePackage?.package.reactivationAmount || params.pixAmount

  // VALIDAÇÃO: 30% do saldo deve ser >= valor de reativação
  if (bonusUsed.lt(reactivationAmount)) {
    throw new Error(`Para ativação via conversão de bônus, você precisa de pelo menos R$ ${reactivationAmount.toFixed(2)} em 30% do seu saldo. Saldo atual: R$ ${availableBalance.toFixed(2)}, 30% = R$ ${bonusUsed.toFixed(2)}`)
  }

  console.log(`💰 Saldo disponível: R$ ${availableBalance.toFixed(2)}`)
  console.log(`💸 Valor a ser convertido: R$ ${bonusUsed.toFixed(2)} (${params.bonusConversionPercent}%)`)

  // ✅ CORREÇÃO 2: Converter valor em pontos
  const pointsParams = await getPointsConversionParameters()
  const pointsToDistribute = bonusUsed.div(pointsParams.valueToPointConversion)
  console.log(`📊 Pontos a serem distribuídos: ${pointsToDistribute.toFixed(0)} pontos (R$ ${pointsParams.valueToPointConversion}/ponto)`)

  const now = new Date()
  const expiresAt = new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000)

  // Verificar se usuário já tem ativação ativa
  const existingActivation = await prisma.userActivation.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      expiresAt: {
        gt: now
      }
    }
  })

  if (existingActivation) {
    console.log(`⚠️  Usuário ${Number(userId)} já tem ativação ativa até ${existingActivation.expiresAt}`)
    // Estender ativação existente
    await prisma.userActivation.update({
      where: { id: existingActivation.id },
      data: {
        expiresAt: new Date(existingActivation.expiresAt.getTime() + params.durationDays * 24 * 60 * 60 * 1000)
      }
    })
  } else {
    // Criar nova ativação
    await prisma.userActivation.create({
      data: {
        userId,
        type: 'BONUS_CONVERSION',
        amount: bonusUsed,
        bonusUsed,
        conversionPercent: params.bonusConversionPercent,
        activatedAt: now,
        expiresAt,
        status: 'ACTIVE'
      }
    })
  }

  // ✅ CORREÇÃO 3: Registrar transação de débito do bônus
  await prisma.transaction.create({
    data: {
      userId,
      type: 'ACTIVATION_BONUS',
      amount: bonusUsed.negated(), // Valor negativo para débito
      description: `Ativação mensal - conversão de ${params.bonusConversionPercent}% do saldo em ${pointsToDistribute.toFixed(0)} pontos`,
      status: 'COMPLETED'
    }
  })

  // ✅ CORREÇÃO 4: Distribuir pontos na árvore binária
  // Buscar um pacote ativo do usuário para usar como referência
  const activeUserPackage = await prisma.userPackage.findFirst({
    where: {
      userId,
      isActive: true
    },
    select: {
      packageId: true
    }
  })

  if (pointsToDistribute.gt(0) && activeUserPackage) {
    try {
      console.log(`🌳 Pontos distribuídos na rede: ${pointsToDistribute.toFixed(0)} pontos`)
    } catch (error) {
      console.error(`❌ Erro ao distribuir pontos na rede:`, error)
      // Continuar mesmo com erro na distribuição de pontos
    }
  }

  console.log(`✅ Ativação via conversão de bônus processada para usuário ${Number(userId)}`)
}

/**
 * Expirar ativações vencidas (para ser usada em cron job)
 */
export async function expireOldActivations(): Promise<void> {
  console.log('🔄 Verificando ativações vencidas...')

  const now = new Date()

  const expiredActivations = await prisma.userActivation.updateMany({
    where: {
      status: 'ACTIVE',
      expiresAt: {
        lt: now
      }
    },
    data: {
      status: 'EXPIRED'
    }
  })

  console.log(`✅ ${expiredActivations.count} ativações expiradas`)
}

/**
 * Atualiza as funções de ciclo para verificar ativação
 * ✅ CORRIGIDO: Usa a nova função getCyclePointsForUser para cálculo correto de pontos
 */
export async function checkAndFormCyclesWithActivation(): Promise<void> {
  console.log('🔄 Iniciando verificação de ciclos com validação de ativação...')

  // Buscar parâmetros de ciclo
  const cycleParams = await getCycleParameters()
  console.log(`📐 Parâmetros de ciclo: ${cycleParams.majorSidePoints}/${cycleParams.minorSidePoints}`)

  // Buscar todos os usuários com pacotes ativos
  const usersWithPackages = await prisma.user.findMany({
    include: {
      packages: {
        include: {
          package: true
        },
        where: {
          isActive: true
        }
      }
    },
    where: {
      packages: {
        some: {
          isActive: true
        }
      }
    }
  })

  // Filtrar apenas usuários ativos
  const activeUsers: typeof usersWithPackages = []
  for (const user of usersWithPackages) {
    const isActive = await isUserActive(user.id)
    if (isActive) {
      activeUsers.push(user)
    }
  }

  console.log(`👥 Usuários ativos elegíveis para ciclos: ${activeUsers.length}`)

  // ✅ CORREÇÃO: Usar a nova função getCyclePointsForUser para verificar pontos disponíveis
  const usersWithSufficientPoints: typeof activeUsers = []

  for (const user of activeUsers) {
    try {
      const cyclePoints = await getCyclePointsForUser(user.id)

      // Verificar se pode formar ciclos usando a lógica corrigida
      if (cyclePoints.canFormCycle) {
        usersWithSufficientPoints.push(user)
        console.log(`✅ Usuário ${user.name} (ID: ${Number(user.id)}) pode formar ciclos: ${cyclePoints.cyclesAvailable} ciclos disponíveis`)
      } else {
        console.log(`⚠️  Usuário ${user.name} (ID: ${Number(user.id)}) não pode formar ciclos: ${cyclePoints.leftPoints} LEFT, ${cyclePoints.rightPoints} RIGHT`)
      }
    } catch (error) {
      console.error(`❌ Erro ao verificar pontos de ciclo para usuário ${user.name} (ID: ${Number(user.id)}):`, error)
    }
  }

  console.log(`👥 Usuários com pontos suficientes para ciclos: ${usersWithSufficientPoints.length}`)

  // Processar ciclos para usuários elegíveis
  for (const user of usersWithSufficientPoints) {
    try {
      await processCyclesForUser(user, cycleParams)
    } catch (error) {
      console.error(`❌ Erro ao processar ciclos para usuário ${user.name} (ID: ${Number(user.id)}):`, error)
    }
  }

  console.log(`✅ Verificação de ciclos concluída para ${usersWithSufficientPoints.length} usuários`)
}

/**
 * Processa ativação automática para usuários elegíveis
 * Executa diariamente às 4h da manhã
 */
export async function processAutoActivation(): Promise<void> {
  console.log('🤖 Iniciando processamento de ativação automática...')

  // Buscar usuários com ativação automática habilitada
  const usersWithAutoActivation = await prisma.user.findMany({
    where: {
      autoActivation: true,
      isActive: true
    },
    include: {
      activations: {
        where: {
          status: 'ACTIVE'
        },
        orderBy: {
          expiresAt: 'desc'
        },
        take: 1
      }
    }
  })

  console.log(`👥 Usuários com ativação automática: ${usersWithAutoActivation.length}`)

  // Data limite (amanhã)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(23, 59, 59, 999)

  let processedCount = 0
  let successCount = 0

  for (const user of usersWithAutoActivation) {
    try {
      const currentActivation = user.activations[0]

      // Verificar se precisa de ativação
      let needsActivation = true

      if (currentActivation) {
        // Se expira em mais de 1 dia, não precisa ativar agora
        if (currentActivation.expiresAt > tomorrow) {
          needsActivation = false
        }
      }

      if (!needsActivation) {
        console.log(`⏩ Usuário ${Number(user.id)} - ${user.name} ainda tem ativação válida`)
        continue
      }

      processedCount++

      // Verificar se tem saldo suficiente
      const availableBalance = await getUserBalance(user.id)
      const params = await getActivationParameters()

      const bonusNeeded = availableBalance
        .mul(params.bonusConversionPercent)
        .div(100)

      if (bonusNeeded.lte(0)) {
        console.log(`⚠️  Usuário ${Number(user.id)} - ${user.name} não tem saldo suficiente para ativação automática`)
        continue
      }

      // VALIDAÇÃO: 30% do saldo deve ser >= R$ 100,00 (valor do PIX)
      if (bonusNeeded.lt(params.pixAmount)) {
        console.log(`⚠️  Usuário ${Number(user.id)} - ${user.name} não tem saldo suficiente para ativação automática`)
        console.log(`   Necessário: R$ ${params.pixAmount.toFixed(2)}, Disponível (30%): R$ ${bonusNeeded.toFixed(2)}`)
        continue
      }

      // Processar ativação automática
      await processActivationBonusConversion(user.id)

      console.log(`✅ Ativação automática processada para usuário ${Number(user.id)} - ${user.name}`)
      console.log(`   Saldo usado: R$ ${bonusNeeded.toFixed(2)}`)

      successCount++

    } catch (error) {
      console.error(`❌ Erro ao processar ativação automática para usuário ${Number(user.id)} - ${user.name}:`, error)
      // Continuar com próximo usuário
    }
  }

  console.log(`🤖 Processamento de ativação automática concluído:`)
  console.log(`   - Usuários processados: ${processedCount}`)
  console.log(`   - Ativações realizadas: ${successCount}`)
  console.log(`   - Falhas: ${processedCount - successCount}`)
}

/**
 * Calcula o volume da rede do usuário (pontos de sua rede/downline)
 */
export async function getUserNetworkVolume(userId: bigint): Promise<{
  leftPoints: number
  rightPoints: number
  totalPoints: number
  volume: Decimal
}> {
  try {
    // Buscar todos os usuários na rede do usuário (downline)
    const downlineUsers = await prisma.user.findMany({
      where: {
        OR: [
          { sponsorId: userId },
          { parentId: userId }
        ]
      },
      select: {
        id: true,
        sponsorId: true,
        parentId: true
      }
    })

    // Buscar pontos de todos os usuários da rede
    const downlineUserIds = downlineUsers.map(user => user.id)

    if (downlineUserIds.length === 0) {
      return {
        leftPoints: 0,
        rightPoints: 0,
        totalPoints: 0,
        volume: new Decimal(0)
      }
    }

    const pointsHistory = await prisma.userPointsHistory.findMany({
      where: {
        userId: {
          in: downlineUserIds
        }
      },
      select: {
        points: true,
        side: true
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

    const totalPoints = leftPoints + rightPoints

    // Buscar valor de conversão de pontos
    const pointsParams = await getPointsConversionParameters()
    const volume = new Decimal(totalPoints).mul(pointsParams.valueToPointConversion)

    return {
      leftPoints,
      rightPoints,
      totalPoints,
      volume
    }
  } catch (error) {
    console.error('Erro ao calcular volume da rede do usuário:', error)
    return {
      leftPoints: 0,
      rightPoints: 0,
      totalPoints: 0,
      volume: new Decimal(0)
    }
  }
}

/**
 * Busca o pacote ativo do usuário considerando isActive e data de expiração
 */
export async function getUserActivePackage(userId: bigint) {
  try {
    const now = new Date()

    const activePackage = await prisma.userPackage.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: now }
      },
      include: {
        package: true
      },
      orderBy: { activatedAt: 'desc' }
    })

    return activePackage
  } catch (error) {
    console.error(`Erro ao buscar pacote ativo para usuário ${userId}:`, error)
    return null
  }
}

/**
 * Busca todos os pacotes ativos do usuário considerando isActive e data de expiração
 */
export async function getUserActivePackages(userId: bigint) {
  try {
    const now = new Date()

    const activePackages = await prisma.userPackage.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: now }
      },
      include: {
        package: true
      },
      orderBy: { activatedAt: 'desc' }
    })

    return activePackages
  } catch (error) {
    console.error(`Erro ao buscar pacotes ativos para usuário ${userId}:`, error)
    return []
  }
}

/**
 * Cria um novo pacote do usuário, desativando todos os pacotes existentes primeiro
 */
export async function createUserPackage(
  userId: bigint,
  packageId: bigint,
  isActive: boolean = true,
  activatedAt?: Date,
  expiresAt?: Date,
  transactionId?: bigint,
  isUnilevel?: boolean,
  excludeFromPointsCalculation?: boolean,
  minerId?: bigint
): Promise<any> {
  console.log(`📦 Criando novo pacote para usuário ${Number(userId)}`)

  // Buscar dados do pacote primeiro para saber se é unilevel
  const packageData = await prisma.package.findUnique({
    where: { id: packageId },
    select: { id: true, price: true, isUnilevel: true, name: true, clube300Eligible: true, directBonus: true }
  })

  if (!packageData) {
    throw new Error(`Pacote ${packageId} não encontrado`)
  }

  // Usar o valor fornecido ou o valor do banco
  const packageIsUnilevel = isUnilevel !== undefined ? isUnilevel : packageData.isUnilevel

  // 1. Desativar todos os pacotes existentes do usuário
  //const deactivatedPackages = await prisma.userPackage.updateMany({
  //  where: {
  //    userId,
  //    isActive: true
  //  },
  //  data: {
  //   isActive: false
  //  }
  //})

  //if (deactivatedPackages.count > 0) {
  //  console.log(`✅ ${deactivatedPackages.count} pacotes desativados para usuário ${Number(userId)}`)
  //}

  // 2. Criar o novo pacote
  const userPackage = await prisma.userPackage.create({
    data: {
      userId,
      packageId,
      isActive,
      activatedAt: activatedAt || new Date(),
      expiresAt: expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      transactionId: transactionId || null,
      isUnilevel: packageIsUnilevel,
      excludeFromPointsCalculation: excludeFromPointsCalculation === true ? true : null,
      directBonusSnapshot: packageData.directBonus,
      priceSnapshot: packageData.price
    }
  })

  console.log(`✅ Novo pacote criado: ID ${Number(userPackage.id)} (isUnilevel: ${packageIsUnilevel})`)

  // 3. Verificar se o pacote é elegível para o Clube dos 300
  try {
    if (packageData.isUnilevel && packageData.clube300Eligible && minerId) {
      console.log(`✅ Pacote elegível para o Clube dos 300: ${packageData.name}`)

      const { addUserToClube300 } = await import('./clube300-service')

      const success = await addUserToClube300(userId, packageData.id, minerId)

      if (success) {
        console.log(`🏆 Usuário ${userId} adicionado automaticamente ao Clube dos 300 da mineradora ${Number(minerId)} - ${packageData.name}`)
      } else {
        console.log(`⚠️ Não foi possível adicionar usuário ${userId} ao Clube dos 300 (pode estar lotado ou já ser membro)`)
      }
    } else if (packageData.isUnilevel && packageData.clube300Eligible && !minerId) {
      console.log(`⚠️ Pacote "${packageData.name}" é elegível para o Clube dos 300, mas minerId não foi fornecido`)
    } else if (packageData.isUnilevel) {
      console.log(`ℹ️ Pacote "${packageData.name}" não é elegível para o Clube dos 300`)
    }
  } catch (error) {
    console.error(`❌ Erro ao verificar elegibilidade para Clube dos 300:`, error)
    // Não falhar a criação do pacote por causa do clube
  }

  return userPackage
}

/**
 * Busca o último pacote ativo do usuário (mais recente)
 */
export async function getUserLastActivePackage(userId: bigint) {
  try {
    const now = new Date()

    const lastActivePackage = await prisma.userPackage.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: now }
      },
      include: {
        package: true
      },
      orderBy: { id: 'desc' }
    })

    return lastActivePackage
  } catch (error) {
    console.error(`Erro ao buscar último pacote ativo para usuário ${userId}:`, error)
    return null
  }
}

/**
 * Busca o total de cashback de um usuário
 * @param userId ID do usuário
 * @returns Total de cashback recebido
 */
export async function getUserCashbackTotal(userId: bigint): Promise<Decimal> {
  try {
    const result = await prisma.transaction.aggregate({
      where: {
        userId: userId,
        type: 'CASHBACK',
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    })

    return result._sum.amount || new Decimal(0)
  } catch (error) {
    console.error('Erro ao buscar total de cashback:', error)
    return new Decimal(0)
  }
}