/**
 * Points Calculator - Sistema otimizado de cálculo de pontos
 * 
 * Estratégia:
 * - ownPoints: Pontos dos próprios pacotes do usuário
 * - networkPoints: Pontos de toda a rede downline
 * - totalPoints: Cache (ownPoints + networkPoints)
 */

import { prisma } from './prisma'
import { Prisma } from '@/generated/prisma'

/**
 * Calcula os pontos próprios de um usuário baseado em seus pacotes ativos
 */
export async function calculateOwnPoints(userId: bigint): Promise<number> {
  const result = await prisma.userPackage.aggregate({
    where: {
      userId,
      isActive: true,
      isUnilevel: true,
    },
    _sum: {
      packageId: true
    }
  })

  // Buscar os pontos de cada pacote
  const packages = await prisma.userPackage.findMany({
    where: {
      userId,
      isActive: true,
      isUnilevel: true,
      OR: [
        { excludeFromPointsCalculation: null },
        { excludeFromPointsCalculation: false }
      ]
    },
    include: {
      package: {
        select: {
          points: true
        }
      }
    }
  })

  const totalPoints = packages.reduce((sum, userPackage) => {
    return sum + userPackage.package.points
  }, 0)

  return totalPoints
}

/**
 * Calcula os pontos da rede (downline) usando query recursiva SQL
 * Esta é a função mais crítica - usa SQL recursivo para performance
 */
export async function calculateNetworkPoints(userId: bigint): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ networkPoints: bigint | null }>>`
    WITH RECURSIVE downline AS (
      -- Ponto inicial: diretos do usuário
      SELECT 
        u."userId",
        u."ownPoints"
      FROM "unilevel_users" u
      WHERE u."sponsorId" = ${userId}
        AND u."isActive" = true
      
      UNION ALL
      
      -- Recursão: buscar todos os níveis abaixo
      SELECT 
        u."userId",
        u."ownPoints"
      FROM "unilevel_users" u
      INNER JOIN downline d ON u."sponsorId" = d."userId"
      WHERE u."isActive" = true
    )
    SELECT COALESCE(SUM("ownPoints"), 0)::bigint as "networkPoints"
    FROM downline;
  `

  const networkPoints = result[0]?.networkPoints
  return networkPoints ? Number(networkPoints) : 0
}

/**
 * Atualiza os pontos próprios do usuário (chamado após compra de pacote)
 * Esta função é SÍNCRONA e rápida - apenas atualiza o próprio usuário
 */
export async function updateOwnPoints(
  userId: bigint, 
  pointsToAdd: number
): Promise<void> {
  await prisma.unilevelUser.update({
    where: { userId },
    data: {
      ownPoints: {
        increment: pointsToAdd
      },
      totalPoints: {
        increment: pointsToAdd
      },
      pointsLastUpdated: new Date()
    }
  })

  console.log(`✅ Pontos próprios atualizados: +${pointsToAdd} para usuário ${Number(userId)}`)
}

/**
 * Marca usuários da linha ascendente para recalculo
 * Esta função é SÍNCRONA mas usa batch update (1 query)
 */
export async function markUplineForRecalc(userId: bigint): Promise<number> {
  // 1. Coletar IDs da linha ascendente
  const uplineIds: bigint[] = []
  let currentUserId: bigint | null = userId

  // Buscar patrocinador direto
  const initialUser = await prisma.unilevelUser.findUnique({
    where: { userId },
    select: { sponsorId: true }
  })

  currentUserId = initialUser?.sponsorId || null

  // Navegar linha ascendente coletando IDs
  let level = 0
  const MAX_LEVELS = 100 // Limite de segurança

  while (currentUserId && level < MAX_LEVELS) {
    uplineIds.push(currentUserId)

    const sponsor = await prisma.unilevelUser.findUnique({
      where: { userId: currentUserId },
      select: { sponsorId: true }
    })

    currentUserId = sponsor?.sponsorId || null
    level++
  }

  if (uplineIds.length === 0) {
    console.log(`⚠️  Usuário ${Number(userId)} não tem linha ascendente`)
    return 0
  }

  // 2. Marcar todos para recalculo em 1 única query
  const result = await prisma.unilevelUser.updateMany({
    where: {
      userId: { in: uplineIds }
    },
    data: {
      pointsNeedsRecalc: true
    }
  })

  console.log(`✅ ${result.count} usuários marcados para recalculo de pontos`)
  return result.count
}

/**
 * Recalcula e atualiza os pontos de um usuário
 * Esta função é ASSÍNCRONA - chamada pelo job em background
 */
export async function recalculateUserPoints(userId: bigint): Promise<{
  ownPoints: number
  networkPoints: number
  totalPoints: number
}> {
  console.log(`🔄 Recalculando pontos para usuário ${Number(userId)}...`)

  // 1. Calcular pontos próprios (baseado em pacotes ativos)
  const ownPoints = await calculateOwnPoints(userId)

  // 2. Calcular pontos da rede (query recursiva)
  const networkPoints = await calculateNetworkPoints(userId)

  // 3. Calcular total
  const totalPoints = ownPoints + networkPoints

  // 4. Atualizar registro
  await prisma.unilevelUser.update({
    where: { userId },
    data: {
      ownPoints,
      networkPoints,
      totalPoints,
      pointsNeedsRecalc: false,
      pointsLastUpdated: new Date()
    }
  })

  console.log(`✅ Pontos recalculados: próprios=${ownPoints}, rede=${networkPoints}, total=${totalPoints}`)

  return { ownPoints, networkPoints, totalPoints }
}

/**
 * Processa fila de usuários que precisam recalculo
 * Chamado pelo job assíncrono
 */
export async function processRecalcQueue(
  batchSize: number = 50
): Promise<{
  processed: number
  errors: number
  details: Array<{ userId: bigint; status: string; error?: string }>
}> {
  console.log(`🔄 Processando fila de recalculo (lote de ${batchSize})...`)

  // Buscar usuários que precisam recalculo
  const usersToRecalc = await prisma.unilevelUser.findMany({
    where: {
      pointsNeedsRecalc: true,
      isActive: true
    },
    orderBy: {
      pointsLastUpdated: 'asc' // Mais antigos primeiro
    },
    take: batchSize,
    select: {
      userId: true,
      user: {
        select: {
          email: true,
          name: true
        }
      }
    }
  })

  console.log(`📊 ${usersToRecalc.length} usuários na fila de recalculo`)

  const results = {
    processed: 0,
    errors: 0,
    details: [] as Array<{ userId: bigint; status: string; error?: string }>
  }

  // Processar cada usuário
  for (const user of usersToRecalc) {
    try {
      await recalculateUserPoints(user.userId)
      results.processed++
      results.details.push({
        userId: user.userId,
        status: 'success'
      })
    } catch (error) {
      results.errors++
      results.details.push({
        userId: user.userId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })
      console.error(`❌ Erro ao recalcular pontos do usuário ${Number(user.userId)}:`, error)
    }
  }

  console.log(`✅ Fila processada: ${results.processed} sucesso, ${results.errors} erros`)

  return results
}

/**
 * Recalcula pontos de TODOS os usuários (uso administrativo)
 * Deve ser usado com cuidado em produção
 */
export async function recalculateAllPoints(): Promise<{
  total: number
  processed: number
  errors: number
}> {
  console.log(`🔄 Recalculando pontos de TODOS os usuários...`)

  // Marcar todos para recalculo
  const markResult = await prisma.unilevelUser.updateMany({
    where: { isActive: true },
    data: { pointsNeedsRecalc: true }
  })

  console.log(`✅ ${markResult.count} usuários marcados para recalculo`)

  let processed = 0
  let errors = 0

  // Processar em lotes até limpar a fila
  while (true) {
    const result = await processRecalcQueue(100)
    processed += result.processed
    errors += result.errors

    if (result.processed === 0) {
      break // Fila vazia
    }

    // Pequena pausa entre lotes
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`✅ Recalculo completo: ${processed} processados, ${errors} erros`)

  return {
    total: markResult.count,
    processed,
    errors
  }
}

