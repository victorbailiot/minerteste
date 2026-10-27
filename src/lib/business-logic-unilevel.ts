import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { ParameterKeys } from '../types/parameter-keys'
import {
  UnilevelPackageData,
  UnilevelUserData,
  BonusDistributionData,
  UnilevelNetworkData,
  UnilevelUserStats,
  UnilevelProfitDistributionData
} from '../types/unilevel'
import { isUserActive } from './business-utils'
import { processActivationPIX } from './business-logic'
import { processClube300ProfitDistribution } from './clube300-service'
import { CareerLegRequirement } from '../model/CareerRequirements'
import { processUpgradeCoupon } from './promotion-service'
import { computeAllowedDirectBonusForSponsorRelationship } from './direct-bonus-sponsor-utils'

// ====================================
// CACHE GLOBAL PARA OTIMIZAÇÃO DE QUERIES
// ====================================

/**
 * Cache para níveis de carreira (raramente muda)
 * Expira após 1 hora
 */
interface CareerLevelCache {
  data: any[]
  timestamp: number
}

let careerLevelsCache: CareerLevelCache | null = null
const CACHE_TTL = 3600000 // 1 hora em ms

/**
 * Busca níveis de carreira com cache
 */
async function getCachedCareerLevels(): Promise<any[]> {
  const now = Date.now()

  // Verificar se cache é válido
  if (careerLevelsCache && (now - careerLevelsCache.timestamp) < CACHE_TTL) {
    console.log('   📦 Usando cache de níveis de carreira')
    return careerLevelsCache.data
  }

  // Buscar do banco
  console.log('   🔄 Buscando níveis de carreira do banco (cache expirado ou vazio)')
  const careerLevelsRaw = await prisma.$queryRaw`
    SELECT id, name, "requiredPoints", "maxTeamVolumePercent", "requiredDirects", "isActive",
           "indirectBonusLevels", "reactivationLevels"
    FROM career_levels 
    WHERE "isActive" = true 
    ORDER BY "requiredPoints" ASC
  `

  const careerLevels = (careerLevelsRaw as any[]).map((row: any) => ({
    id: row.id,
    name: row.name,
    requiredPoints: row.requiredPoints,
    maxTeamVolumePercent: row.maxTeamVolumePercent,
    requiredDirects: row.requiredDirects,
    isActive: row.isActive,
    indirectBonusLevels: row.indirectBonusLevels,
    reactivationLevels: row.reactivationLevels
  }))

  // Atualizar cache
  careerLevelsCache = {
    data: careerLevels,
    timestamp: now
  }

  return careerLevels
}

/**
 * Limpa o cache de níveis de carreira (chamar quando atualizar níveis no admin)
 */
export function clearCareerLevelsCache(): void {
  careerLevelsCache = null
  console.log('🗑️  Cache de níveis de carreira limpo')
}

// ====================================
// SISTEMA DE FILA PARA PROCESSAMENTO DE CARREIRA EM BACKGROUND
// ====================================

/**
 * Marca usuários para verificação de carreira em background
 * Salva na tabela unilevel_career_queue para processamento posterior
 */
async function queueRemainingCareerChecks(startUserId: bigint): Promise<void> {
  try {
    console.log('--------------------------------')
    console.log(`📋 Agendando verificação de carreira em background a partir do usuário ${Number(startUserId)}`)

    // Coletar todos os usuários restantes (do nível atual até o topo)
    const uplineUserIds: bigint[] = []
    let currentUserId: bigint | undefined = startUserId
    let level = 0

    while (currentUserId && level < 100) { // Limite de segurança
      uplineUserIds.push(currentUserId)

      const sponsor = await prisma.user.findFirst({
        where: { id: currentUserId },
        select: { sponsorId: true }
      })

      currentUserId = sponsor?.sponsorId
      level++
    }

    console.log(`   📊 Total de ${uplineUserIds.length} usuários agendados para verificação`)

    // Marcar todos para processamento em background usando upsert
    // (evita duplicatas e garante que todos sejam processados)
    for (const userId of uplineUserIds) {
      await prisma.unilevelCareerQueue.upsert({
        where: { userId },
        create: {
          userId,
          queuedAt: new Date(),
          processed: false,
          attempts: 0
        },
        update: {
          queuedAt: new Date(), // Atualiza data para repriorizar
          processed: false // Garante que será reprocessado
        }
      })
    }

    console.log(`   ✅ ${uplineUserIds.length} usuários marcados para verificação em background`)

  } catch (error) {
    console.error(`❌ Erro ao agendar verificação de carreira em background:`, error)
    // Não lançar erro - falha no agendamento não deve parar o fluxo principal
  }
}

/**
 * Processa fila de verificação de carreira em background
 * Deve ser executado periodicamente via cron job
 * 
 * @param batchSize - Número de usuários a processar por execução (default: 50)
 * @returns Estatísticas do processamento
 */
export async function processCareerQueue(batchSize: number = 50): Promise<{
  processed: number
  errors: number
  remaining: number
}> {
  console.log(`\n🔄 INICIANDO processamento de fila de carreira (lote: ${batchSize})`)

  const stats = {
    processed: 0,
    errors: 0,
    remaining: 0
  }

  try {
    // Buscar próximo lote de usuários não processados
    // Ordenar por queuedAt para processar os mais antigos primeiro
    const queueItems = await prisma.unilevelCareerQueue.findMany({
      where: {
        processed: false,
        attempts: { lt: 3 } // Limitar tentativas para evitar loop infinito
      },
      orderBy: { queuedAt: 'asc' },
      take: batchSize
    })

    console.log(`   📊 ${queueItems.length} usuários na fila`)

    if (queueItems.length === 0) {
      console.log(`   ℹ️  Fila vazia - nada a processar`)
      return stats
    }

    // Processar cada usuário
    for (const item of queueItems) {
      try {
        console.log(`   🔍 Processando usuário ${Number(item.userId)}...`)

        // Verificar progressão de carreira (sem limite de níveis)
        await checkCareerProgression(item.userId)

        // Marcar como processado
        await prisma.unilevelCareerQueue.update({
          where: { id: item.id },
          data: {
            processed: true,
            processedAt: new Date(),
            attempts: { increment: 1 }
          }
        })

        stats.processed++
        console.log(`   ✅ Usuário ${Number(item.userId)} processado com sucesso`)

      } catch (error) {
        console.error(`   ❌ Erro ao processar usuário ${Number(item.userId)}:`, error)

        // Incrementar tentativas
        await prisma.unilevelCareerQueue.update({
          where: { id: item.id },
          data: {
            attempts: { increment: 1 },
            lastError: error instanceof Error ? error.message : 'Erro desconhecido'
          }
        })

        stats.errors++
      }
    }

    // Contar itens restantes na fila
    stats.remaining = await prisma.unilevelCareerQueue.count({
      where: {
        processed: false,
        attempts: { lt: 3 }
      }
    })

    console.log(`\n📈 Processamento de fila concluído:`)
    console.log(`   ✅ Processados: ${stats.processed}`)
    console.log(`   ❌ Erros: ${stats.errors}`)
    console.log(`   📋 Restantes na fila: ${stats.remaining}`)

    return stats

  } catch (error) {
    console.error(`❌ Erro geral no processamento de fila de carreira:`, error)
    throw error
  }
}

/**
 * Limpa registros antigos da fila (já processados há mais de 7 dias)
 * Deve ser executado periodicamente para manter a tabela limpa
 */
export async function cleanupCareerQueue(): Promise<number> {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const result = await prisma.unilevelCareerQueue.deleteMany({
      where: {
        processed: true,
        processedAt: { lt: sevenDaysAgo }
      }
    })

    console.log(`🗑️  ${result.count} registros antigos removidos da fila de carreira`)

    return result.count

  } catch (error) {
    console.error('❌ Erro ao limpar fila de carreira:', error)
    return 0
  }
}

// ====================================
// FUNÇÕES PRINCIPAIS DO SISTEMA UNILEVEL
// ====================================

/**
 * Processa a compra de um pacote unilevel e distribui bônus
 * 
 * REGRA DE LIMITE PROPORCIONAL DE COMISSÃO DIRETA:
 * - O total de comissões diretas pagas ao patrocinador é limitado ao valor da comissão do próximo pacote
 * - Exemplo 1: Átomo (R$ 30) limitado a R$ 200 (comissão do Núcleo)
 *   • 6 Átomos = R$ 180 → 7º Átomo paga apenas R$ 20 (faltante) → 8º+ paga R$ 0
 * - Exemplo 2: Núcleo (R$ 200) limitado a R$ 899 (comissão do Tecton)
 *   • 4 Núcleos = R$ 800 → 5º Núcleo paga apenas R$ 99 (faltante) → 6º+ paga R$ 0
 * - Pacote mais alto (Tecton): sem limite
 * - Bônus indiretos continuam sendo pagos normalmente em todos os casos
 * 
 * @param userId - ID do usuário que está comprando
 * @param packageId - ID do pacote resultante (pode ser um upgrade)
 * @param packageValue - Valor PAGO pelo pacote (não o valor do upgrade)
 * @param sponsorId - ID do patrocinador (opcional, busca do usuário se não informado)
 * @param correlationID - ID de correlação da transação
 * @param quantity - Quantidade comprada
 * @param originalPackageId - ID do pacote ORIGINAL comprado (para cálculo de bônus direto em caso de upgrade)
 * @param currentTransactionId - ID da transação atual (exclui user_packages desta compra do cálculo histórico)
 */
export async function processPackagePurchaseUnilevel(
  userId: bigint,
  packageId: bigint,
  packageValue: Decimal,
  sponsorId?: bigint,
  correlationID?: string,
  quantity?: number,
  originalPackageId?: bigint,
  currentTransactionId?: bigint
): Promise<void> {
  console.log(`🛒 INICIANDO processPackagePurchaseUnilevel`)
  console.log(`   UserId: ${Number(userId)}`)
  console.log(`   PackageId: ${Number(packageId)} (pacote resultante)`)
  console.log(`   OriginalPackageId: ${originalPackageId ? Number(originalPackageId) : 'MESMO'} (pacote comprado)`)
  console.log(`   PackageValue: R$ ${packageValue} (valor PAGO)`)
  console.log(`   SponsorId: ${sponsorId ? Number(sponsorId) : 'NENHUM'}`)
  console.log(`   CurrentTransactionId: ${currentTransactionId ? Number(currentTransactionId) : 'N/A'}`)

  try {
    // 1. Validar dados de entrada
    const packageData = await validateUnilevelPackage(packageId)
    const user = await validateUser(userId)
    sponsorId = user.sponsorId
    const quantityDecimal = new Decimal(quantity || 1)

    console.log(`✅ Validações concluídas - Pacote resultante: ${packageData.name}`)

    // 1.5. Buscar dados do pacote ORIGINAL (em caso de upgrade)
    // IMPORTANTE: Tanto bônus quanto pontos devem ser baseados no pacote COMPRADO
    let directBonusPackageData = packageData
    let pointsPackageData = packageData

    if (originalPackageId && originalPackageId !== packageId) {
      directBonusPackageData = await validateUnilevelPackage(originalPackageId)
      pointsPackageData = directBonusPackageData // Pontos também do pacote original!

      console.log(`   ℹ️  UPGRADE DETECTADO:`)
      console.log(`   ℹ️  - Pacote COMPRADO: ${directBonusPackageData.name} (${directBonusPackageData.points} pontos, R$ ${directBonusPackageData.directBonus} bônus direto)`)
      console.log(`   ℹ️  - Pacote CRIADO: ${packageData.name} (consolidação de pacotes)`)
      console.log(`   ℹ️  - Bônus e pontos baseados no pacote COMPRADO, não no criado`)

    }

    // 2. Criar/atualizar usuário unilevel
    const unilevelUser = await createOrUpdateUnilevelUser(userId, sponsorId)
    console.log(`✅ Usuário unilevel criado/atualizado: ID ${Number(unilevelUser.id)}`)

    // 7.5. Atualizar pontos na linha ascendente
    // CORREÇÃO: Usar pontos do pacote ORIGINAL (comprado), não do upgrade
    const pointsToDistribute = Number(pointsPackageData.points) * Number(quantityDecimal)
    await updateUplinePoints(userId, pointsToDistribute, correlationID)
    console.log(`✅ Pontos na linha ascendente atualizados: ${pointsToDistribute} pontos (baseado em ${pointsPackageData.name})`)

    // 8. Verificar progressão de carreira para usuário e toda linha ascendente (limitado a 5 níveis)
    //await checkCareerProgressionForUpline(userId, 0)
    //console.log(`✅ Progressão de carreira verificada (primeiros 5 níveis)`)

    await queueRemainingCareerChecks(user.sponsorId)
    console.log(`✅ Progressão de carreira agendada para linha ascendente`)

    // 4 e 5. Calcular e distribuir bônus
    if (sponsorId) {
      // 4.1. Calcular valor de referência de comissão direta (para log comparativo)
      const normalDirectBonusAmount = directBonusPackageData.directBonus.mul(quantityDecimal)
      const indirectBonusAmount = packageValue.mul(quantityDecimal)

      console.log(`\n💰 CÁLCULO DE BÔNUS:`)
      console.log(`   Pacote base: ${directBonusPackageData.name}`)
      console.log(`   Comissão direta normal: R$ ${normalDirectBonusAmount}`)
      console.log(`   Base para indireto: R$ ${indirectBonusAmount}`)

      // 4.2. Calcular valor pendente via snapshot dos pacotes ativos (stateless)
      const allowedDirectBonus = await computeDirectBonusAllowed(
        userId,
        sponsorId,
        normalDirectBonusAmount
      )

      console.log(`\n📊 RESULTADO:`)
      console.log(`   Comissão direta a pagar: R$ ${allowedDirectBonus}`)

      // 4.3. Distribuir bônus
      if (allowedDirectBonus.gt(0)) {
        await distributeDirectBonus(sponsorId, allowedDirectBonus, userId, correlationID, packageId)

        if (allowedDirectBonus.lt(normalDirectBonusAmount)) {
          console.log(`⚠️  Comissão reduzida: R$ ${allowedDirectBonus} de R$ ${normalDirectBonusAmount} (cap aplicado)`)
        } else {
          console.log(`✅ Bônus completo distribuído`)
        }
      }

      await distributeIndirectBonuses(userId, indirectBonusAmount, packageData, correlationID)
      console.log(`✅ Bônus indiretos distribuídos`)

    }

    //VERIFICAR POIS ESSE BONUS É SOMENTE QUANDO OS DOWNLINE REATIVAM
    // 6. Distribuir bônus de reativação na linha ascendente
    //await distributeReactivationBonuses(userId, packageData.reactivationBonus, correlationID)
    //console.log(`✅ Bônus de reativação distribuídos`)

    console.log(`🎉 Compra de pacote unilevel processada COM SUCESSO para usuário ${Number(userId)}`)

  } catch (error) {
    console.error(`❌ ERRO durante processPackagePurchaseUnilevel para usuário ${Number(userId)}:`, error)
    if (error instanceof Error) {
      console.error(`Stack trace:`, error.stack)
    }
    throw error
  }
}

/**
 * Processa ativação unilevel via PIX
 * Cria a ativação do usuário e distribui bônus de reativação na linha ascendente
 */
export async function processUnilevelActivationPIX(
  userId: bigint,
  transactionId: bigint,
  correlationID: string
): Promise<void> {
  console.log(`🔄 Processando ativação unilevel PIX para usuário ${Number(userId)}`)

  try {
    // 1. Validar usuário
    const user = await validateUser(userId)

    // 2. Buscar pacote ativo do usuário para obter o valor de reativação
    const activePackage = await prisma.userPackage.findFirst({
      where: {
        userId,
        isActive: true,
        isUnilevel: true
      },
      include: {
        package: true
      },
      orderBy: {
        activatedAt: 'desc'
      }
    })

    if (!activePackage) {
      throw new Error(`Usuário ${Number(userId)} não possui pacote unilevel ativo`)
    }

    const reactivationAmount = activePackage.package.reactivationAmount
    const reactivationBonus = activePackage.package.reactivationBonus

    console.log(`💰 Valor de reativação: R$ ${reactivationAmount}`)
    console.log(`🎁 Bônus de reativação: R$ ${reactivationBonus}`)

    // 3. Processar ativação usando a função existente
    await processActivationPIX(userId, transactionId, correlationID)
    console.log(`✅ Ativação PIX processada`)

    // 4. Distribuir bônus de reativação na linha ascendente
    await distributeReactivationBonuses(userId, reactivationBonus, correlationID)
    console.log(`✅ Bônus de reativação distribuídos na linha ascendente`)

    console.log(`🎉 Ativação unilevel PIX processada com sucesso para usuário ${Number(userId)}`)

  } catch (error) {
    console.error(`❌ Erro ao processar ativação unilevel PIX para usuário ${Number(userId)}:`, error)
    throw error
  }
}

// ====================================
// FUNÇÕES DE VALIDAÇÃO
// ====================================

/**
 * Valida pacote unilevel
 */
async function validateUnilevelPackage(packageId: bigint): Promise<UnilevelPackageData> {
  const packageData = await prisma.package.findFirst({
    where: {
      id: packageId,
      isUnilevel: true
    }
  })

  if (!packageData) {
    throw new Error(`Pacote unilevel com ID ${Number(packageId)} não encontrado`)
  }

  if (!packageData.isActive) {
    throw new Error(`Pacote unilevel ${packageData.name} está inativo`)
  }

  return packageData
}

/**
 * Valida usuário
 */
async function validateUser(userId: bigint): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error(`Usuário ${Number(userId)} não encontrado`)
  }

  return user
}
// ====================================
// FUNÇÕES DE LIMITE DE COMISSÃO DIRETA
// ====================================

/**
 * Calcula o valor de bônus direto permitido para o patrocinador com base nos pacotes (snapshot)
 * menos o que já foi pago.
 *
 * totalPermitido:
 *   Σ(directBonusSnapshot | ativos unilevel, exclude≠true, não transação "Gerado pelo Admin")
 *   − Σ(directBonusSnapshot | inativos com exclude=true)
 *
 * bonusToGenerate = max(0, permitidoNoPeríodo − já pago ao patrocinador atual),
 * onde permitidoNoPeríodo = min(compras reais no período, teto ativos − já pago a outros).
 * Se tarifas foram reduzidas e o patrocinador já recebeu acima do teto atual, novas compras
 * ainda pagam o bônus direto da compra em processamento.
 */
async function computeDirectBonusAllowed(
  buyerId: bigint,
  directSponsorId: bigint,
  currentPurchaseBonus?: Decimal
): Promise<Decimal> {
  console.log(`\n🔍 CALCULANDO BÔNUS DIRETO (período do patrocinador + já pago)`)
  console.log(`   compradorId: ${Number(buyerId)}`)
  console.log(`   patrocinadorId: ${Number(directSponsorId)}`)

  try {
    const relationship = await computeAllowedDirectBonusForSponsorRelationship(
      buyerId,
      directSponsorId,
      currentPurchaseBonus?.gt(0) ? { currentPurchaseBonus } : undefined
    )

    if (relationship.sponsorPeriodStart) {
      console.log(`   inicioPatrocinio: ${relationship.sponsorPeriodStart.toISOString()}`)
    }

    console.log(`   tetoAtivos: R$ ${relationship.activeCeiling}`)
    if (relationship.paidToOthers.gt(0)) {
      console.log(`   jaPagoOutrosPatrocinadores: R$ ${relationship.paidToOthers}`)
      console.log(`   tetoRestante: R$ ${relationship.remainingCeiling}`)
    }
    console.log(`   comprasNoPeriodo: R$ ${relationship.purchasesInPeriod}`)
    console.log(`   permitidoNoPeriodo: R$ ${relationship.expectedInPeriod}`)
    console.log(`   jaPagoPatrocinadorAtual: R$ ${relationship.paidToCurrentSponsor}`)

    const pendingBonus = relationship.pending

    console.log(`   pendente: R$ ${pendingBonus}`)

    if (pendingBonus.isZero()) {
      console.log(`   ❌ BÔNUS BLOQUEADO (tudo já foi pago ou totalPermitido ≤ jaPago)`)
    } else {
      console.log(`   ✅ BÔNUS A GERAR: R$ ${pendingBonus}`)
    }

    return pendingBonus
  } catch (error) {
    console.error(`❌ Erro em computeDirectBonusAllowed:`, error)
    return new Decimal(0)
  }
}

/**
 * @deprecated Substituído por computeDirectBonusAllowed (stateless via user_packages).
 * Calcula o valor proporcional de comissão direta a ser pago
 * ANTIGA ESTRATÉGIA: Usa DirectBonusLimitTracker para controle preciso
 * 
 * IMPORTANTE: O limite é por relacionamento de indicação, não global.
 * Exemplo: Se o próximo pacote paga R$ 200, cada indicado pode gerar até R$ 200
 * para o patrocinador (não R$ 200 total para todos os indicados).
 * 
 * @param userId - ID do usuário que está comprando (indicado direto)
 * @param sponsorId - ID do patrocinador que receberá a comissão
 * @param packageId - ID do pacote sendo comprado (base para bônus)
 * @param normalBonusAmount - Valor normal de comissão TOTAL (já multiplicado pela quantidade)
 * @param quantity - Quantidade de pacotes sendo comprados
 * @param correlationID - ID da transação atual
 * @param resultantPackageId - ID do pacote RESULTANTE (após upgrade, se houver)
 * @param originalPackageId - ID do pacote ORIGINAL (antes do upgrade, se houver)
 * @param resultantPackageIdForLimit - ID do pacote para compartilhar limite (usado em remaining após upgrade)
 * @returns Objeto com valor a pagar e ID do tracker
 */
async function calculateProportionalDirectBonus(
  userId: bigint,
  sponsorId: bigint,
  packageId: bigint,
  normalBonusAmount: Decimal,
  quantity: number,
  correlationID?: string,
  resultantPackageId?: bigint,
  originalPackageId?: bigint,
  resultantPackageIdForLimit?: bigint,
  packagesBeforeDisable?: Array<{ packageId: bigint; count: number }>
): Promise<{ amount: Decimal; trackerId: bigint }> {
  console.log(`\n🔍 CALCULANDO COMISSÃO DIRETA PROPORCIONAL (via Tracker)`)
  console.log(`   Usuário: ${Number(userId)}, Patrocinador: ${Number(sponsorId)}`)
  console.log(`   Pacote base: ${Number(packageId)}, Quantidade: ${quantity}`)
  console.log(`   Valor normal total: R$ ${normalBonusAmount}`)
  console.log(`   ResultantPackageId: ${resultantPackageId ? Number(resultantPackageId) : 'N/A'}`)
  console.log(`   OriginalPackageId: ${originalPackageId ? Number(originalPackageId) : 'N/A'}`)
  console.log(`   ResultantPackageIdForLimit: ${resultantPackageIdForLimit ? Number(resultantPackageIdForLimit) : 'N/A'}`)

  try {
    // Importar funções do tracker
    const { calculateAllowedBonus, getTracker, createUpgradeTracker, calculateHistoricalBonusFromCount } = await import('./direct-bonus-tracker')

    // Determinar qual packageId usar para o tracker
    let packageIdForTracker = packageId
    const bonusAmountToRequest = normalBonusAmount

    // Se é REMAINING após upgrade, usar o limite compartilhado do pacote resultante
    if (resultantPackageIdForLimit) {
      packageIdForTracker = resultantPackageIdForLimit
      console.log(`   🔗 REMAINING: Usando limite compartilhado do pacote ${Number(resultantPackageIdForLimit)}`)
    }
    // Se é UPGRADE, criar novo tracker COM totalPaid herdado
    else if (resultantPackageId && originalPackageId && resultantPackageId !== originalPackageId) {
      packageIdForTracker = resultantPackageId
      console.log(`   🔄 UPGRADE DETECTADO: Pacote ${Number(originalPackageId)} → ${Number(resultantPackageId)}`)

      // Buscar o pacote resultante para pegar sua comissão
      const resultantPackage = await prisma.package.findUnique({
        where: { id: resultantPackageId }
      })

      if (!resultantPackage) {
        throw new Error(`Pacote resultante ${Number(resultantPackageId)} não encontrado`)
      }

      // Buscar tracker ANTIGO do pacote ORIGINAL para herdar totalPaid
      const oldTracker = await getTracker(userId, sponsorId, originalPackageId)
      let inheritedTotalPaid = new Decimal(0)

      if (oldTracker) {
        // Tracker existe: herdar valor já pago
        inheritedTotalPaid = new Decimal(oldTracker.totalPaid.toString())
        console.log(`   📊 Tracker do pacote original encontrado: R$ ${inheritedTotalPaid}`)
      } else {
        // Tracker NÃO existe: calcular histórico usando count de packagesBeforeDisable
        console.log(`   🔍 Tracker do pacote original NÃO encontrado`)

        // Buscar count do pacote original em packagesBeforeDisable
        const packageInfo = packagesBeforeDisable?.find(p => p.packageId === originalPackageId)
        const packageCount = packageInfo ? packageInfo.count : 0

        console.log(`   📦 Count de pacotes antes de desativar: ${packageCount}`)

        // Calcular histórico usando o count conhecido
        inheritedTotalPaid = await calculateHistoricalBonusFromCount(
          originalPackageId,
          packageCount
        )
      }

      console.log(`   📊 Comissão do pacote resultante: R$ ${resultantPackage.directBonus}`)
      console.log(`   📊 Total a herdar para novo tracker: R$ ${inheritedTotalPaid}`)

      // Criar NOVO tracker do upgrade COM totalPaid herdado
      const newTracker = await createUpgradeTracker(
        userId,
        sponsorId,
        resultantPackageId,
        inheritedTotalPaid
      )

      // Calcular quanto falta para o limite do novo pacote
      const resultantPackageBonus = new Decimal(resultantPackage.directBonus.toString())
      const remaining = resultantPackageBonus.minus(inheritedTotalPaid)

      console.log(`   📊 Falta para completar: R$ ${remaining}`)
      console.log(`   ✅ Solicitando: R$ ${remaining} (ao invés de R$ ${normalBonusAmount})`)

      // Retornar resultado direto (tracker já criado)
      const allowedAmount = remaining.gt(0) ? remaining : new Decimal(0)

      console.log(`\n📊 RESULTADO FINAL:`)
      console.log(`   Solicitado: R$ ${normalBonusAmount}`)
      console.log(`   Permitido: R$ ${allowedAmount}`)
      console.log(`   Tracker ID: ${Number(newTracker.id)}`)

      if (allowedAmount.lt(remaining)) {
        console.log(`   ⚠️  COMISSÃO REDUZIDA (limite aplicado)`)
      } else if (allowedAmount.isZero()) {
        console.log(`   ❌ COMISSÃO BLOQUEADA (limite atingido)`)
      } else {
        console.log(`   ✅ COMISSÃO COMPLETA`)
      }

      return {
        amount: allowedAmount,
        trackerId: newTracker.id
      }
    }

    // Calcular quanto pode pagar usando o tracker (caso normal ou remaining)
    const result = await calculateAllowedBonus(
      userId,
      sponsorId,
      packageIdForTracker,
      bonusAmountToRequest
    )

    console.log(`\n📊 RESULTADO FINAL:`)
    console.log(`   Solicitado: R$ ${normalBonusAmount}`)
    console.log(`   Permitido: R$ ${result.allowedAmount}`)
    console.log(`   Tracker ID: ${Number(result.trackerId)}`)

    if (result.allowedAmount.lt(normalBonusAmount)) {
      console.log(`   ⚠️  COMISSÃO REDUZIDA (limite aplicado)`)
    } else if (result.allowedAmount.isZero()) {
      console.log(`   ❌ COMISSÃO BLOQUEADA (limite atingido)`)
    } else {
      console.log(`   ✅ COMISSÃO COMPLETA`)
    }

    return {
      amount: result.allowedAmount,
      trackerId: result.trackerId
    }
  } catch (error) {
    console.error(`❌ Erro ao calcular comissão via tracker:`, error)
    // Fallback: retornar valor normal em caso de erro
    return {
      amount: normalBonusAmount,
      trackerId: BigInt(0)
    }
  }
}

// Manter função antiga para referência (pode ser removida depois)
async function calculateProportionalDirectBonusOLD(
  userId: bigint,
  sponsorId: bigint,
  packageId: bigint,
  normalBonusAmount: Decimal,
  quantity: number,
  correlationID?: string,
  resultantPackageId?: bigint,
  originalPackageId?: bigint,
  resultantPackageIdForLimit?: bigint
): Promise<{ amount: Decimal; trackerId: bigint }> {
  try {
    // 1. Buscar dados do pacote atual
    const currentPackage = await prisma.package.findUnique({
      where: { id: packageId },
      select: {
        id: true,
        name: true,
        price: true,
        directBonus: true
      }
    })

    if (!currentPackage) {
      throw new Error(`Pacote ${Number(packageId)} não encontrado`)
    }

    const bonusPerUnit = Number(currentPackage.directBonus)
    console.log(`   📦 Pacote base: ${currentPackage.name}`)
    console.log(`   💰 Comissão unitária: R$ ${bonusPerUnit}`)
    console.log(`   💰 Comissão total (${quantity}x): R$ ${bonusPerUnit * quantity}`)

    // 2. Detectar se houve UPGRADE
    const hasUpgrade = resultantPackageId && originalPackageId && resultantPackageId !== originalPackageId

    console.log(`\n   🔍 DETECÇÃO DE UPGRADE:`)
    console.log(`      resultantPackageId: ${resultantPackageId ? Number(resultantPackageId) : 'undefined'}`)
    console.log(`      originalPackageId: ${originalPackageId ? Number(originalPackageId) : 'undefined'}`)
    console.log(`      resultantPackageIdForLimit: ${resultantPackageIdForLimit ? Number(resultantPackageIdForLimit) : 'undefined'}`)
    console.log(`      hasUpgrade: ${hasUpgrade}`)
    console.log(`      isUpgradedPackage (hasUpgrade && !resultantPackageIdForLimit): ${hasUpgrade && !resultantPackageIdForLimit}`)
    console.log(`      isRemainingPackage (resultantPackageIdForLimit existe): ${!!resultantPackageIdForLimit}`)

    if (hasUpgrade) {
      console.log(`\n   🔄 UPGRADE DETECTADO!`)
      console.log(`   📦 Pacote ORIGINAL: ${Number(originalPackageId)}`)
      console.log(`   📦 Pacote RESULTANTE: ${Number(resultantPackageId)}`)
    }

    // 3. Determinar o LIMITE de pagamento
    let maxAllowedBonus: number
    let limitPackageName: string

    if (resultantPackageIdForLimit) {
      // CASO REMAINING após UPGRADE: Usa o limite do pacote de upgrade (limite compartilhado)
      // Exemplo: Átomo restante após upgrade para Núcleo → limite = R$ 200 (do Núcleo)
      const limitPackage = await prisma.package.findUnique({
        where: { id: resultantPackageIdForLimit },
        select: {
          id: true,
          name: true,
          directBonus: true
        }
      })

      if (!limitPackage) {
        throw new Error(`Pacote de limite ${Number(resultantPackageIdForLimit)} não encontrado`)
      }

      maxAllowedBonus = Number(limitPackage.directBonus)
      limitPackageName = limitPackage.name
      console.log(`   🔗 REMAINING após UPGRADE: Limite compartilhado com ${limitPackageName}`)
      console.log(`   🎯 Limite máximo: R$ ${maxAllowedBonus}`)
    } else if (hasUpgrade && resultantPackageId) {
      // CASO UPGRADE: Limite é o bônus direto do PRÓPRIO pacote resultante
      // Exemplo: Upgrade para Núcleo → limite = R$ 200 (bônus do Núcleo)
      const resultantPackage = await prisma.package.findUnique({
        where: { id: resultantPackageId },
        select: {
          id: true,
          name: true,
          directBonus: true
        }
      })

      if (!resultantPackage) {
        throw new Error(`Pacote resultante ${Number(resultantPackageId)} não encontrado`)
      }

      maxAllowedBonus = Number(resultantPackage.directBonus)
      limitPackageName = resultantPackage.name
      console.log(`   🔄 UPGRADE: Limite = bônus direto do pacote RESULTANTE (${limitPackageName})`)
      console.log(`   🎯 Limite máximo: R$ ${maxAllowedBonus}`)
    } else {
      // CASO NORMAL: Limite é o bônus direto do PRÓXIMO pacote
      // Exemplo: Átomo → próximo = Núcleo → limite = R$ 200
      const nextPackage = await prisma.package.findFirst({
        where: {
          isUnilevel: true,
          isActive: true,
          price: { gt: currentPackage.price }
        },
        orderBy: { price: 'asc' },
        select: {
          id: true,
          name: true,
          directBonus: true
        }
      })

      if (!nextPackage) {
        console.log(`   ℹ️  Pacote mais alto - SEM LIMITE`)
        return {
          amount: normalBonusAmount,
          trackerId: BigInt(0)
        }
      }

      maxAllowedBonus = Number(nextPackage.directBonus)
      limitPackageName = nextPackage.name
      console.log(`   📦 Próximo pacote: ${limitPackageName}`)
      console.log(`   🎯 Limite máximo: R$ ${maxAllowedBonus}`)
    }

    // 5. Determinar qual pacote usar para CONTAR comissões já pagas
    let packageIdToCount = currentPackage.id
    let bonusUnitToCount = bonusPerUnit

    if (hasUpgrade && originalPackageId) {
      // Se houve upgrade, contar pacotes do tipo ORIGINAL
      const originalPackage = await prisma.package.findUnique({
        where: { id: originalPackageId },
        select: {
          id: true,
          name: true,
          directBonus: true
        }
      })

      if (originalPackage) {
        packageIdToCount = originalPackage.id
        bonusUnitToCount = Number(originalPackage.directBonus)
        console.log(`   📦 Contando comissões do pacote ORIGINAL: ${originalPackage.name} (R$ ${bonusUnitToCount}/un)`)
      }
    }

    // 6. Buscar a data do último UPGRADE que desativou pacotes deste tipo
    // IMPORTANTE: A cada upgrade (10 Átomos → Núcleo), o contador ZERA!
    // Mas para o pacote UPGRADED, precisamos verificar se o limite foi atingido ANTES do upgrade

    const isUpgradedPackage = hasUpgrade && !resultantPackageIdForLimit

    // Buscar o pacote DESATIVADO mais recente do tipo que estamos contando
    // IMPORTANTE: Buscar apenas em upgrades ANTERIORES, não no upgrade ATUAL

    // Primeiro, buscar TODOS os pacotes desativados deste tipo
    const allDisabledPackages = await prisma.userPackage.findMany({
      where: {
        userId: userId,
        packageId: packageIdToCount,
        isActive: false
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        updatedAt: true,
        createdAt: true,
        transactionId: true,
        package: {
          select: {
            name: true
          }
        },
        transaction: {
          select: {
            correlationID: true,
            createdAt: true
          }
        }
      }
    })

    console.log(`\n   🔍 DEBUG: Pacotes desativados encontrados: ${allDisabledPackages.length}`)
    allDisabledPackages.forEach(pkg => {
      const isCurrent = pkg.transaction?.correlationID === correlationID
      const symbol = isCurrent ? '🔴' : '✅'
      console.log(`      ${symbol} ID: ${Number(pkg.id)}, Updated: ${pkg.updatedAt.toISOString()}, TxCorrelation: ${pkg.transaction?.correlationID || 'N/A'}`)
    })

    // Filtrar para excluir os desativados DO MESMO UPGRADE
    // IMPORTANTE: Agrupar por correlationID para identificar upgrades
    // Pacotes podem ter updatedAt diferentes mas serem do mesmo upgrade

    // Agrupar por correlationID
    const correlationGroups = new Map<string, number>()
    allDisabledPackages.forEach(pkg => {
      const corr = pkg.transaction?.correlationID || 'null'
      correlationGroups.set(corr, (correlationGroups.get(corr) || 0) + 1)
    })

    console.log(`\n   📊 Grupos de upgrades encontrados:`)
    correlationGroups.forEach((count, corr) => {
      const symbol = corr === correlationID ? '🔴' : '✅'
      console.log(`      ${symbol} ${count} pacotes com correlationID: ${corr}`)
    })

    // Excluir todos os pacotes com correlationID da transação atual
    const previousDisabledPackages = allDisabledPackages.filter(pkg => {
      const isCurrent = pkg.transaction?.correlationID === correlationID
      return !isCurrent
    })

    console.log(`   🔍 Pacotes do upgrade mais recente (EXCLUÍDOS): ${allDisabledPackages.length - previousDisabledPackages.length}`)
    console.log(`   🔍 Pacotes de upgrades ANTERIORES: ${previousDisabledPackages.length}`)
    if (previousDisabledPackages.length > 0) {
      console.log(`   ✅ Usando pacote ID ${Number(previousDisabledPackages[0].id)} como referência (Updated: ${previousDisabledPackages[0].updatedAt.toISOString()})`)
    }

    const lastDisabledPackage = previousDisabledPackages.length > 0 ? previousDisabledPackages[0] : null
    let cutoffDate: Date | null = null

    if (lastDisabledPackage) {
      // VERIFICAÇÃO FINAL: Se o "último upgrade" é da transação ATUAL, ignorar!
      // Isso acontece quando o pacote inativo foi criado milissegundos antes dos outros
      const isFromCurrentTransaction = lastDisabledPackage.transaction?.correlationID === correlationID

      if (isFromCurrentTransaction) {
        console.log(`\n   🆕 PRIMEIRO UPGRADE detectado (não há upgrades anteriores)`)
        console.log(`      Pacote ID ${Number(lastDisabledPackage.id)} é da transação ATUAL, não de upgrade anterior`)
        cutoffDate = null  // Buscar TODAS as transações
      } else {
        // IMPORTANTE: Usar a data da TRANSAÇÃO, não do updatedAt do pacote!
        cutoffDate = lastDisabledPackage.transaction?.createdAt || lastDisabledPackage.updatedAt
        console.log(`\n   🔄 Último upgrade ANTERIOR detectado:`)
        console.log(`      Pacote desativado ID: ${Number(lastDisabledPackage.id)}, TransactionID: ${lastDisabledPackage.transaction?.correlationID || 'N/A'}`)
        console.log(`      Data de referência (transação): ${cutoffDate.toISOString()}`)
        console.log(`      UpdatedAt do pacote: ${lastDisabledPackage.updatedAt.toISOString()}`)
      }

      if (isUpgradedPackage) {
        console.log(`   📦 PACOTE UPGRADED: Contando transações APÓS último upgrade (para verificar consumo do limite)`)
      } else {
        console.log(`   ⚡ PACOTE REMAINING: CONTADOR ZERADO! (novo ciclo iniciado)`)
      }
    } else if (isUpgradedPackage) {
      console.log(`\n   🆕 PRIMEIRO UPGRADE: Contando TODAS as transações de Átomos anteriores`)
    }

    // 7. Buscar TRANSAÇÕES de bônus direto já pagas
    // UPGRADED: Busca APÓS o último upgrade até AGORA (para verificar consumo do limite)
    // REMAINING: NÃO busca nada (contador zerado, novo ciclo iniciado)

    let directBonusTransactions: any[] = []

    // Se é pacote REMAINING após upgrade, já pago = 0 (novo ciclo)
    // IMPORTANTE: REMAINING sempre zera, com ou sem cutoffDate!
    if (!isUpgradedPackage && resultantPackageIdForLimit) {
      console.log(`   💰 PACOTE REMAINING: Novo ciclo iniciado, já pago = R$ 0`)
      directBonusTransactions = []
    } else {
      // Para UPGRADED ou compras normais, buscar transações
      console.log(`\n   🔍 BUSCANDO TRANSAÇÕES com filtros:`)
      console.log(`      userId (patrocinador): ${Number(sponsorId)}`)
      console.log(`      sourceUserId (indicado): ${Number(userId)}`)
      console.log(`      type: DIRECT_BONUS`)
      console.log(`      status: COMPLETED`)
      console.log(`      correlationID NOT: ${correlationID || 'N/A'}`)
      console.log(`      createdAt >= ${cutoffDate ? cutoffDate.toISOString() : 'SEM FILTRO'}`)

      directBonusTransactions = await prisma.transaction.findMany({
        where: {
          userId: sponsorId,  // Transações do patrocinador
          type: 'DIRECT_BONUS',
          status: 'COMPLETED',
          sourceUserId: userId,  // Originadas deste indicado
          // Excluir transações desta compra atual
          ...(correlationID ? {
            NOT: { correlationID: correlationID }
          } : {}),
          // Buscar transações APÓS o último upgrade (inclusive o momento do upgrade)
          ...(cutoffDate ? {
            createdAt: { gte: cutoffDate }
          } : {})
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          correlationID: true,
          description: true,
          sourceUserId: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      console.log(`   📊 Query executada, ${directBonusTransactions.length} transações retornadas`)

      // DEBUG: Buscar TODAS as transações (sem filtro de data) para comparar
      if (directBonusTransactions.length === 0 && cutoffDate) {
        console.log(`\n   🐛 DEBUG: Nenhuma transação encontrada. Buscando TODAS para comparar...`)
        const allTransactions = await prisma.transaction.findMany({
          where: {
            userId: sponsorId,
            type: 'DIRECT_BONUS',
            status: 'COMPLETED',
            sourceUserId: userId,
            NOT: { correlationID: correlationID }
          },
          select: {
            id: true,
            amount: true,
            createdAt: true,
            correlationID: true
          },
          orderBy: { createdAt: 'desc' }
        })

        console.log(`   🐛 Total de transações SEM filtro de data: ${allTransactions.length}`)
        allTransactions.forEach(tx => {
          const isAfterCutoff = tx.createdAt > cutoffDate
          const compareSymbol = isAfterCutoff ? '✅' : '❌'
          console.log(`      ${compareSymbol} R$ ${tx.amount} - ${tx.createdAt.toISOString()} (cutoff: ${cutoffDate.toISOString()})`)
        })
      }
    }

    console.log(`\n   💳 Transações de bônus direto encontradas: ${directBonusTransactions.length}`)
    if (directBonusTransactions.length > 0) {
      console.log(`   📋 Todas as transações encontradas:`)
      directBonusTransactions.forEach(tx => {
        console.log(`      - ID: ${Number(tx.id)}, R$ ${tx.amount}, ${tx.createdAt.toISOString()}, ${tx.description}`)
      })
    }

    // 8. Somar TODAS as transações encontradas
    // IMPORTANTE: As transações já foram filtradas por sourceUserId e por data (após último upgrade)
    // Então TODAS essas transações são do tipo de pacote correto (packageIdToCount)
    // Não precisamos buscar UserPackages para verificar tipo!

    let alreadyPaid = 0

    for (const tx of directBonusTransactions) {
      alreadyPaid += Number(tx.amount)
      console.log(`   ✅ R$ ${tx.amount} - ${tx.createdAt.toISOString()}`)
    }

    const relevantTransactionsCount = directBonusTransactions.length

    if (correlationID) {
      console.log(`   ⚠️  Excluindo transações da compra atual (correlationID: ${correlationID})`)
    }

    const periodDescription = isUpgradedPackage ? 'ANTES do upgrade' : 'APÓS o último upgrade'
    console.log(`   💰 Comissão JÁ PAGA ao patrocinador (${periodDescription}): R$ ${alreadyPaid.toFixed(2)} (${relevantTransactionsCount} de ${directBonusTransactions.length} transações)`)

    // 4. Verificar se JÁ atingiu o limite (antes desta compra)
    if (alreadyPaid >= maxAllowedBonus) {
      console.log(`   ❌ LIMITE JÁ ATINGIDO: R$ ${alreadyPaid} >= R$ ${maxAllowedBonus}`)
      console.log(`   ⚠️  Comissão desta compra = R$ 0`)
      return {
        amount: new Decimal(0),
        trackerId: BigInt(0)
      }
    }

    // 5. Calcular valor RESTANTE até o limite
    const remaining = maxAllowedBonus - alreadyPaid
    console.log(`   📊 Valor RESTANTE até limite: R$ ${remaining}`)

    // 6. Calcular quanto PODE pagar nesta compra
    // Exemplo: restam R$ 20, está comprando 2 Átomos (R$ 60) → pagar apenas R$ 20
    const normalAmount = Number(normalBonusAmount)
    const finalBonus = Math.min(normalAmount, remaining)

    console.log(`\n   📊 CÁLCULO FINAL:`)
    console.log(`      Tentando pagar: R$ ${normalAmount} (${quantity} pacotes × R$ ${bonusPerUnit})`)
    console.log(`      Restante permitido: R$ ${remaining}`)
    console.log(`      Resultado: min(R$ ${normalAmount}, R$ ${remaining}) = R$ ${finalBonus}`)

    if (finalBonus < normalAmount) {
      console.log(`   ⚠️  COMISSÃO REDUZIDA: R$ ${finalBonus} ao invés de R$ ${normalAmount}`)
    } else if (finalBonus === 0) {
      console.log(`   ❌ COMISSÃO BLOQUEADA: limite já atingido`)
    } else {
      console.log(`   ✅ COMISSÃO COMPLETA: dentro do limite`)
    }

    return {
      amount: new Decimal(finalBonus),
      trackerId: BigInt(0)
    }

  } catch (error) {
    console.error(`❌ Erro ao calcular comissão proporcional:`, error)
    // Em caso de erro, retornar valor normal para não travar o sistema
    return {
      amount: normalBonusAmount,
      trackerId: BigInt(0)
    }
  }
}

// ====================================
// FUNÇÕES DE CRIAÇÃO/ATUALIZAÇÃO
// ====================================

/**
 * Cria ou atualiza usuário unilevel
 */
export async function createOrUpdateUnilevelUser(userId: bigint, sponsorId?: bigint): Promise<any> {
  const existingUser = await prisma.unilevelUser.findUnique({
    where: { userId }
  })

  if (existingUser) {
    // Atualizar sponsor se fornecido
    if (sponsorId && existingUser.sponsorId !== sponsorId) {
      return await prisma.unilevelUser.update({
        where: { id: existingUser.id },
        data: { sponsorId }
      })
    }
    return existingUser
  }

  // Criar novo usuário unilevel
  return await prisma.unilevelUser.create({
    data: {
      userId,
      sponsorId,
      totalPoints: 0,
      teamVolume: new Decimal(0),
      isActive: true
    }
  })
}

// ====================================
// FUNÇÕES DE DISTRIBUIÇÃO DE BÔNUS
// ====================================

/**
 * Distribui bônus de indicação direta
 */
async function distributeDirectBonus(
  sponsorId: bigint,
  bonusAmount: Decimal,
  sourceUserId: bigint,
  correlationID?: string,
  packageId?: bigint
): Promise<void> {
  const isEnabled = await getUnilevelParameter(ParameterKeys.UNILEVEL_DIRECT_BONUS_ENABLED)
  if (!isEnabled) {
    console.log(`⚠️  Bônus direto unilevel está desabilitado`)
    return
  }

  // Verificar se o patrocinador está ativo 
  const isSponsorActive = await isUserActive(sponsorId)
  if (!isSponsorActive) {
    console.log(`⚠️  Patrocinador ${Number(sponsorId)} não está ativo`)
    return
  }

  await creditUnilevelBonus(
    sponsorId,
    bonusAmount,
    'DIRECT_BONUS',
    `Bônus de indicação direta`,
    1,
    sourceUserId,
    correlationID
  )

  // Bônus de Indicação Turbinada
  try {
    const turboEnabledParam = await prisma.parameter.findUnique({ where: { key: ParameterKeys.BOOTED_BONUS } })
    const turboEnabled = turboEnabledParam ? turboEnabledParam.value === 'true' : false
    if (turboEnabled && packageId) {
      const pkg = await prisma.package.findUnique({ where: { id: packageId } })
      if (pkg && pkg.boosted && new Decimal(pkg.boosted).gt(0)) {
        await creditUnilevelBonus(
          sponsorId,
          new Decimal(pkg.boosted),
          'BOOSTED_BONUS',
          `Bônus de indicação turbinada`,
          1,
          sourceUserId,
          correlationID
        )
        console.log(`🚀 Bônus turbinado creditado: R$ ${pkg.boosted} para usuário ${Number(sponsorId)}`)
      }
    }
  } catch (err) {
    console.error('Erro ao processar bônus turbinado:', err)
  }
}

/**
 * Distribui bônus de indicação indireta pelos níveis 2-7
 */
async function distributeIndirectBonuses(
  userId: bigint,
  packageValue: Decimal,
  packageData: UnilevelPackageData,
  correlationID?: string
): Promise<void> {
  const isEnabled = await getUnilevelParameter(ParameterKeys.UNILEVEL_INDIRECT_BONUS_ENABLED)
  if (!isEnabled) {
    console.log(`⚠️  Bônus indireto unilevel está desabilitado`)
    return
  }

  const indirectPercentages = await getUnilevelIndirectBonusPercentages()

  // Buscar o patrocinador direto
  const unilevelUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { sponsorId: true, sponsor: true }
  })

  if (!unilevelUser?.sponsorId) {
    console.log(`Usuário ${Number(userId)} não tem patrocinador direto`)
    return
  }

  // Navegar a linha ascendente para distribuir bônus
  let currentSponsorId: bigint | undefined = unilevelUser.sponsor?.sponsorId || undefined
  let currentLevel = 2 // Começar no nível 2

  while (currentSponsorId && currentLevel <= indirectPercentages.maxLevels) {
    // Buscar o patrocinador atual com seu nível de carreira
    const sponsor = await prisma.unilevelUser.findUnique({
      where: { userId: currentSponsorId },
      select: {
        id: true,
        userId: true,
        sponsorId: true,
      }
    })

    if (!sponsor) {
      console.log(`Patrocinador ${Number(currentSponsorId)} não encontrado`)
      break
    }

    const careerLevel = await getCurrentCareerLevel(sponsor.userId)

    // Verificar se o patrocinador está ativo
    const isSponsorActive = await isUserActive(sponsor.userId)
    if (!isSponsorActive) {
      console.log(`Patrocinador ${Number(sponsor.userId)} não está ativo no nível ${currentLevel}`)
      currentSponsorId = sponsor.sponsorId || undefined
      currentLevel++
      continue
    }

    // Verificar se o patrocinador pode receber bônus neste nível baseado em sua carreira
    // Sem carreira = apenas nível 2 (1 nível), com carreira = baseado no indirectBonusLevels
    const maxIndirectLevels = careerLevel ? careerLevel.indirectBonusLevels : 1

    // Se o usuário tem carreira mas indirectBonusLevels é 0, não pode receber bônus indiretos
    if (careerLevel && careerLevel.indirectBonusLevels === 0) {
      console.log(`Patrocinador ${Number(sponsor.userId)} (${careerLevel.careerName}) não pode receber bônus indiretos (indirectBonusLevels: 0)`)
      currentSponsorId = sponsor.sponsorId || undefined
      currentLevel++
      continue
    }

    // Verificar se o nível atual está dentro do limite permitido
    if (currentLevel > maxIndirectLevels + 1) { // +1 porque os níveis começam do 2
      console.log(`Patrocinador ${Number(sponsor.userId)} (${careerLevel?.careerName || 'Sem carreira'}) não pode receber bônus no nível ${currentLevel} (máximo: ${maxIndirectLevels} níveis a partir do nível 2)`)
      currentSponsorId = sponsor.sponsorId || undefined
      currentLevel++
      continue
    }

    // Calcular bônus para este nível
    const percentage = getPercentageByLevel(currentLevel, indirectPercentages)
    const bonusAmount = packageValue.mul(percentage).div(100)

    // Creditar bônus
    await creditUnilevelBonus(
      sponsor.userId,
      bonusAmount,
      'INDIRECT_BONUS',
      `Bônus de indicação indireta - Nível ${currentLevel} (${percentage}%)`,
      currentLevel,
      userId,
      correlationID
    )

    console.log(`✅ Bônus nível ${currentLevel}: R$ ${bonusAmount} para usuário ${Number(sponsor.userId)} (${careerLevel?.careerName || 'Sem carreira'})`)

    // Subir para o próximo nível
    currentSponsorId = sponsor.sponsorId || undefined
    currentLevel++
  }
}

/**
 * Distribui bônus de reativação na linha ascendente
 */
async function distributeReactivationBonuses(
  userId: bigint,
  reactivationBonus: Decimal,
  correlationID?: string
): Promise<void> {
  const isEnabled = await getUnilevelParameter(ParameterKeys.UNILEVEL_REACTIVATION_BONUS_ENABLED)
  if (!isEnabled) {
    console.log(`⚠️  Bônus de reativação unilevel está desabilitado`)
    return
  }

  // Buscar o patrocinador direto
  const unilevelUser = await prisma.unilevelUser.findUnique({
    where: { userId },
    select: { sponsorId: true }
  })

  if (!unilevelUser?.sponsorId) {
    console.log(`Usuário ${Number(userId)} não tem patrocinador direto`)
    return
  }

  // Navegar a linha ascendente para distribuir bônus de reativação
  let currentSponsorId: bigint | undefined = unilevelUser.sponsorId
  let level = 1

  while (currentSponsorId) {
    // Buscar o patrocinador atual com seu nível de carreira
    const sponsor = await prisma.unilevelUser.findUnique({
      where: { userId: currentSponsorId },
      select: {
        id: true,
        userId: true,
        sponsorId: true
      }
    })

    if (!sponsor) {
      console.log(`Patrocinador ${Number(currentSponsorId)} não encontrado`)
      break
    }

    // Buscar o nível de carreira do patrocinador
    const careerLevel = await getCurrentCareerLevel(sponsor.userId)

    // Verificar se o patrocinador está ativo
    const isSponsorActive = await isUserActive(sponsor.userId)
    if (!isSponsorActive) {
      console.log(`Patrocinador ${Number(sponsor.userId)} não está ativo no nível ${level}`)
      currentSponsorId = sponsor.sponsorId || undefined
      level++
      continue
    }

    // Verificar se o patrocinador pode receber bônus de reativação neste nível baseado em sua carreira
    // Sem carreira = apenas nível 1 (1 nível), com carreira = baseado no reactivationLevels
    const maxReactivationLevels = careerLevel ? careerLevel.reactivationLevels : 0

    // Se o usuário tem carreira mas reactivationLevels é 0, não pode receber bônus de reativação
    if (careerLevel && careerLevel.reactivationLevels === 0) {
      console.log(`Patrocinador ${Number(sponsor.userId)} (${careerLevel.careerName}) não pode receber bônus de reativação (reactivationLevels: 0)`)
      currentSponsorId = sponsor.sponsorId || undefined
      level++
      continue
    }

    // Verificar se o nível atual está dentro do limite permitido
    if (level > maxReactivationLevels) {
      console.log(`Patrocinador ${Number(sponsor.userId)} (${careerLevel?.careerName || 'Sem carreira'}) não pode receber bônus de reativação no nível ${level} (máximo: ${maxReactivationLevels} níveis)`)
      currentSponsorId = sponsor.sponsorId || undefined
      level++
      continue
    }

    // Creditar bônus de reativação
    await creditUnilevelBonus(
      sponsor.userId,
      reactivationBonus,
      'ACTIVATION_BONUS',
      `Bônus de reativação unilevel - Nível ${level}${correlationID ? ` - ${correlationID}` : ''}`,
      level,
      userId
    )

    console.log(`✅ Bônus de reativação nível ${level}: R$ ${reactivationBonus} para usuário ${Number(sponsor.userId)} (${careerLevel?.careerName || 'Sem carreira'})`)

    // Subir para o próximo nível
    currentSponsorId = sponsor.sponsorId || undefined
    level++
  }
}

// ====================================
// FUNÇÕES DE PONTOS E CARREIRA
// ====================================

/**
 * Atualiza pontos do usuário (acumulados)
 */
async function updateMonthlyPoints(userId: bigint, points: number): Promise<void> {
  // Atualizar apenas os pontos totais acumulados
  await prisma.unilevelUser.update({
    where: { userId },
    data: {
      totalPoints: {
        increment: points
      }
    }
  })
}

/**
 * Atualiza pontos na linha ascendente usando nova estratégia de cache
 * 
 * NOVA ESTRATÉGIA (100x mais rápido):
 * 1. Atualiza ownPoints do próprio usuário (1 query)
 * 2. Marca linha ascendente para recalculo (1 query em batch)
 * 3. Job em background processa recalculo depois
 */
async function updateUplinePoints(
  userId: bigint,
  points: number,
  correlationID?: string
): Promise<void> {
  console.log(`✅ Atualizando pontos (nova estratégia): ${points} pontos`)

  // Importar funções do novo módulo
  const { updateOwnPoints, markUplineForRecalc } = await import('./points-calculator')

  // 1. Atualizar pontos próprios do usuário (IMEDIATO - 1 query)
  await updateOwnPoints(userId, points)
  console.log(`   ✅ Pontos próprios atualizados: +${points}`)

  // 2. Marcar linha ascendente para recalculo (IMEDIATO - 1 query batch)
  const markedCount = await markUplineForRecalc(userId)
  console.log(`   ✅ ${markedCount} usuários na linha ascendente marcados para recalculo`)
  console.log(`   ℹ️  Recalculo será processado pelo job em background`)

  // Total: 2 queries ao invés de 100+
}

/**
 * Verifica e atualiza progressão de carreira para usuário e linha ascendente
 * Executa checkCareerProgression para o usuário atual e seus uplines (limitado)
 * 
 * @param userId - ID do usuário
 * @param maxLevels - Número máximo de níveis a processar (default: 5 para performance)
 * 
 * OTIMIZAÇÃO: Limita processamento imediato a poucos níveis para evitar timeout.
 * Níveis além do limite podem ser processados em background/cron job.
 */
export async function checkCareerProgressionForUpline(userId: bigint, maxLevels: number = 2): Promise<void> {
  console.log(`🚀 INICIANDO verificação de progressão de carreira (máx: ${maxLevels} níveis)`)
  console.log(`   Usuário inicial: ${Number(userId)}`)

  console.log('----------checkCareerProgressionForUpline------------- user:', userId)

  try {
    // 1. Verificar progressão para o usuário atual
    await checkCareerProgression(userId)
    console.log(`✅ Progressão verificada para usuário ${Number(userId)}`)

    // 2. Buscar o patrocinador direto
    const unilevelUser = await prisma.unilevelUser.findUnique({
      where: { userId },
      select: { sponsorId: true }
    })

    if (!unilevelUser?.sponsorId) {
      console.log(`ℹ️  Usuário ${Number(userId)} não tem patrocinador direto - fim da linha`)
      return
    }

    // 3. Navegar pela linha ascendente até o limite de níveis
    let currentSponsorId: bigint | undefined = unilevelUser.sponsorId
    let level = 1

    while (currentSponsorId && level <= maxLevels) {
      console.log(`\n📊 Verificando progressão para patrocinador nível ${level}: ${Number(currentSponsorId)}`)

      try {
        // Verificar se o patrocinador está ativo
        const isSponsorActive = await isUserActive(currentSponsorId)
        if (!isSponsorActive) {
          console.log(`⚠️  Patrocinador ${Number(currentSponsorId)} não está ativo no nível ${level}`)
          // Continuar subindo na linha mesmo se inativo
        }

        // Verificar progressão de carreira para este patrocinador
        await checkCareerProgression(currentSponsorId)
        console.log(`✅ Progressão verificada para patrocinador nível ${level}: ${Number(currentSponsorId)}`)

      } catch (error) {
        console.error(`❌ Erro ao verificar progressão para patrocinador ${Number(currentSponsorId)}:`, error)
        // Continuar com o próximo patrocinador mesmo se houver erro
      }

      // Buscar o próximo patrocinador na linha
      const nextSponsor = await prisma.unilevelUser.findUnique({
        where: { userId: currentSponsorId },
        select: { sponsorId: true }
      })

      if (!nextSponsor?.sponsorId) {
        console.log(`🏁 Fim da linha ascendente no nível ${level}`)
        break
      }

      // Subir para o próximo nível
      currentSponsorId = nextSponsor.sponsorId
      level++
    }

    if (level > maxLevels && currentSponsorId) {
      console.log(`⏭️  Limite de ${maxLevels} níveis atingido - agendando níveis restantes para processamento`)

      // Marcar níveis restantes para processamento em background
      await queueRemainingCareerChecks(currentSponsorId)
    }

    console.log(`🎉 Verificação de progressão concluída (${Math.min(level, maxLevels)} níveis processados)`)

  } catch (error) {
    console.error(`❌ Erro durante verificação de progressão para linha ascendente:`, error)
    throw error
  }
}

/**
 * Verifica e atualiza progressão de carreira
 * Calcula pontos baseado na pontuação dos diretos considerando maxTeamVolumePercent
 * Salva histórico completo na tabela unilevel_user_career
 */
async function checkCareerProgression(userId: bigint): Promise<void> {
  const isEnabled = await getUnilevelParameter(ParameterKeys.UNILEVEL_CAREER_PROGRESSION_ENABLED)
  if (!isEnabled) {
    console.log(`⚠️  Progressão de carreira unilevel está desabilitada`)
    return
  }

  const unilevelUser = await prisma.unilevelUser.findUnique({
    where: { userId }
  })

  if (!unilevelUser) {
    console.log(`Usuário ${Number(userId)} não encontrado na rede unilevel`)
    return
  }

  // Buscar todos os diretos do usuário
  const directReferrals = await prisma.unilevelUser.findMany({
    where: { sponsorId: userId },
    select: {
      id: true,
      userId: true,
      totalPoints: true
    }
  })

  console.log(`📊 Analisando progressão de carreira para usuário ${Number(userId)}`)
  console.log(`   Diretos encontrados: ${directReferrals.length}`)

  // Calcular quantidade de diretos com pacote unilevel ATIVO (distintos por userId)
  const directUserIds = directReferrals.map(d => d.userId)
  let activeDirectsCount = 0
  if (directUserIds.length > 0) {
    const activeDirectUsers = await prisma.userPackage.findMany({
      where: {
        userId: { in: directUserIds },
        isActive: true,
        isUnilevel: true
      },
      distinct: ['userId'],
      select: { userId: true }
    })
    activeDirectsCount = activeDirectUsers.length
  }
  console.log(`   Diretos com pacote ativo: ${activeDirectsCount}`)

  // Buscar níveis de carreira usando cache (OTIMIZAÇÃO)
  const careerLevels = await getCachedCareerLevels()

  // Buscar a última graduação do usuário
  const lastCareer = await prisma.unilevelUserCareer.findFirst({
    where: { userId },
    orderBy: { graduatedAt: 'desc' }
  })

  console.log(`   Última graduação: ${lastCareer ? `Nível ${lastCareer.careerId} em ${lastCareer.graduatedAt.toLocaleDateString('pt-BR')}` : 'Nenhuma'}`)

  // Calcular pontuação total dos diretos (para referência)
  const totalNetworkPoints = directReferrals.reduce((sum, direct) => {
    return sum + direct.totalPoints
  }, 0)

  console.log(`   Pontuação total dos times: ${totalNetworkPoints}`)

  // Encontrar o nível mais alto para o qual o usuário se qualifica
  let newCareerLevelId: bigint | null = null
  let validPoints = 0
  let maxTeamVolumePercent = 0

  for (const level of careerLevels) {
    const maxTeamVolumePercentDecimal = level.maxTeamVolumePercent.toNumber() / 100
    let totalValidPoints = 0
    let isQualified = false

    console.log(`   Nível ${level.name}:`)
    console.log(`     Percentual máximo por time (VME): ${level.maxTeamVolumePercent}%`)
    console.log(`     Pontuação requerida: ${level.requiredPoints}`)
    console.log(`     Diretos necessários (requiredDirects): ${level.requiredDirects || 0}`)

    // Calcular total de pontos válidos (sempre necessário)
    totalValidPoints = directReferrals.reduce((sum, direct) => {
      const directValidPoints = direct.totalPoints * maxTeamVolumePercentDecimal
      return sum + directValidPoints
    }, 0)

    console.log(`     Modo: Soma de (pontos × VME) de todos os diretos`)
    console.log(`     VME aplicado: ${maxTeamVolumePercentDecimal} (${level.maxTeamVolumePercent}%)`)

    for (const direct of directReferrals) {
      const directValidPoints = direct.totalPoints * maxTeamVolumePercentDecimal
      console.log(`     Direto ${Number(direct.userId)}: ${direct.totalPoints} pontos × ${maxTeamVolumePercentDecimal} = ${directValidPoints.toFixed(2)} pontos válidos`)
    }

    console.log(`     Total de pontos válidos: ${totalValidPoints.toFixed(2)}`)
    console.log(`     Verificação de pontos: ${totalValidPoints.toFixed(2)} >= ${level.requiredPoints} = ${totalValidPoints >= level.requiredPoints ? '✅' : '❌'}`)

    // Verificação básica: soma total de pontos válidos >= pontuação requerida
    isQualified = totalValidPoints >= level.requiredPoints && directReferrals.length > 0

    // Requisito adicional: verificar quantidade de diretos ativos (se requiredDirects > 0)
    if (isQualified && typeof level.requiredDirects === 'number' && level.requiredDirects > 0) {
      console.log(`     Requisito adicional: ${level.requiredDirects} diretos com pacote ativo`)
      console.log(`     Diretos ativos encontrados: ${activeDirectsCount}`)

      if (activeDirectsCount < level.requiredDirects) {
        console.log(`     ❌ Diretos ativos insuficientes: ${activeDirectsCount}/${level.requiredDirects}`)
        isQualified = false
      } else {
        console.log(`     ✅ Diretos ativos suficientes: ${activeDirectsCount}/${level.requiredDirects}`)
      }
    }

    // Requisitos adicionais por pernas (se configurados para este nível)
    if (isQualified) {
      const legsOk = await satisfiesLegRequirements(userId, level.id)
      if (!legsOk) {
        console.log(`     ❌ Requisitos de pernas não atendidos para ${level.name}`)
        isQualified = false
      }
    }

    if (isQualified) {
      newCareerLevelId = level.id
      maxTeamVolumePercent = level.maxTeamVolumePercent.toNumber()
      validPoints = totalValidPoints // CORREÇÃO: Salvar validPoints apenas quando qualificado
      console.log(`     ✅ Qualificado para ${level.name}`)
    } else {
      console.log(`     ❌ Não qualificado para ${level.name}`)
      break
    }
  }

  // Verificar se houve mudança de nível
  const currentCareerLevelId = lastCareer?.careerId || null
  const hasLevelChanged = newCareerLevelId !== currentCareerLevelId

  if (hasLevelChanged) {
    if (newCareerLevelId) {
      console.log('-------------------- Nova graduação - salvar na tabela de histórico ', newCareerLevelId)

      // Verificar se já existe registro com o mesmo careerId para este usuário
      const existingCareer = await prisma.unilevelUserCareer.findFirst({
        where: {
          userId,
          careerId: newCareerLevelId
        }
      })

      if (existingCareer) {
        console.log(`⚠️  Registro de carreira ${Number(newCareerLevelId)} já existe para usuário ${Number(userId)} - pulando criação`)
      } else {
        // Nova graduação - salvar na tabela de histórico
        await prisma.unilevelUserCareer.create({
          data: {
            userId,
            careerId: newCareerLevelId,
            totalNetworkPoints,
            validPoints: Math.round(validPoints),
            maxTeamVolumePercent: new Decimal(maxTeamVolumePercent)
          }
        })
        console.log(`   📊 Histórico salvo: ${totalNetworkPoints} pontos da rede, ${validPoints.toFixed(2)} pontos válidos`)

        // ✅ CORREÇÃO: Atualizar careerLevelId em unilevel_users
        await prisma.unilevelUser.update({
          where: { userId },
          data: { careerLevelId: newCareerLevelId }
        })

        const newLevel = careerLevels.find(l => l.id === newCareerLevelId)
        console.log(`🎉 Usuário ${Number(userId)} promovido para ${newLevel?.name}`)
        console.log(`   ✅ Campo careerLevelId atualizado em unilevel_users`)

        await processCareerPrizes(userId, newCareerLevelId)
      }
    } else {
      // Rebaixamento - limpar careerLevelId
      await prisma.unilevelUser.update({
        where: { userId },
        data: { careerLevelId: null }
      })
      console.log(`📉 Usuário ${Number(userId)} rebaixado de nível`)
    }
  } else {
    console.log(`📊 Usuário ${Number(userId)} mantém nível atual`)

    // CORREÇÃO: Recalcular pontos válidos para o nível atual mesmo sem mudança de nível
    // Isso é necessário quando os pontos da rede mudaram mas o usuário ainda não se qualifica para o próximo nível
    if (lastCareer && totalNetworkPoints !== lastCareer.totalNetworkPoints) {
      const currentLevel = careerLevels.find(l => l.id === lastCareer.careerId)
      if (currentLevel) {
        const currentLevelVME = currentLevel.maxTeamVolumePercent.toNumber() / 100
        const correctValidPoints = directReferrals.reduce((sum, direct) => {
          return sum + (direct.totalPoints * currentLevelVME)
        }, 0)

        // Atualizar o registro de carreira com os pontos válidos corretos
        await prisma.unilevelUserCareer.update({
          where: {
            id: lastCareer.id
          },
          data: {
            totalNetworkPoints,
            validPoints: Math.round(correctValidPoints)
          }
        })

        console.log(`   📊 Pontos da rede atualizados: ${totalNetworkPoints} (era ${lastCareer.totalNetworkPoints})`)
        console.log(`   📊 Pontos válidos atualizados: ${correctValidPoints.toFixed(2)} (era ${lastCareer.validPoints})`)
      }
    }
  }
}

/**
 * Verifica se o usuário atende requisitos por pernas para um patamar alvo
 */
async function satisfiesLegRequirements(userId: bigint, targetCareerId: bigint): Promise<boolean> {
  console.log('🔍 Verificando requisitos de pernas para usuário:', userId, 'nível:', targetCareerId)
  // Buscar requisitos do nível
  const requirementsRows = await prisma.$queryRaw<CareerLegRequirement[]>`
    SELECT id, "careerId", "legSlot", "requiredCareerId", "includeIndirects", "minOccurrences", "createdAt", "updatedAt"
    FROM career_level_leg_requirements
    WHERE "careerId" = ${targetCareerId}
    ORDER BY "legSlot" ASC
  `

  if (!requirementsRows || requirementsRows.length === 0) {
    return true
  }

  // Agrupar por legSlot
  const bySlot = new Map<number, CareerLegRequirement[]>()
  for (const r of requirementsRows) {
    const list = bySlot.get(r.legSlot) || []
    list.push(r)
    bySlot.set(r.legSlot, list)
  }

  // Buscar diretos (pernas)
  const directs = await prisma.unilevelUser.findMany({
    where: { sponsorId: userId },
    select: { userId: true, careerLevelId: true }
  })

  if (directs.length === 0) {
    return false
  }

  // Pré-carregar ranking dos níveis para comparação (>= requerido)
  const levels = await prisma.careerLevel.findMany({
    where: { isActive: true },
    select: { id: true, requiredPoints: true }
  })
  const pointsByLevel = new Map<string, number>()
  for (const l of levels) {
    pointsByLevel.set(String(l.id), l.requiredPoints)
  }

  const legSatisfies = async (directUserId: bigint, req: CareerLegRequirement): Promise<number> => {
    const requiredPoints = pointsByLevel.get(String(req.requiredCareerId)) || Number.MAX_SAFE_INTEGER

    // Coletar todos os userIds da subárvore (direto + indiretos se necessário)
    let networkUserIds: bigint[] = [directUserId]
    if (req.includeIndirects) {
      networkUserIds = await collectNetworkUserIds(directUserId, 3) // Limitar a 3 níveis
    }

    // Buscar careers de todos de uma vez usando a mesma lógica do frontend
    const careerMap = await getUserCurrentCareerLevel(networkUserIds)

    let count = 0
    for (const userId of networkUserIds) {
      const careerId = careerMap.get(String(userId))
      if (careerId) {
        const points = pointsByLevel.get(String(careerId)) || 0
        if (points >= requiredPoints) {
          count++
        }
      }
    }

    return count
  }

  // Helper: Buscar careerLevelId atual de usuários (igual ao frontend)
  const getUserCurrentCareerLevel = async (userIds: bigint[]): Promise<Map<string, bigint | null>> => {
    if (userIds.length === 0) return new Map()

    const latestCareers = await prisma.$queryRaw<Array<{ userId: bigint, careerId: bigint }>>`
      SELECT DISTINCT ON ("userId") "userId", "careerId"
      FROM unilevel_user_career
      WHERE "userId" = ANY(${userIds}::bigint[])
      ORDER BY "userId", "graduatedAt" DESC
    `

    const careerMap = new Map<string, bigint | null>()
    for (const userId of userIds) {
      careerMap.set(String(userId), null)
    }
    for (const record of latestCareers) {
      careerMap.set(String(record.userId), record.careerId)
    }

    return careerMap
  }

  // Coletar todos os userIds da rede para buscar careers de uma vez (igual ao frontend)
  const collectNetworkUserIds = async (rootUserId: bigint, maxDepth: number): Promise<bigint[]> => {
    const userIds: bigint[] = []
    const queue: Array<{ userId: bigint, depth: number }> = [{ userId: rootUserId, depth: 0 }]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const { userId: current, depth } = queue.shift()!
      const key = String(current)
      if (visited.has(key) || depth >= maxDepth) continue
      visited.add(key)
      userIds.push(current)

      const children = await prisma.unilevelUser.findMany({
        where: { sponsorId: current },
        select: { userId: true }
      })

      for (const child of children) {
        queue.push({ userId: child.userId, depth: depth + 1 })
      }
    }

    return userIds
  }

  // Construir mapa slot -> pernas candidatas
  const slotCandidates = new Map<number, Array<{ userId: bigint; capacity: number }>>()
  for (const [slot, reqs] of bySlot.entries()) {
    const candidates: Array<{ userId: bigint; capacity: number }> = []
    for (const d of directs) {
      // Para o slot, todas as requirements devem ser satisfeitas na mesma perna
      let capacityForLeg = Infinity
      let ok = true
      for (const req of reqs) {
        const satisfiedCount = await legSatisfies(d.userId, req)
        if (satisfiedCount < req.minOccurrences) {
          ok = false
          break
        }
        capacityForLeg = Math.min(capacityForLeg, Math.floor(satisfiedCount / req.minOccurrences))
      }
      if (ok && capacityForLeg > 0) {
        candidates.push({ userId: d.userId, capacity: capacityForLeg })
      }
    }
    slotCandidates.set(slot, candidates)
  }

  // Alocar pernas distintas para cada slot (guloso ordenado por menor número de candidatos)
  const slotsOrdered = Array.from(slotCandidates.entries()).sort((a, b) => a[1].length - b[1].length)
  const usedLegs = new Set<string>()
  for (const [slot, candidates] of slotsOrdered) {
    const available = candidates.find(c => !usedLegs.has(String(c.userId)) && c.capacity > 0)
    if (!available) {
      return false
    }
    usedLegs.add(String(available.userId))
  }

  return true
}


// ====================================
// FUNÇÕES AUXILIARES
// ====================================

/**
 * Busca parâmetro unilevel
 */
async function getUnilevelParameter(key: string): Promise<boolean> {
  try {
    const param = await prisma.parameter.findUnique({
      where: { key }
    })
    return param ? param.value === 'true' : true
  } catch (error) {
    console.error(`Erro ao buscar parâmetro ${key}:`, error)
    return true
  }
}

/**
 * Busca os percentuais de indicação indireta
 */
async function getUnilevelIndirectBonusPercentages(): Promise<{
  level2: Decimal
  level3: Decimal
  level4: Decimal
  level5: Decimal
  level6: Decimal
  level7: Decimal
  level8: Decimal
  maxLevels: number
}> {
  try {
    const [
      level2Param, level3Param, level4Param,
      level5Param, level6Param, level7Param, level8Param, maxLevelsParam
    ] = await Promise.all([
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_2_PERCENT }
      }),
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_3_PERCENT }
      }),
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_4_PERCENT }
      }),
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_5_PERCENT }
      }),
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_6_PERCENT }
      }),
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_7_PERCENT }
      }),
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.UNILEVEL_INDIRECT_LEVEL_8_PERCENT }
      }),
      prisma.parameter.findUnique({
        where: { key: ParameterKeys.UNILEVEL_MAX_INDIRECT_LEVELS }
      })
    ])

    return {
      level2: level2Param ? new Decimal(level2Param.value) : new Decimal(5),
      level3: level3Param ? new Decimal(level3Param.value) : new Decimal(4),
      level4: level4Param ? new Decimal(level4Param.value) : new Decimal(3),
      level5: level5Param ? new Decimal(level5Param.value) : new Decimal(2),
      level6: level6Param ? new Decimal(level6Param.value) : new Decimal(1),
      level7: level7Param ? new Decimal(level7Param.value) : new Decimal(0.5),
      level8: level8Param ? new Decimal(level8Param.value) : new Decimal(0.5),
      maxLevels: maxLevelsParam ? parseInt(maxLevelsParam.value) : 8
    }
  } catch (error) {
    console.error('Erro ao buscar percentuais de indicação indireta:', error)
    return {
      level2: new Decimal(5),
      level3: new Decimal(4),
      level4: new Decimal(3),
      level5: new Decimal(2),
      level6: new Decimal(1),
      level7: new Decimal(0.5),
      level8: new Decimal(0.5),
      maxLevels: 8
    }
  }
}

/**
 * Retorna percentual por nível
 */
function getPercentageByLevel(level: number, percentages: any): Decimal {
  switch (level) {
    case 2: return percentages.level2
    case 3: return percentages.level3
    case 4: return percentages.level4
    case 5: return percentages.level5
    case 6: return percentages.level6
    case 7: return percentages.level7
    case 8: return percentages.level8
    default: return new Decimal(0)
  }
}

/**
 * Credita bônus unilevel
 */
async function creditUnilevelBonus(
  userId: bigint,
  amount: Decimal,
  type: string,
  description: string,
  level?: number,
  sourceUserId?: bigint,
  correlationID?: string
): Promise<void> {
  // ✅ PROTEÇÃO CONTRA DUPLICAÇÃO: Verificar se já existe bônus com mesmo correlationID
  if (correlationID) {
    const existingBonus = await prisma.transaction.findFirst({
      where: {
        userId,
        type: type as any,
        correlationID,
        level: level || null,
        sourceUserId: sourceUserId || null
      }
    })

    if (existingBonus) {
      console.log(`⚠️  Bônus ${type} já existe para usuário ${Number(userId)} com correlationID ${correlationID} - pulando criação`)
      return
    }
  }

  // Registrar na tabela transactions com campos específicos para bônus unilevel
  await prisma.transaction.create({
    data: {
      userId,
      type: type as any,
      amount,
      description,
      level,
      sourceUserId,
      status: 'COMPLETED',
      correlationID,
      quantity: 1
    }
  })
}

/**
 * Cria transação unilevel
 */
async function createUnilevelTransaction(
  userId: bigint,
  amount: Decimal,
  type: string,
  correlationID?: string,
  quantity?: number,
  description?: string
): Promise<void> {
  // Para transações PURCHASE, verificar se já existe uma transação com este correlationID
  if (type === 'PURCHASE' && correlationID) {
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        userId,
        type: 'PURCHASE',
        description: { contains: correlationID }
      }
    })

    if (existingTransaction) {
      console.log(`✅ Transação PURCHASE já existe para correlationID ${correlationID}`)
      return
    }
  }

  await prisma.transaction.create({
    data: {
      userId,
      type: type as any,
      amount,
      description: description || `Transação unilevel - ${type}`,
      correlationID,
      status: 'COMPLETED',
      quantity: quantity || 1
    }
  })
}

// ====================================
// FUNÇÕES DE CONSULTA
// ====================================

/**
 * Busca o nível atual de carreira de um usuário
 * Retorna a última graduação da tabela unilevel_user_career
 */
export async function getCurrentCareerLevel(userId: bigint): Promise<{
  careerId: bigint
  careerName: string
  indirectBonusLevels: number
  reactivationLevels: number
  totalNetworkPoints: number
  validPoints: number
  maxTeamVolumePercent: number
  graduatedAt: Date
  prizeChoice: string | null
  hasPrizeChoice: boolean
  careerPrizeValue: number | null
  careerPrizeDescription: string | null
} | null> {
  const lastCareer = await prisma.unilevelUserCareer.findFirst({
    where: { userId },
    include: {
      career: {
        select: {
          name: true,
          indirectBonusLevels: true,
          reactivationLevels: true,
          hasPrizeChoice: true,
          careerPrizeValue: true,
          careerPrizeDescription: true
        }
      }
    },
    orderBy: { graduatedAt: 'desc' }
  })

  if (!lastCareer) {
    return null
  }

  return {
    careerId: lastCareer.careerId,
    careerName: lastCareer.career.name,
    indirectBonusLevels: lastCareer.career.indirectBonusLevels,
    reactivationLevels: lastCareer.career.reactivationLevels,
    totalNetworkPoints: lastCareer.totalNetworkPoints,
    validPoints: lastCareer.validPoints,
    maxTeamVolumePercent: lastCareer.maxTeamVolumePercent.toNumber(),
    graduatedAt: lastCareer.graduatedAt,
    prizeChoice: lastCareer.prizeChoice,
    hasPrizeChoice: lastCareer.career.hasPrizeChoice,
    careerPrizeValue: lastCareer.career.careerPrizeValue?.toNumber() ?? null,
    careerPrizeDescription: lastCareer.career.careerPrizeDescription
  }
}

/**
 * Busca o histórico completo de carreira de um usuário
 */
export async function getCareerHistory(userId: bigint): Promise<{
  careerId: bigint
  careerName: string
  totalNetworkPoints: number
  validPoints: number
  maxTeamVolumePercent: number
  graduatedAt: Date
  prizeChoice: string | null
  hasPrizeChoice: boolean
  careerPrizeValue: number | null
  careerPrizeDescription: string | null
}[]> {
  const careerHistory = await prisma.unilevelUserCareer.findMany({
    where: { userId },
    include: {
      career: {
        select: {
          name: true,
          hasPrizeChoice: true,
          careerPrizeValue: true,
          careerPrizeDescription: true
        }
      }
    },
    orderBy: { graduatedAt: 'desc' }
  })

  return careerHistory.map(record => ({
    careerId: record.careerId,
    careerName: record.career.name,
    totalNetworkPoints: record.totalNetworkPoints,
    validPoints: record.validPoints,
    maxTeamVolumePercent: record.maxTeamVolumePercent.toNumber(),
    graduatedAt: record.graduatedAt,
    prizeChoice: record.prizeChoice,
    hasPrizeChoice: record.career.hasPrizeChoice,
    careerPrizeValue: record.career.careerPrizeValue?.toNumber() ?? null,
    careerPrizeDescription: record.career.careerPrizeDescription
  }))
}

/**
 * Calcula o nível de um usuário na rede unilevel
 */
export async function calculateUnilevelLevel(userId: bigint, targetUserId: bigint): Promise<number> {
  if (userId === targetUserId) {
    return 0 // Mesmo usuário
  }

  let currentUserId = targetUserId
  let level = 0

  while (currentUserId && level < 10) { // Limite de segurança
    // Buscar o patrocinador direto
    const unilevelUser = await prisma.unilevelUser.findUnique({
      where: { userId: currentUserId },
      select: { sponsorId: true }
    })

    if (!unilevelUser?.sponsorId) {
      break // Fim da linha
    }

    level++

    // Se encontrou o usuário alvo, retorna o nível
    if (unilevelUser.sponsorId === userId) {
      return level
    }

    // Continuar subindo na linha
    currentUserId = unilevelUser.sponsorId
  }

  return -1 // Usuário não encontrado na linha ascendente
}

/**
 * Busca a árvore completa de um usuário (downline)
 */
export async function getUserUnilevelDownline(userId: bigint): Promise<UnilevelNetworkData> {
  const result: UnilevelNetworkData = {
    level1: [],
    level2: [],
    level3: [],
    level4: [],
    level5: [],
    level6: [],
    level7: []
  }

  // Buscar cada nível
  for (let level = 1; level <= 7; level++) {
    const users = await getUsersAtLevel(userId, level)
    switch (level) {
      case 1: result.level1 = users; break
      case 2: result.level2 = users; break
      case 3: result.level3 = users; break
      case 4: result.level4 = users; break
      case 5: result.level5 = users; break
      case 6: result.level6 = users; break
      case 7: result.level7 = users; break
    }
  }

  return result
}

/**
 * Busca usuários em um nível específico
 */
async function getUsersAtLevel(sponsorId: bigint, level: number): Promise<UnilevelUserData[]> {
  if (level === 1) {
    // Nível 1 = indicações diretas
    const users = await prisma.unilevelUser.findMany({
      where: { sponsorId },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return users.map(u => ({
      id: u.id,
      userId: u.userId,
      sponsorId: u.sponsorId || undefined,
      careerLevelId: u.careerLevelId || undefined,
      totalPoints: u.totalPoints,
      teamVolume: u.teamVolume,
      isActive: u.isActive
    }))
  }

  // Para níveis 2+, navegar recursivamente
  const users: UnilevelUserData[] = []
  const directReferrals = await prisma.unilevelUser.findMany({
    where: { sponsorId },
    select: { userId: true }
  })

  for (const referral of directReferrals) {
    const nextLevelUsers = await getUsersAtLevel(referral.userId, level - 1)
    users.push(...nextLevelUsers)
  }

  return users
}

/**
 * Obtém estatísticas de um usuário unilevel
 */
export async function getUnilevelUserStats(userId: bigint): Promise<UnilevelUserStats> {
  const unilevelUser = await prisma.unilevelUser.findUnique({
    where: { userId },
    include: {
      bonuses: true
    }
  })

  if (!unilevelUser) {
    throw new Error(`Usuário ${Number(userId)} não encontrado na rede unilevel`)
  }

  // Buscar nível atual de carreira
  const currentCareer = await getCurrentCareerLevel(userId)

  // Calcular totais de bônus
  const totalBonuses = unilevelUser.bonuses.reduce((sum, b) => sum.add(b.amount), new Decimal(0))
  const directBonuses = unilevelUser.bonuses
    .filter(b => b.type === 'DIRECT_BONUS')
    .reduce((sum, b) => sum.add(b.amount), new Decimal(0))
  const indirectBonuses = unilevelUser.bonuses
    .filter(b => b.type === 'INDIRECT_BONUS')
    .reduce((sum, b) => sum.add(b.amount), new Decimal(0))
  const reactivationBonuses = unilevelUser.bonuses
    .filter(b => b.type === 'REACTIVATION_BONUS')
    .reduce((sum, b) => sum.add(b.amount), new Decimal(0))
  const profitShares = unilevelUser.bonuses
    .filter(b => b.type === 'PROFIT_SHARE')
    .reduce((sum, b) => sum.add(b.amount), new Decimal(0))
  const careerBonuses = unilevelUser.bonuses
    .filter(b => b.type === 'CAREER_BONUS')
    .reduce((sum, b) => sum.add(b.amount), new Decimal(0))
  const travelBonuses = unilevelUser.bonuses
    .filter(b => b.type === 'TRAVEL_BONUS')
    .reduce((sum, b) => sum.add(b.amount), new Decimal(0))

  // Contar indicações diretas
  const totalReferrals = await prisma.unilevelUser.count({
    where: { sponsorId: userId }
  })

  return {
    totalReferrals,
    totalPoints: unilevelUser.totalPoints,
    teamVolume: unilevelUser.teamVolume,
    careerLevel: currentCareer?.careerName,
    totalBonuses,
    directBonuses,
    indirectBonuses,
    reactivationBonuses,
    profitShares,
    careerBonuses,
    travelBonuses
  }
}

/**
 * Busca o histórico completo de pacotes da rede de um usuário
 * Inclui todos os pacotes dos diretos e toda a downline
 */
/**
 * Cache para IDs da rede de usuários
 * Expira após 5 minutos
 */
interface NetworkCacheEntry {
  userIds: bigint[]
  timestamp: number
}

const networkCache = new Map<string, NetworkCacheEntry>()
const NETWORK_CACHE_TTL = 300000 // 5 minutos

/**
 * Busca todos os IDs da rede usando CTE recursiva (MUITO mais eficiente)
 */
async function getAllNetworkUserIds(userId: bigint, includeSelf: boolean = true): Promise<bigint[]> {
  const cacheKey = `${userId}_${includeSelf}`
  const now = Date.now()

  // Verificar cache
  const cached = networkCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < NETWORK_CACHE_TTL) {
    console.log(`   📦 Usando cache de IDs da rede (${cached.userIds.length} usuários)`)
    return cached.userIds
  }

  console.log(`   🔄 Buscando rede com CTE recursiva para usuário ${Number(userId)}`)

  try {
    // Usar CTE recursiva para buscar toda a árvore em UMA ÚNICA QUERY
    const result = await prisma.$queryRaw<Array<{ id: bigint }>>`
      WITH RECURSIVE network_tree AS (
        -- Caso base: usuários diretos
        SELECT id, "sponsorId", 1 as level
        FROM users
        WHERE "sponsorId" = ${userId}
        
        UNION ALL
        
        -- Recursão: buscar próximo nível
        SELECT u.id, u."sponsorId", nt.level + 1
        FROM users u
        INNER JOIN network_tree nt ON u."sponsorId" = nt.id
        WHERE nt.level < 100 -- Limite de segurança para evitar loops infinitos
      )
      SELECT DISTINCT id FROM network_tree
      ORDER BY id
    `

    let userIds = result.map(row => row.id)

    // Adicionar o próprio usuário se solicitado
    if (includeSelf) {
      userIds = [userId, ...userIds]
    }

    console.log(`   ✅ Rede carregada: ${userIds.length} usuários`)

    // Atualizar cache
    networkCache.set(cacheKey, {
      userIds,
      timestamp: now
    })

    return userIds

  } catch (error) {
    console.error('❌ Erro ao buscar rede com CTE:', error)
    throw error
  }
}

/**
 * Limpa o cache de rede (chamar quando houver novos cadastros)
 */
export function clearNetworkCache(): void {
  networkCache.clear()
  console.log('🗑️  Cache de rede limpo')
}

export async function getNetworkPackageHistory(
  userId: bigint,
  includeSelf: boolean = true,
  page: number = 1,
  limit: number = 50
): Promise<{
  packages: Array<{
    id: number
    userId: number
    userName: string
    userEmail: string
    userReferralCode: string
    packageId: number
    packageName: string
    packagePrice: number
    packagePoints: number
    isActive: boolean
    activatedAt: string | null
    expiresAt: string | null
    createdAt: string
  }>
  statistics: {
    totalUsers: number
    totalPackages: number
    activePackages: number
    totalValue: number
    totalPoints: number
  }
  pagination: {
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}> {
  console.log(`🔍 Buscando histórico de pacotes da rede para usuário ${Number(userId)}`)
  console.log(`   📄 Página ${page} (limite: ${limit})`)

  try {
    const startTime = Date.now()

    // Buscar todos os IDs da rede usando CTE recursiva (otimizado)
    const networkUserIds = await getAllNetworkUserIds(userId, includeSelf)
    console.log(`   ⏱️  Tempo para buscar IDs: ${Date.now() - startTime}ms`)

    // Contar total de pacotes ANTES de aplicar paginação (para estatísticas)
    const totalPackagesCount = await prisma.userPackage.count({
      where: {
        userId: { in: networkUserIds },
        isActive: true
      }
    })

    // Calcular estatísticas agregadas usando Prisma ORM (mais seguro e com tipagem correta)
    // Excluir pacotes marcados para não calcular pontos (excludeFromPointsCalculation !== true)
    const allPackagesForStats = await prisma.userPackage.findMany({
      where: {
        userId: { in: networkUserIds },
        isActive: true,
        OR: [
          { excludeFromPointsCalculation: null },
          { excludeFromPointsCalculation: false }
        ]
      },
      select: {
        isActive: true,
        excludeFromPointsCalculation: true,
        package: {
          select: {
            price: true,
            points: true
          }
        }
      }
    })

    const stats = {
      total_packages: BigInt(allPackagesForStats.length),
      active_packages: BigInt(allPackagesForStats.filter(p => p.isActive).length),
      total_value: allPackagesForStats.reduce((sum, p) => sum + Number(p.package.price), 0),
      total_points: BigInt(allPackagesForStats.reduce((sum, p) => sum + p.package.points, 0))
    }

    // Aplicar paginação
    const skip = (page - 1) * limit
    const totalPages = Math.ceil(totalPackagesCount / limit)

    // Buscar apenas os pacotes da página atual
    const networkPackages = await prisma.userPackage.findMany({
      where: {
        userId: { in: networkUserIds },
        isActive: true,
        OR: [
          { excludeFromPointsCalculation: null },
          { excludeFromPointsCalculation: false }
        ]
      },
      ...(skip > 0 ? { skip } : {}),
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            price: true,
            points: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            referralCode: true
          }
        }
      }
    })

    console.log(`   ⏱️  Tempo total: ${Date.now() - startTime}ms`)
    console.log(`   📦 Pacotes encontrados na página: ${networkPackages.length}`)

    const formattedHistory = networkPackages.map(record => ({
      id: Number(record.id),
      userId: Number(record.userId),
      userName: record.user.name,
      userEmail: record.user.email,
      userReferralCode: record.user.referralCode,
      packageId: Number(record.packageId),
      packageName: record.package.name,
      packagePrice: Number(record.package.price),
      packagePoints: record.package.points,
      isActive: record.isActive,
      activatedAt: record.activatedAt?.toISOString() || null,
      expiresAt: record.expiresAt?.toISOString() || null,
      createdAt: record.createdAt.toISOString()
    }))

    console.log(`   ✅ Histórico da rede processado com sucesso:`)
    console.log(`      - Total de usuários: ${networkUserIds.length}`)
    console.log(`      - Total de pacotes: ${Number(stats.total_packages)}`)
    console.log(`      - Pacotes ativos: ${Number(stats.active_packages)}`)
    console.log(`      - Valor total: R$ ${Number(stats.total_value)}`)
    console.log(`      - Pontos totais: ${Number(stats.total_points)}`)
    console.log(`      - Páginas: ${totalPages}`)

    return {
      packages: formattedHistory,
      statistics: {
        totalUsers: networkUserIds.length,
        totalPackages: Number(stats.total_packages),
        activePackages: Number(stats.active_packages),
        totalValue: Number(stats.total_value),
        totalPoints: Number(stats.total_points)
      },
      pagination: {
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }

  } catch (error) {
    console.error(`❌ Erro ao buscar histórico da rede para usuário ${Number(userId)}:`, error)
    throw error
  }
}

/**
 * Processa divisão de lucros para o sistema unilevel baseado em vendas
 * @param totalProfit - Lucro total da empresa
 * @param executionDate - Data de execução da divisão (para verificar expiração de pacotes)
 * @returns Resumo da distribuição incluindo valor efetivamente distribuído
 */
export async function processUnilevelProfitDistribution(
  totalProfit: Decimal,
  executionDate: Date = new Date(),
  minerId?: bigint
): Promise<{
  totalAvailable: Decimal;
  totalDistributed: Decimal;
  totalPackages: number;
  distributedToUsers: number;
  distributions: Array<{
    userId: bigint;
    userName: string;
    packageName: string;
    amount: Decimal;
    profitPercent: Decimal;
    packagesCount: number;
  }>;
}> {
  console.log(`💰 INICIANDO divisão de lucros unilevel`)
  console.log(`   Lucro total: R$ ${totalProfit}`)
  console.log(`   Data de execução: ${executionDate.toLocaleDateString('pt-BR')}`)
  if (minerId) {
    console.log(`   Mineradora alvo: ${Number(minerId)}`)
  }

  try {
    // 1. Buscar todos os pacotes unilevel ativos
    const packages = await prisma.package.findMany({
      where: {
        isActive: true,
        isUnilevel: true,
        OR: [
          { profitSharePercent: { gt: 0 } },
          { percentExtra: { gt: 0 } }
        ]
      },
      orderBy: {
        name: 'asc'
      }
    })

    console.log(`📦 Pacotes unilevel encontrados: ${packages.length}`)

    if (packages.length === 0) {
      console.log(`⚠️  Nenhum pacote unilevel ativo encontrado`)
      return {
        totalAvailable: totalProfit,
        totalDistributed: new Decimal(0),
        totalPackages: 0,
        distributedToUsers: 0,
        distributions: []
      }
    }

    const distributions: Array<{
      userId: bigint;
      userName: string;
      packageName: string;
      amount: Decimal;
      profitPercent: Decimal;
      packagesCount: number;
    }> = []

    let totalDistributed = new Decimal(0)
    let totalPackagesProcessed = 0

    // 2. Iterar sobre cada pacote
    for (const packageData of packages) {
      // Calcular percentual total (profitSharePercent + percentExtra)
      const totalProfitPercent = packageData.profitSharePercent.add(packageData.percentExtra || new Decimal(0))

      // Se o percentual total for zero, pular este pacote
      if (totalProfitPercent.isZero()) {
        console.log(`\n⏭️  Pulando pacote ${packageData.name} (percentual total = 0%)`)
        continue
      }

      console.log(`\n📊 Processando pacote: ${packageData.name}`)
      console.log(`   Percentual base de lucro: ${packageData.profitSharePercent}%`)
      console.log(`   Percentual extra: ${packageData.percentExtra || new Decimal(0)}%`)
      console.log(`   Percentual total de lucro: ${totalProfitPercent}%`)

      // 3. Calcular valor para divisão usando o percentual total
      const valorParaDivisao = totalProfit.mul(totalProfitPercent).div(100)
      console.log(`   Valor para divisão: R$ ${valorParaDivisao}`)

      // 4. Buscar todos os userPackages ativos e não expirados antes da data de execução
      // IMPORTANTE: Excluir pacotes de usuários banidos (isActive=false)
      const userPackages = await prisma.userPackage.findMany({
        where: {
          packageId: packageData.id,
          isActive: true,
          isUnilevel: true,
          ...(minerId ? { minerId } : {}),
          ...(minerId
            ? {
                package: {
                  packageMiners: {
                    some: { minerId }
                  }
                }
              }
            : {}),
          user: {
            isActive: true // Excluir pacotes de usuários banidos
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: executionDate } }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      console.log(`   UserPackages encontrados: ${userPackages.length}`)

      if (userPackages.length === 0) {
        console.log(`   ⚠️  Nenhum usuário ativo encontrado para este pacote`)
        continue
      }

      // 5. Dividir o valor pela quantidade de userPackages
      const valorDividido = valorParaDivisao.div(userPackages.length)
      console.log(`   Valor dividido por usuário: R$ ${valorDividido}`)

      // 6. Agrupar userPackages por userId
      const userPackagesMap = new Map<bigint, typeof userPackages>()
      for (const userPackage of userPackages) {
        const userId = userPackage.userId
        if (!userPackagesMap.has(userId)) {
          userPackagesMap.set(userId, [])
        }
        userPackagesMap.get(userId)!.push(userPackage)
      }

      console.log(`   Usuários únicos: ${userPackagesMap.size}`)

      // 7. Para cada usuário, calcular valor final baseado na quantidade de pacotes
      for (const [userId, userPackageList] of userPackagesMap) {
        const quantidadePacotesDoUsuario = userPackageList.length
        const valorFinal = valorDividido.mul(quantidadePacotesDoUsuario)

        const userName = userPackageList[0].user.name

        console.log(`   👤 Usuário ${userName} (ID: ${Number(userId)}):`)
        console.log(`      Pacotes ativos: ${quantidadePacotesDoUsuario}`)
        console.log(`      Valor final: R$ ${valorFinal}`)

        // Verificar se já foi processado hoje (apenas uma divisão por dia)
        const today = new Date()
        const startOfDay = new Date(today.setHours(0, 0, 0, 0))
        const endOfDay = new Date(today.setHours(23, 59, 59, 999))

        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            userId: userId,
            type: 'PROFIT_SHARE',
            description: {
              contains: minerId
                ? `Divisão de lucros unilevel - ${packageData.name} - Mineradora ${Number(minerId)}`
                : 'Divisão de lucros unilevel'
            },
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        })

        if (existingTransaction) {
          console.log(`      ⏭️  Lucro já processado hoje para ${userName}`)
          continue
        }

        // 8. Criar transação PROFIT_SHARE e rastrear distribuição por mineradora
        const todayTransaction = new Date()
        const minerDescriptionSuffix = minerId ? ` - Mineradora ${Number(minerId)}` : ''
        await creditUnilevelBonus(
          userId,
          valorFinal,
          'PROFIT_SHARE',
          `Divisão de lucros unilevel - ${packageData.name}${minerDescriptionSuffix} - ${todayTransaction.toLocaleDateString('pt-BR')}`
        )

        // Persistir registro de distribuição para rastreabilidade administrativa
        const periodStart = new Date(executionDate)
        periodStart.setHours(0, 0, 0, 0)
        const periodEnd = new Date(executionDate)
        periodEnd.setHours(23, 59, 59, 999)

        await prisma.profitDistribution.create({
          data: {
            userId,
            packageId: packageData.id,
            minerId: minerId ?? null,
            amount: valorFinal,
            profitPercent: totalProfitPercent,
            totalProfit,
            periodStart,
            periodEnd,
            status: 'PROCESSED',
            processedAt: todayTransaction
          }
        })

        // 9. Adicionar à lista de distribuições
        distributions.push({
          userId,
          userName,
          packageName: packageData.name,
          amount: valorFinal,
          profitPercent: totalProfitPercent,
          packagesCount: quantidadePacotesDoUsuario
        })

        totalDistributed = totalDistributed.add(valorFinal)
        totalPackagesProcessed += quantidadePacotesDoUsuario

        console.log(`      ✅ Transação PROFIT_SHARE criada: R$ ${valorFinal}`)
      }

      console.log(`   ✅ Pacote ${packageData.name} processado com sucesso`)
    }

    // 10. Processar distribuição de lucros para o Clube dos 300
    if (!minerId) {
      console.log(`\n🏆 PROCESSANDO divisão de lucros para o Clube dos 300`)

      const clube300Result = await processClube300ProfitDistribution(totalProfit, undefined, executionDate)

      if (clube300Result.success) {
        console.log(`✅ Clube dos 300 processado com sucesso:`)
        console.log(`   - Membros ativos: ${clube300Result.membersCount}`)
        console.log(`   - Total de cotas: ${clube300Result.totalCotas}`)
        console.log(`   - Valor total distribuído: R$ ${clube300Result.totalDistributed}`)
        console.log(`   - Valor por cota: R$ ${clube300Result.valuePerCota}`)

        // Adicionar ao total distribuído
        totalDistributed = totalDistributed.add(clube300Result.totalDistributed)
      } else {
        console.log(`⚠️  Erro no processamento do Clube dos 300: ${clube300Result.error}`)
      }
    } else {
      console.log(`\n🏆 Clube dos 300 ignorado em distribuição segregada por mineradora`)
    }

    console.log(`\n🎉 Divisão de lucros unilevel concluída:`)
    console.log(`   - Lucro total disponível: R$ ${totalProfit}`)
    console.log(`   - Total de pacotes processados: ${totalPackagesProcessed}`)
    console.log(`   - Usuários que receberam lucros: ${distributions.length}`)
    console.log(`   - Total efetivamente distribuído: R$ ${totalDistributed}`)

    return {
      totalAvailable: totalProfit,
      totalDistributed,
      totalPackages: totalPackagesProcessed,
      distributedToUsers: distributions.length,
      distributions
    }

  } catch (error) {
    console.error(`❌ ERRO durante divisão de lucros unilevel:`, error)
    if (error instanceof Error) {
      console.error(`Stack trace:`, error.stack)
    }
    throw error
  }
}

// ====================================
// FUNÇÕES DE PRÊMIOS DE CARREIRA
// ====================================

/**
 * Processa prêmios de carreira quando usuário atinge novo nível
 */
export async function processCareerPrizes(userId: bigint, careerLevelId: bigint): Promise<void> {
  try {
    console.log(`🎁 Processando prêmios de carreira para usuário ${Number(userId)}, nível ${Number(careerLevelId)}`)

    // Buscar dados do nível de carreira
    const careerLevel = await prisma.careerLevel.findUnique({
      where: { id: careerLevelId },
      select: {
        id: true,
        name: true,
        careerBonusAmount: true,
        careerPrizeDescription: true,
        careerPrizeValue: true
      }
    })

    if (!careerLevel) {
      console.log(`⚠️ Nível de carreira ${Number(careerLevelId)} não encontrado`)
      return
    }

    console.log(`📋 Nível: ${careerLevel.name}`)
    console.log(`💰 Bônus em dinheiro: R$ ${careerLevel.careerBonusAmount || 0}`)
    console.log(`🎁 Prêmio físico: ${careerLevel.careerPrizeDescription || 'Nenhum'}`)

    // Verificar se já recebeu prêmio para este nível
    const existingBonus = await prisma.transaction.findFirst({
      where: {
        userId,
        type: 'CAREER_BONUS',
        description: { contains: careerLevel.name }
      }
    })

    const existingPrize = await prisma.transaction.findFirst({
      where: {
        userId,
        type: 'CAREER_PRIZE',
        description: { contains: careerLevel.name }
      }
    })

    // Processar bônus em dinheiro
    if (careerLevel.careerBonusAmount && careerLevel.careerBonusAmount.gt(0) && !existingBonus) {
      await prisma.transaction.create({
        data: {
          userId,
          type: 'CAREER_BONUS',
          amount: careerLevel.careerBonusAmount,
          description: `Bônus de carreira - ${careerLevel.name}`,
          status: 'COMPLETED'
        }
      })

      console.log(`✅ Bônus de R$ ${careerLevel.careerBonusAmount} creditado para ${careerLevel.name}`)
    } else if (existingBonus) {
      console.log(`⚠️ Bônus para ${careerLevel.name} já foi creditado anteriormente`)
    }

    // Processar prêmio físico (se houver)
    if (careerLevel.careerPrizeDescription && !existingPrize) {
      await prisma.transaction.create({
        data: {
          userId,
          type: 'CAREER_PRIZE',
          amount: careerLevel.careerPrizeValue || new Decimal(0),
          description: careerLevel.careerPrizeDescription,
          status: 'PENDING' // Aguarda entrega
        }
      })

      console.log(`🎁 Prêmio físico registrado: ${careerLevel.careerPrizeDescription}`)
    } else if (existingPrize) {
      console.log(`⚠️ Prêmio físico para ${careerLevel.name} já foi registrado anteriormente`)
    }

    console.log(`🎉 Prêmios de carreira processados com sucesso para ${careerLevel.name}`)

  } catch (error) {
    console.error(`❌ ERRO ao processar prêmios de carreira para usuário ${Number(userId)}:`, error)
    if (error instanceof Error) {
      console.error(`Stack trace:`, error.stack)
    }
    throw error
  }
} 
// ====================================
// GERAÇÃO MANUAL DE BÔNUS DE INDICAÇÃO (ADMIN)
// ====================================

interface GenerateMissingPurchaseBonusesParams {
  buyerId: bigint
  packageId: bigint
  correlationID: string
  /** Valor pago na compra — base do bônus indireto */
  purchaseAmount: Decimal
  /** Soma do bônus direto dos pacotes da compra (directBonusSnapshot) */
  directBonusBase: Decimal
  generateDirect: boolean
  generateIndirect: boolean
  /** Aplica o teto de bônus direto do patrocinador (computeDirectBonusAllowed) */
  applyDirectCap: boolean
}

export interface GenerateMissingPurchaseBonusesResult {
  direct: { attempted: boolean; generated: boolean; amount: number; reason?: string }
  indirect: { attempted: boolean; generated: boolean; count: number; amount: number; reason?: string }
}

const sumBonusTransactions = async (correlationID: string, type: 'DIRECT_BONUS' | 'INDIRECT_BONUS') => {
  const result = await prisma.transaction.aggregate({
    where: { correlationID, type, status: { not: 'CANCELLED' } },
    _sum: { amount: true },
    _count: { _all: true }
  })
  return { count: result._count._all, amount: Number(result._sum.amount ?? 0) }
}

/**
 * Gera os bônus de indicação direto e/ou indireto que não foram pagos numa compra,
 * reutilizando as mesmas regras da compra (creditUnilevelBonus evita duplicidade por correlationID).
 */
export async function generateMissingPurchaseBonuses(
  params: GenerateMissingPurchaseBonusesParams
): Promise<GenerateMissingPurchaseBonusesResult> {
  const result: GenerateMissingPurchaseBonusesResult = {
    direct: { attempted: false, generated: false, amount: 0 },
    indirect: { attempted: false, generated: false, count: 0, amount: 0 }
  }

  const user = await validateUser(params.buyerId)
  const sponsorId: bigint | null = user.sponsorId

  if (!sponsorId) {
    result.direct.reason = 'Usuário sem patrocinador'
    result.indirect.reason = 'Usuário sem patrocinador'
    return result
  }

  if (params.generateDirect) {
    result.direct.attempted = true
    const before = await sumBonusTransactions(params.correlationID, 'DIRECT_BONUS')

    const allowedDirectBonus = params.applyDirectCap
      ? await computeDirectBonusAllowed(params.buyerId, sponsorId, params.directBonusBase)
      : params.directBonusBase

    if (allowedDirectBonus.gt(0)) {
      await distributeDirectBonus(sponsorId, allowedDirectBonus, params.buyerId, params.correlationID, params.packageId)
    } else {
      result.direct.reason = 'Teto de bônus direto do patrocinador já atingido'
    }

    const after = await sumBonusTransactions(params.correlationID, 'DIRECT_BONUS')
    result.direct.generated = after.count > before.count
    result.direct.amount = after.amount - before.amount
    if (!result.direct.generated && !result.direct.reason) {
      result.direct.reason = 'Bônus direto desabilitado, patrocinador inativo ou já existente'
    }
  }

  if (params.generateIndirect) {
    result.indirect.attempted = true
    const before = await sumBonusTransactions(params.correlationID, 'INDIRECT_BONUS')

    const packageData = await validateUnilevelPackage(params.packageId)
    await distributeIndirectBonuses(params.buyerId, params.purchaseAmount, packageData, params.correlationID)

    const after = await sumBonusTransactions(params.correlationID, 'INDIRECT_BONUS')
    result.indirect.count = after.count - before.count
    result.indirect.amount = after.amount - before.amount
    result.indirect.generated = result.indirect.count > 0
    if (!result.indirect.generated) {
      result.indirect.reason = 'Nenhum patrocinador indireto elegível'
    }
  }

  return result
}
