import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'

type UserPackageWithRelations = {
  id: bigint
  packageId: bigint
  directBonusSnapshot: Decimal
  excludeFromPointsCalculation: boolean | null
  transactionId: bigint | null
  transaction: { id: bigint; description: string } | null
  package: { id: bigint; name: string; price: Decimal; directBonus: Decimal }
}

const parseSponsorIdFromAuditValue = (value: string | null): number | null => {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as { sponsorId?: string | number | null }
    if (parsed.sponsorId == null) return null
    return Number(parsed.sponsorId)
  } catch {
    return null
  }
}

/** Extrai o nome do pacote comprado a partir da descrição da transação de pagamento. */
const parsePurchasedPackageNameFromDescription = (
  description: string | null | undefined
): string | null => {
  if (!description) return null

  const bonusPaymentMatch = description.match(/Pagamento de \d+x (.+?) usando/i)
  if (bonusPaymentMatch) return bonusPaymentMatch[1].trim()

  const pixMatch = description.match(/Pacote (.+?) \(/i)
  if (pixMatch) return pixMatch[1].trim()

  return null
}

const normalizePackageName = (name: string): string =>
  name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

const packageNamesMatch = (a: string, b: string): boolean => {
  const na = normalizePackageName(a)
  const nb = normalizePackageName(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

const isAdminGeneratedTransaction = (description: string | null | undefined): boolean =>
  Boolean(description?.includes('Gerado pelo Admin'))

const isEligibleForDirectBonusSnapshot = (pkg: UserPackageWithRelations): boolean =>
  pkg.excludeFromPointsCalculation !== true &&
  !isAdminGeneratedTransaction(pkg.transaction?.description)

/**
 * Em transações com upgrade, o pacote de tier superior é consolidação (resultado),
 * não a compra original. Retorna snapshots apenas dos pacotes comprados.
 */
const getPurchasedPackageSnapshots = (
  packagesInTransaction: UserPackageWithRelations[]
): Decimal[] => {
  const eligible = packagesInTransaction.filter(isEligibleForDirectBonusSnapshot)
  if (eligible.length === 0) return []

  const uniquePackageIds = new Set(eligible.map(p => p.packageId.toString()))
  if (uniquePackageIds.size === 1) {
    return eligible.map(p => new Decimal(p.directBonusSnapshot.toString()))
  }

  const purchasedName = parsePurchasedPackageNameFromDescription(
    packagesInTransaction[0]?.transaction?.description
  )

  if (purchasedName) {
    const purchased = eligible.filter(p => packageNamesMatch(p.package.name, purchasedName))
    if (purchased.length > 0) {
      return purchased.map(p => new Decimal(p.directBonusSnapshot.toString()))
    }
  }

  const maxPrice = eligible.reduce(
    (max, p) => Decimal.max(max, new Decimal(p.package.price.toString())),
    new Decimal(0)
  )

  const purchasedLowerTier = eligible.filter(
    p => new Decimal(p.package.price.toString()).lt(maxPrice)
  )

  if (purchasedLowerTier.length > 0) {
    return purchasedLowerTier.map(p => new Decimal(p.directBonusSnapshot.toString()))
  }

  return eligible.map(p => new Decimal(p.directBonusSnapshot.toString()))
}

/**
 * Soma bônus esperado com base em compras reais (ignora pacotes gerados por upgrade/admin).
 */
const computeDirectBonusFromPurchases = async (
  downlineId: bigint,
  filter?: { since?: Date; after?: Date }
): Promise<Decimal> => {
  const createdAtFilter = filter?.after
    ? { createdAt: { gt: filter.after } }
    : filter?.since
      ? { createdAt: { gte: filter.since } }
      : {}

  const packages = await prisma.userPackage.findMany({
    where: {
      userId: downlineId,
      isUnilevel: true,
      ...createdAtFilter
    },
    select: {
      id: true,
      packageId: true,
      directBonusSnapshot: true,
      excludeFromPointsCalculation: true,
      transactionId: true,
      transaction: { select: { id: true, description: true } },
      package: { select: { id: true, name: true, price: true, directBonus: true } }
    }
  })

  const packagesByTransaction = new Map<string, UserPackageWithRelations[]>()

  for (const pkg of packages) {
    const txKey = pkg.transactionId?.toString() ?? `orphan-${pkg.id.toString()}`
    const group = packagesByTransaction.get(txKey) ?? []
    group.push(pkg)
    packagesByTransaction.set(txKey, group)
  }

  let total = new Decimal(0)

  for (const group of packagesByTransaction.values()) {
    const txDescription = group[0]?.transaction?.description
    if (isAdminGeneratedTransaction(txDescription)) continue

    const snapshots = getPurchasedPackageSnapshots(group)
    for (const snapshot of snapshots) {
      total = total.add(snapshot)
    }
  }

  return Decimal.max(new Decimal(0), total)
}

const computeExpectedDirectBonusFromPurchases = async (
  downlineId: bigint,
  since?: Date
): Promise<Decimal> => computeDirectBonusFromPurchases(downlineId, since ? { since } : undefined)

/**
 * Bônus direto de compras após o último pagamento ao patrocinador atual.
 * Usado na correção manual quando tarifas foram reduzidas e compras recentes não geraram bônus.
 */
const computeUnpaidDirectBonusSinceLastPayment = async (
  downlineId: bigint,
  currentSponsorId: bigint,
  sponsorPeriodStart: Date
): Promise<Decimal> => {
  const lastPayment = await prisma.transaction.findFirst({
    where: {
      userId: currentSponsorId,
      sourceUserId: downlineId,
      type: 'DIRECT_BONUS',
      status: 'COMPLETED'
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  })

  const afterDate = lastPayment?.createdAt ?? sponsorPeriodStart
  return computeDirectBonusFromPurchases(downlineId, { after: afterDate })
}

const eligibleActivePackagesWhere = (downlineId: bigint) => ({
  userId: downlineId,
  isActive: true as const,
  isUnilevel: true as const,
  AND: [
    {
      OR: [
        { excludeFromPointsCalculation: null },
        { excludeFromPointsCalculation: false }
      ]
    },
    {
      OR: [
        { transactionId: null },
        {
          transaction: {
            NOT: {
              description: { contains: 'Gerado pelo Admin' }
            }
          }
        }
      ]
    }
  ]
})

const inactiveAdjustmentPackagesWhere = (downlineId: bigint) => ({
  userId: downlineId,
  isActive: false,
  isUnilevel: true as const,
  excludeFromPointsCalculation: true
})

/**
 * Teto absoluto: Σ(snapshot ativos elegíveis) − Σ(snapshot inativos com exclude=true).
 * Pacotes "Gerado pelo Admin" são ignorados em ambos os lados (ativos e inativos).
 * Nunca pode ultrapassar o valor dos pacotes ativos do indicado.
 */
export const computeActivePackagesDirectBonusCeiling = async (
  downlineId: bigint
): Promise<Decimal> => {
  const [activeAgg, inactiveAdjustAgg] = await Promise.all([
    prisma.userPackage.aggregate({
      where: eligibleActivePackagesWhere(downlineId),
      _sum: { directBonusSnapshot: true }
    }),
    prisma.userPackage.aggregate({
      where: inactiveAdjustmentPackagesWhere(downlineId),
      _sum: { directBonusSnapshot: true }
    })
  ])

  const sumActive = activeAgg._sum.directBonusSnapshot
    ? new Decimal(activeAgg._sum.directBonusSnapshot.toString())
    : new Decimal(0)
  const sumInactiveAdjust = inactiveAdjustAgg._sum.directBonusSnapshot
    ? new Decimal(inactiveAdjustAgg._sum.directBonusSnapshot.toString())
    : new Decimal(0)

  return Decimal.max(new Decimal(0), sumActive.sub(sumInactiveAdjust))
}

/**
 * Data em que o patrocinador atual passou a ser o sponsor do indicado.
 * Usa SPONSOR_CHANGED (última troca para o patrocinador atual) ou createdAt do usuário.
 */
export const getCurrentSponsorAssignmentDate = async (
  downlineId: bigint,
  currentSponsorId: bigint
): Promise<Date | null> => {
  const changes = await prisma.adminActionAudit.findMany({
    where: {
      targetUserId: downlineId,
      actionType: 'SPONSOR_CHANGED'
    },
    orderBy: { createdAt: 'asc' },
    select: { newValue: true, createdAt: true }
  })

  let latestAssignment: Date | null = null
  for (const change of changes) {
    const newSponsorId = parseSponsorIdFromAuditValue(change.newValue)
    if (newSponsorId === Number(currentSponsorId)) {
      latestAssignment = change.createdAt
    }
  }

  if (latestAssignment) {
    return latestAssignment
  }

  const user = await prisma.user.findUnique({
    where: { id: downlineId },
    select: { sponsorId: true, createdAt: true }
  })

  if (user?.sponsorId === currentSponsorId) {
    return user.createdAt
  }

  return null
}

/** Teto global de bônus direto (pacotes ativos − ajustes). */
export const computeGlobalExpectedDirectBonus = async (downlineId: bigint): Promise<Decimal> => {
  return computeActivePackagesDirectBonusCeiling(downlineId)
}

/**
 * Bônus esperado no período do patrocinador atual:
 * min(compras reais no período, teto restante dos pacotes ativos).
 * O teto restante desconta o que patrocinadores anteriores já receberam na mesma conta.
 */
export const computeExpectedDirectBonusInSponsorPeriod = async (
  downlineId: bigint,
  periodStart: Date,
  currentSponsorId: bigint
): Promise<Decimal> => {
  const [purchasesInPeriod, activeCeiling, paidToOthers] = await Promise.all([
    computeExpectedDirectBonusFromPurchases(downlineId, periodStart),
    computeActivePackagesDirectBonusCeiling(downlineId),
    getDirectBonusPaidToOthers(currentSponsorId, downlineId)
  ])

  const remainingCeiling = Decimal.max(new Decimal(0), activeCeiling.sub(paidToOthers))

  return Decimal.min(purchasesInPeriod, remainingCeiling)
}

/** Soma bônus direto já pago a um destinatário específico por compras do indicado. */
export const getDirectBonusPaidToRecipient = async (
  recipientId: bigint,
  downlineId: bigint
): Promise<Decimal> => {
  const result = await prisma.transaction.aggregate({
    where: {
      userId: recipientId,
      sourceUserId: downlineId,
      type: 'DIRECT_BONUS',
      status: 'COMPLETED'
    },
    _sum: { amount: true }
  })

  return result._sum.amount ? new Decimal(result._sum.amount.toString()) : new Decimal(0)
}

/** Soma bônus direto já pago a outros patrocinadores por compras do indicado. */
export const getDirectBonusPaidToOthers = async (
  currentSponsorId: bigint,
  downlineId: bigint
): Promise<Decimal> => {
  const result = await prisma.transaction.aggregate({
    where: {
      sourceUserId: downlineId,
      type: 'DIRECT_BONUS',
      status: 'COMPLETED',
      NOT: { userId: currentSponsorId }
    },
    _sum: { amount: true }
  })

  return result._sum.amount ? new Decimal(result._sum.amount.toString()) : new Decimal(0)
}

/**
 * Bônus permitido e pendente para o relacionamento patrocinador-atual × indicado.
 * Considera apenas compras reais no período (exclui upgrade/admin).
 *
 * Teto restante = teto dos pacotes ativos − já pago a outros patrocinadores.
 * Quando paidToOthers = 0, equivale a min(compras no período, teto ativos).
 */
export type DirectBonusRelationshipOptions = {
  /** Bônus direto da compra em processamento (para liberar pagamento após redução de tarifas). */
  currentPurchaseBonus?: Decimal
}

export const computeAllowedDirectBonusForSponsorRelationship = async (
  downlineId: bigint,
  currentSponsorId: bigint,
  options?: DirectBonusRelationshipOptions
): Promise<{
  sponsorPeriodStart: Date | null
  activeCeiling: Decimal
  remainingCeiling: Decimal
  purchasesInPeriod: Decimal
  paidToOthers: Decimal
  expectedInPeriod: Decimal
  paidToCurrentSponsor: Decimal
  pending: Decimal
}> => {
  const sponsorPeriodStart = await getCurrentSponsorAssignmentDate(downlineId, currentSponsorId)

  if (!sponsorPeriodStart) {
    return {
      sponsorPeriodStart: null,
      activeCeiling: new Decimal(0),
      remainingCeiling: new Decimal(0),
      purchasesInPeriod: new Decimal(0),
      paidToOthers: new Decimal(0),
      expectedInPeriod: new Decimal(0),
      paidToCurrentSponsor: new Decimal(0),
      pending: new Decimal(0)
    }
  }

  const [purchasesInPeriod, activeCeiling, paidToCurrentSponsor, paidToOthers] = await Promise.all([
    computeExpectedDirectBonusFromPurchases(downlineId, sponsorPeriodStart),
    computeActivePackagesDirectBonusCeiling(downlineId),
    getDirectBonusPaidToRecipient(currentSponsorId, downlineId),
    getDirectBonusPaidToOthers(currentSponsorId, downlineId)
  ])

  const remainingCeiling = Decimal.max(new Decimal(0), activeCeiling.sub(paidToOthers))
  const expectedInPeriod = Decimal.min(purchasesInPeriod, remainingCeiling)

  const pendingBase = Decimal.max(
    new Decimal(0),
    expectedInPeriod.sub(paidToCurrentSponsor)
  )

  const currentPurchaseBonus = options?.currentPurchaseBonus
  const isOverpaidDueToRateChange =
    remainingCeiling.gt(0) && paidToCurrentSponsor.gt(remainingCeiling)

  let pending = pendingBase

  // Após redução de tarifas, o patrocinador pode ter recebido valores acima do teto atual.
  // Novas compras ainda geram bônus direto (compra em processamento ou correção manual).
  if (isOverpaidDueToRateChange && pending.isZero()) {
    if (currentPurchaseBonus?.gt(0)) {
      pending = currentPurchaseBonus
    } else if (sponsorPeriodStart) {
      const unpaidSinceLastPayment = await computeUnpaidDirectBonusSinceLastPayment(
        downlineId,
        currentSponsorId,
        sponsorPeriodStart
      )
      if (unpaidSinceLastPayment.gt(0)) {
        pending = unpaidSinceLastPayment
      }
    }
  }

  return {
    sponsorPeriodStart,
    activeCeiling,
    remainingCeiling,
    purchasesInPeriod,
    paidToOthers,
    expectedInPeriod,
    paidToCurrentSponsor,
    pending
  }
}

/**
 * Pendência de bônus direto apenas para o patrocinador atual (período + compras reais).
 */
export const computePendingDirectBonusForCurrentSponsor = async (
  currentSponsorId: bigint,
  downlineId: bigint,
  options?: DirectBonusRelationshipOptions
): Promise<{
  sponsorPeriodStart: Date | null
  activeCeiling: Decimal
  remainingCeiling: Decimal
  purchasesInPeriod: Decimal
  paidToOthers: Decimal
  expectedForCurrentSponsor: Decimal
  paidToCurrentSponsor: Decimal
  pending: Decimal
}> => {
  const relationship = await computeAllowedDirectBonusForSponsorRelationship(
    downlineId,
    currentSponsorId,
    options
  )

  return {
    sponsorPeriodStart: relationship.sponsorPeriodStart,
    activeCeiling: relationship.activeCeiling,
    remainingCeiling: relationship.remainingCeiling,
    purchasesInPeriod: relationship.purchasesInPeriod,
    paidToOthers: relationship.paidToOthers,
    expectedForCurrentSponsor: relationship.expectedInPeriod,
    paidToCurrentSponsor: relationship.paidToCurrentSponsor,
    pending: relationship.pending
  }
}
