/**
 * Direct Bonus Limit Tracker
 *
 * @deprecated Este arquivo NÃO é mais utilizado no fluxo principal de pagamento de bônus.
 *
 * A lógica de controle de limite de bônus direto foi substituída pela função
 * `computeDirectBonusAllowed` em `business-logic-unilevel.ts`, que é stateless e
 * deriva o histórico de comissão diretamente da tabela `user_packages` (pacotes ATIVOS
 * do mesmo tipo), sem precisar de nenhuma tabela de estado adicional.
 *
 * A tabela `direct_bonus_limit_tracker` permanece no banco sem alterações para
 * preservar o histórico existente. Este arquivo é mantido apenas para referência.
 */

import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Calcula o valor histórico de bônus com quantidade de pacotes já conhecida
 * Usado quando os pacotes já foram contados (ex: antes de desativar em upgrades)
 * 
 * @param packageId - ID do pacote
 * @param packageCount - Quantidade de pacotes já conhecida
 */
export async function calculateHistoricalBonusFromCount(
  packageId: bigint,
  packageCount: number
): Promise<Decimal> {
  console.log(`\n🔍 Calculando bônus histórico a partir de count conhecido...`)
  console.log(`   PackageId: ${Number(packageId)}`)
  console.log(`   Count: ${packageCount}`)
  
  if (packageCount === 0) {
    console.log(`   ✅ Sem histórico (0 pacotes)`)
    return new Decimal(0)
  }
  
  // Buscar o valor do bônus direto deste pacote
  const packageData = await prisma.package.findUnique({
    where: { id: packageId },
    select: { directBonus: true }
  })
  
  if (!packageData) {
    console.log(`   ⚠️  Pacote não encontrado, retornando 0`)
    return new Decimal(0)
  }
  
  const bonusPerPackage = new Decimal(packageData.directBonus.toString())
  const historicalTotal = bonusPerPackage.mul(packageCount)
  
  console.log(`   💰 Bônus unitário: R$ ${bonusPerPackage}`)
  console.log(`   💰 Total histórico: R$ ${historicalTotal} (${packageCount} × R$ ${bonusPerPackage})`)
  
  return historicalTotal
}

/**
 * Calcula o valor histórico de bônus baseado em pacotes ATIVOS existentes
 * Útil para compras normais (sem upgrade) quando não existe tracker
 */
export async function calculateHistoricalBonus(
  userId: bigint,
  packageId: bigint
): Promise<Decimal> {
  console.log(`\n🔍 Calculando bônus histórico...`)
  console.log(`   UserId: ${Number(userId)}`)
  console.log(`   PackageId: ${Number(packageId)}`)
  
  // Contar apenas pacotes ATIVOS
  const existingPackages = await prisma.userPackage.count({
    where: {
      userId,
      packageId,
      isActive: true
    }
  })
  
  console.log(`   📦 Pacotes ATIVOS encontrados: ${existingPackages}`)
  
  if (existingPackages === 0) {
    console.log(`   ✅ Sem histórico (0 pacotes)`)
    return new Decimal(0)
  }
  
  // Buscar o valor do bônus direto deste pacote
  const packageData = await prisma.package.findUnique({
    where: { id: packageId },
    select: { directBonus: true }
  })
  
  if (!packageData) {
    console.log(`   ⚠️  Pacote não encontrado, retornando 0`)
    return new Decimal(0)
  }
  
  const bonusPerPackage = new Decimal(packageData.directBonus.toString())
  const historicalTotal = bonusPerPackage.mul(existingPackages)
  
  console.log(`   💰 Bônus unitário: R$ ${bonusPerPackage}`)
  console.log(`   💰 Total histórico: R$ ${historicalTotal} (${existingPackages} × R$ ${bonusPerPackage})`)
  
  return historicalTotal
}

/**
 * Busca tracker existente (sem criar)
 */
export async function getTracker(
  userId: bigint,
  sponsorId: bigint,
  packageId: bigint
): Promise<{
  id: bigint
  totalPaid: Decimal
  limitAmount: Decimal
  limitReached: boolean
  lastResetAt: Date | null
  resetCount: number
} | null> {
  const tracker = await prisma.directBonusLimitTracker.findUnique({
    where: {
      userId_sponsorId_packageId: {
        userId,
        sponsorId,
        packageId
      }
    }
  })

  if (!tracker) {
    return null
  }

  return {
    id: tracker.id,
    totalPaid: tracker.totalPaid,
    limitAmount: tracker.limitAmount,
    limitReached: tracker.limitReached,
    lastResetAt: tracker.lastResetAt,
    resetCount: tracker.resetCount
  }
}

/**
 * Cria ou atualiza tracker de upgrade herdando totalPaid do tracker anterior
 */
export async function createUpgradeTracker(
  userId: bigint,
  sponsorId: bigint,
  packageId: bigint,
  inheritedTotalPaid: Decimal
): Promise<{
  id: bigint
  totalPaid: Decimal
  limitAmount: Decimal
  limitReached: boolean
}> {
  // Buscar o próximo pacote para obter o limite
  const currentPackage = await prisma.package.findUnique({
    where: { id: packageId },
    select: { price: true, directBonus: true }
  })

  if (!currentPackage) {
    throw new Error(`Pacote ${Number(packageId)} não encontrado`)
  }

  const nextPackage = await prisma.package.findFirst({
    where: {
      isUnilevel: true,
      isActive: true,
      price: { gt: currentPackage.price }
    },
    orderBy: { price: 'asc' },
    select: { directBonus: true }
  })

  const limitAmount = nextPackage ? nextPackage.directBonus : new Decimal(999999)

  // Verificar se tracker já existe
  const existingTracker = await prisma.directBonusLimitTracker.findUnique({
    where: {
      userId_sponsorId_packageId: {
        userId,
        sponsorId,
        packageId
      }
    }
  })

  let tracker
  let finalTotalPaid: Decimal

  if (existingTracker) {
    // JÁ EXISTE: SOMAR ao valor atual
    finalTotalPaid = new Decimal(existingTracker.totalPaid.toString()).add(inheritedTotalPaid)
    const limitReached = finalTotalPaid.gte(limitAmount)
    
    tracker = await prisma.directBonusLimitTracker.update({
      where: {
        userId_sponsorId_packageId: {
          userId,
          sponsorId,
          packageId
        }
      },
      data: {
        totalPaid: finalTotalPaid,
        limitAmount,
        limitReached
      }
    })
    
    console.log(`✨ Tracker de UPGRADE ATUALIZADO (SOMADO): userId=${Number(userId)}, sponsorId=${Number(sponsorId)}, packageId=${Number(packageId)}, anterior=R$ ${existingTracker.totalPaid}, herdado=R$ ${inheritedTotalPaid}, TOTAL=R$ ${finalTotalPaid}, limite=R$ ${limitAmount}`)
  } else {
    // NÃO EXISTE: CRIAR com totalPaid herdado
    finalTotalPaid = inheritedTotalPaid
    const limitReached = finalTotalPaid.gte(limitAmount)
    
    tracker = await prisma.directBonusLimitTracker.create({
      data: {
        userId,
        sponsorId,
        packageId,
        totalPaid: finalTotalPaid,
        limitAmount,
        limitReached
      }
    })
    
    console.log(`✨ Tracker de UPGRADE CRIADO: userId=${Number(userId)}, sponsorId=${Number(sponsorId)}, packageId=${Number(packageId)}, totalPaid HERDADO=R$ ${inheritedTotalPaid}, limite=R$ ${limitAmount}`)
  }

  return {
    id: tracker.id,
    totalPaid: tracker.totalPaid,
    limitAmount: tracker.limitAmount,
    limitReached: tracker.limitReached
  }
}

/**
 * Busca ou cria tracker de limite de bônus direto
 */
export async function getOrCreateBonusTracker(
  userId: bigint,
  sponsorId: bigint,
  packageId: bigint
): Promise<{
  id: bigint
  totalPaid: Decimal
  limitAmount: Decimal
  limitReached: boolean
  lastResetAt: Date | null
  resetCount: number
}> {
  // Buscar o próximo pacote para obter o limite
  const currentPackage = await prisma.package.findUnique({
    where: { id: packageId },
    select: { price: true, directBonus: true }
  })

  if (!currentPackage) {
    throw new Error(`Pacote ${Number(packageId)} não encontrado`)
  }

  const nextPackage = await prisma.package.findFirst({
    where: {
      isUnilevel: true,
      isActive: true,
      price: { gt: currentPackage.price }
    },
    orderBy: { price: 'asc' },
    select: { directBonus: true }
  })

  const limitAmount = nextPackage ? nextPackage.directBonus : new Decimal(999999)

  // Buscar ou criar tracker
  let tracker = await prisma.directBonusLimitTracker.findUnique({
    where: {
      userId_sponsorId_packageId: {
        userId,
        sponsorId,
        packageId
      }
    }
  })

  if (!tracker) {
    // ✅ CRIAR TRACKER SEM HISTÓRICO (compras normais)
    // O histórico só é calculado manualmente em casos de upgrade via createUpgradeTracker
    console.log(`\n🔍 Tracker não encontrado. Criando novo tracker...`)
    
    tracker = await prisma.directBonusLimitTracker.create({
      data: {
        userId,
        sponsorId,
        packageId,
        totalPaid: new Decimal(0), // Sempre inicia com 0 para compras normais
        limitAmount,
        limitReached: false
      }
    })

    console.log(`✨ Tracker criado: userId=${Number(userId)}, sponsorId=${Number(sponsorId)}, packageId=${Number(packageId)}, totalPaid=R$ 0, limite=R$ ${limitAmount}`)
  }

  return {
    id: tracker.id,
    totalPaid: tracker.totalPaid,
    limitAmount: tracker.limitAmount,
    limitReached: tracker.limitReached,
    lastResetAt: tracker.lastResetAt,
    resetCount: tracker.resetCount
  }
}

/**
 * Atualiza o valor total pago no tracker
 */
export async function updateBonusTrackerPaid(
  trackerId: bigint,
  amountPaid: Decimal
): Promise<void> {
  const tracker = await prisma.directBonusLimitTracker.findUnique({
    where: { id: trackerId }
  })

  if (!tracker) {
    throw new Error(`Tracker ${Number(trackerId)} não encontrado`)
  }

  const newTotal = tracker.totalPaid.add(amountPaid)
  const limitReached = newTotal.gte(tracker.limitAmount)

  await prisma.directBonusLimitTracker.update({
    where: { id: trackerId },
    data: {
      totalPaid: newTotal,
      limitReached
    }
  })

  console.log(`💰 Tracker atualizado: ID=${Number(trackerId)}, Total pago=R$ ${newTotal}, Limite atingido=${limitReached}`)
}

/**
 * Reseta o contador quando há upgrade
 */
export async function resetBonusTracker(
  userId: bigint,
  sponsorId: bigint,
  packageId: bigint
): Promise<void> {
  const tracker = await prisma.directBonusLimitTracker.findUnique({
    where: {
      userId_sponsorId_packageId: {
        userId,
        sponsorId,
        packageId
      }
    }
  })

  if (tracker) {
    await prisma.directBonusLimitTracker.update({
      where: { id: tracker.id },
      data: {
        totalPaid: new Decimal(0),
        limitReached: false,
        lastResetAt: new Date(),
        resetCount: { increment: 1 }
      }
    })

    console.log(`⚡ Tracker RESETADO: userId=${Number(userId)}, sponsorId=${Number(sponsorId)}, packageId=${Number(packageId)} (reset #${tracker.resetCount + 1})`)
  }
}

/**
 * Calcula quanto pode pagar baseado no tracker
 */
export async function calculateAllowedBonus(
  userId: bigint,
  sponsorId: bigint,
  packageId: bigint,
  requestedAmount: Decimal
): Promise<{
  trackerId: bigint
  allowedAmount: Decimal
  alreadyPaid: Decimal
  limitAmount: Decimal
  remaining: Decimal
}> {
  const tracker = await getOrCreateBonusTracker(userId, sponsorId, packageId)

  const remaining = tracker.limitAmount.sub(tracker.totalPaid)
  const allowedAmount = Decimal.min(requestedAmount, remaining)

  console.log(`\n📊 CÁLCULO VIA TRACKER:`)
  console.log(`   Tracker ID: ${Number(tracker.id)}`)
  console.log(`   Já pago: R$ ${tracker.totalPaid}`)
  console.log(`   Limite: R$ ${tracker.limitAmount}`)
  console.log(`   Restante: R$ ${remaining}`)
  console.log(`   Solicitado: R$ ${requestedAmount}`)
  console.log(`   Permitido: R$ ${allowedAmount}`)
  if (tracker.lastResetAt) {
    console.log(`   Último reset: ${tracker.lastResetAt.toISOString()} (reset #${tracker.resetCount})`)
  }

  return {
    trackerId: tracker.id,
    allowedAmount,
    alreadyPaid: tracker.totalPaid,
    limitAmount: tracker.limitAmount,
    remaining
  }
}

