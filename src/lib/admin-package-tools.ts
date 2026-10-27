import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from './prisma'
import { addUserToClube300, removeUserFromClube300 } from './clube300-service'
import { logAdminAction } from './admin-audit'

export const ADMIN_GENERATED_PHRASE = 'Gerado pelo Admin'

/** Tecton → Pluton é sempre por contagem: 5 Tecton viram 1 Pluton */
const PLUTON_SLUG = 'pluton'
const TECTON_SLUG = 'tecton'
const TECTON_PER_PLUTON = 5

const DAY_MS = 24 * 60 * 60 * 1000
const UPGRADE_VALIDITY_DAYS = 365

export type PackageOrigin = 'admin' | 'normal'
export type UpgradeRule = 'count' | 'value'

export interface PackageGeneratedBonuses {
  identifiable: boolean
  directGenerated: boolean
  directAmount: number
  indirectGenerated: boolean
  indirectAmount: number
  indirectCount: number
  purchasePackageCount: number
}

export interface PackageUpgradeInfo {
  available: boolean
  sourcePackageId: number | null
  sourcePackageName: string | null
  targetPackageId: number | null
  targetPackageName: string | null
  packagesInGroup: number | null
  upgradeCount: number | null
  rule: UpgradeRule | null
  origin: PackageOrigin | null
}

const EMPTY_UPGRADE: PackageUpgradeInfo = {
  available: false,
  sourcePackageId: null,
  sourcePackageName: null,
  targetPackageId: null,
  targetPackageName: null,
  packagesInGroup: null,
  upgradeCount: null,
  rule: null,
  origin: null
}

export class AdminPackageError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
  }
}

export const isAdminGeneratedDescription = (description?: string | null): boolean =>
  Boolean(description?.includes(ADMIN_GENERATED_PHRASE))

/** Correlações dos bônus de uma compra (compras com upgrade usam "-remaining" para os pacotes restantes) */
export const getPurchaseCorrelationIds = (correlationID: string): string[] => [
  correlationID,
  `${correlationID}-remaining`
]

interface UnilevelPackageRow {
  id: bigint
  name: string
  slug: string | null
  price: Decimal
  directBonus: Decimal
}

const getUnilevelHierarchy = async (): Promise<UnilevelPackageRow[]> =>
  prisma.package.findMany({
    where: { isUnilevel: true, isActive: true },
    select: { id: true, name: true, slug: true, price: true, directBonus: true },
    orderBy: { price: 'asc' }
  })

const getNextPackage = (hierarchy: UnilevelPackageRow[], packageId: bigint) => {
  const index = hierarchy.findIndex((pkg) => pkg.id === packageId)
  return index >= 0 ? hierarchy[index + 1] ?? null : null
}

const isTectonToPluton = (source: UnilevelPackageRow, target: UnilevelPackageRow) =>
  source.slug === TECTON_SLUG && target.slug === PLUTON_SLUG

/**
 * Quantos pacotes de origem são consumidos e quantos pacotes de destino são criados.
 * - count: 5 Tecton → 1 Pluton
 * - value: soma dos preços (10 Átomo = 1 Núcleo, 5 Núcleo = 1 Tecton)
 */
const calculateGroupUpgrade = (source: UnilevelPackageRow, target: UnilevelPackageRow, quantity: number) => {
  if (isTectonToPluton(source, target)) {
    const upgradeCount = Math.floor(quantity / TECTON_PER_PLUTON)
    return { rule: 'count' as UpgradeRule, upgradeCount, consumed: upgradeCount * TECTON_PER_PLUTON }
  }

  const sourcePrice = Number(source.price)
  const targetPrice = Number(target.price)
  if (sourcePrice <= 0 || targetPrice <= 0) {
    return { rule: 'value' as UpgradeRule, upgradeCount: 0, consumed: 0 }
  }

  const upgradeCount = Math.floor((quantity * sourcePrice) / targetPrice)
  const consumed = Math.min(quantity, Math.ceil((upgradeCount * targetPrice) / sourcePrice - 1e-9))
  return { rule: 'value' as UpgradeRule, upgradeCount, consumed }
}

interface GroupablePackage {
  id: bigint
  packageId: bigint
  minerId: bigint | null
  isActive: boolean
  isUnilevel: boolean
  expiresAt: Date | null
  transaction: { description: string } | null
}

const getOrigin = (pkg: GroupablePackage): PackageOrigin =>
  isAdminGeneratedDescription(pkg.transaction?.description) ? 'admin' : 'normal'

/** Pacotes gerados pelo admin e pacotes normais são grupos separados (também por mineradora) */
const getGroupKey = (pkg: GroupablePackage) =>
  `${pkg.packageId}:${pkg.minerId ?? 'null'}:${getOrigin(pkg)}`

const isUpgradeable = (pkg: GroupablePackage, now: Date) =>
  pkg.isActive && pkg.isUnilevel && (!pkg.expiresAt || pkg.expiresAt > now)

/**
 * Dados extras dos pacotes de um usuário para o painel admin:
 * bônus de indicação gerados pela compra e upgrade disponível do grupo.
 */
export async function getAdminPackageInsights(userId: bigint) {
  const [userPackages, hierarchy] = await Promise.all([
    prisma.userPackage.findMany({
      where: { userId },
      select: {
        id: true,
        packageId: true,
        minerId: true,
        isActive: true,
        isUnilevel: true,
        expiresAt: true,
        transactionId: true,
        transaction: { select: { description: true, correlationID: true } }
      }
    }),
    getUnilevelHierarchy()
  ])

  // Bônus gerados por compra (correlationID da transação de compra)
  const correlationIds = [
    ...new Set(
      userPackages
        .map((pkg) => pkg.transaction?.correlationID)
        .filter((id): id is string => Boolean(id))
        .flatMap(getPurchaseCorrelationIds)
    )
  ]

  const bonusRows = correlationIds.length
    ? await prisma.transaction.groupBy({
        by: ['correlationID', 'type'],
        where: {
          correlationID: { in: correlationIds },
          type: { in: ['DIRECT_BONUS', 'INDIRECT_BONUS'] },
          status: { not: 'CANCELLED' }
        },
        _sum: { amount: true },
        _count: { _all: true }
      })
    : []

  const transactionPackageCounts = new Map<string, number>()
  for (const pkg of userPackages) {
    if (pkg.transactionId == null) continue
    const key = pkg.transactionId.toString()
    transactionPackageCounts.set(key, (transactionPackageCounts.get(key) ?? 0) + 1)
  }

  const getGeneratedBonuses = (pkg: (typeof userPackages)[number]): PackageGeneratedBonuses => {
    const correlationID = pkg.transaction?.correlationID
    const purchasePackageCount = pkg.transactionId ? transactionPackageCounts.get(pkg.transactionId.toString()) ?? 1 : 1

    if (!correlationID) {
      return {
        identifiable: false,
        directGenerated: false,
        directAmount: 0,
        indirectGenerated: false,
        indirectAmount: 0,
        indirectCount: 0,
        purchasePackageCount
      }
    }

    const ids = getPurchaseCorrelationIds(correlationID)
    const rows = bonusRows.filter((row) => row.correlationID && ids.includes(row.correlationID))
    const direct = rows.filter((row) => row.type === 'DIRECT_BONUS')
    const indirect = rows.filter((row) => row.type === 'INDIRECT_BONUS')
    const sum = (list: typeof rows) => list.reduce((acc, row) => acc + Number(row._sum.amount ?? 0), 0)
    const count = (list: typeof rows) => list.reduce((acc, row) => acc + row._count._all, 0)

    return {
      identifiable: true,
      directGenerated: count(direct) > 0,
      directAmount: sum(direct),
      indirectGenerated: count(indirect) > 0,
      indirectAmount: sum(indirect),
      indirectCount: count(indirect),
      purchasePackageCount
    }
  }

  // Upgrade disponível por grupo (pacote + mineradora + origem)
  const now = new Date()
  const groupSizes = new Map<string, number>()
  for (const pkg of userPackages) {
    if (!isUpgradeable(pkg, now)) continue
    const key = getGroupKey(pkg)
    groupSizes.set(key, (groupSizes.get(key) ?? 0) + 1)
  }

  const getUpgrade = (pkg: (typeof userPackages)[number]): PackageUpgradeInfo => {
    if (!isUpgradeable(pkg, now)) return EMPTY_UPGRADE

    const source = hierarchy.find((item) => item.id === pkg.packageId)
    const target = getNextPackage(hierarchy, pkg.packageId)
    if (!source || !target) return EMPTY_UPGRADE

    const quantity = groupSizes.get(getGroupKey(pkg)) ?? 0
    const { rule, upgradeCount, consumed } = calculateGroupUpgrade(source, target, quantity)
    if (upgradeCount < 1) return EMPTY_UPGRADE

    return {
      available: true,
      sourcePackageId: Number(source.id),
      sourcePackageName: source.name,
      targetPackageId: Number(target.id),
      targetPackageName: target.name,
      packagesInGroup: consumed,
      upgradeCount,
      rule,
      origin: getOrigin(pkg)
    }
  }

  const insights = new Map<string, { generatedBonuses: PackageGeneratedBonuses; upgrade: PackageUpgradeInfo }>()
  for (const pkg of userPackages) {
    insights.set(pkg.id.toString(), {
      generatedBonuses: getGeneratedBonuses(pkg),
      upgrade: getUpgrade(pkg)
    })
  }

  return insights
}

interface UpgradeGroupParams {
  userId: bigint
  packageId: bigint
  minerId: bigint | null
  origin: PackageOrigin
  performedBy: bigint
}

/**
 * Executa o upgrade de um grupo de pacotes do usuário.
 * Os pacotes mais antigos do grupo são desativados e cada pacote novo recebe sua própria
 * transação PIX_PAYMENT "Upgrade automático". Upgrade não gera bônus nem pontos
 * (nada foi comprado, só atualizado).
 */
async function upgradePackageGroup(params: UpgradeGroupParams) {
  const hierarchy = await getUnilevelHierarchy()
  const source = hierarchy.find((pkg) => pkg.id === params.packageId)
  const target = getNextPackage(hierarchy, params.packageId)

  if (!source || !target) {
    throw new AdminPackageError('Não existe pacote superior para upgrade')
  }

  const now = new Date()
  const candidates = await prisma.userPackage.findMany({
    where: {
      userId: params.userId,
      packageId: params.packageId,
      minerId: params.minerId,
      isActive: true,
      isUnilevel: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    select: {
      id: true,
      packageId: true,
      minerId: true,
      isActive: true,
      isUnilevel: true,
      expiresAt: true,
      transaction: { select: { description: true } }
    },
    orderBy: { id: 'asc' }
  })

  const group = candidates.filter((pkg) => getOrigin(pkg) === params.origin)
  const { upgradeCount, consumed } = calculateGroupUpgrade(source, target, group.length)

  if (upgradeCount < 1) {
    throw new AdminPackageError(
      isTectonToPluton(source, target)
        ? `São necessários no mínimo ${TECTON_PER_PLUTON} ${source.name} no mesmo grupo para o upgrade`
        : `Quantidade de ${source.name} insuficiente para upgrade para ${target.name}`
    )
  }

  const consumedIds = group.slice(0, consumed).map((pkg) => pkg.id)
  const isAdmin = params.origin === 'admin'
  const description = `Upgrade automático - Pacote ${target.name}${isAdmin ? ` (${ADMIN_GENERATED_PHRASE})` : ''}`
  const correlationPrefix = isAdmin ? 'ADMIN_GENERATED_UPGRADE' : 'UPGRADE'
  const timestamp = Date.now()

  const createdPackageIds = await prisma.$transaction(async (tx) => {
    const disabled = await tx.userPackage.updateMany({
      where: { id: { in: consumedIds }, isActive: true },
      data: { isActive: false, updatedAt: new Date() }
    })

    if (disabled.count !== consumedIds.length) {
      throw new AdminPackageError('Os pacotes do grupo mudaram durante o upgrade. Recarregue e tente novamente.', 409)
    }

    const ids: bigint[] = []
    for (let i = 0; i < upgradeCount; i++) {
      const transaction = await tx.transaction.create({
        data: {
          userId: params.userId,
          type: 'PIX_PAYMENT',
          amount: target.price,
          description,
          status: 'COMPLETED',
          correlationID: `${correlationPrefix}_${timestamp}_${i}`,
          paidAt: new Date(),
          quantity: 1
        }
      })

      const activatedAt = new Date()
      const userPackage = await tx.userPackage.create({
        data: {
          userId: params.userId,
          packageId: target.id,
          minerId: params.minerId,
          isActive: true,
          isUnilevel: true,
          activatedAt,
          expiresAt: new Date(activatedAt.getTime() + UPGRADE_VALIDITY_DAYS * DAY_MS),
          transactionId: transaction.id,
          directBonusSnapshot: target.directBonus,
          priceSnapshot: target.price
        }
      })
      ids.push(userPackage.id)
    }

    return ids
  })

  await logAdminAction({
    actionType: 'PACKAGE_UPDATED',
    performedBy: params.performedBy,
    targetUserId: params.userId,
    resourceType: 'USER_PACKAGE',
    oldValue: { disabledUserPackageIds: consumedIds.map(Number) },
    newValue: { createdUserPackageIds: createdPackageIds.map(Number) },
    description: `Upgrade de ${consumed} ${source.name} (${isAdmin ? ADMIN_GENERATED_PHRASE : 'normal'}) para ${upgradeCount} ${target.name} no usuário ${params.userId}`,
    metadata: {
      sourcePackageId: Number(source.id),
      targetPackageId: Number(target.id),
      minerId: params.minerId ? Number(params.minerId) : null,
      origin: params.origin
    }
  })

  // Clube dos 300: o pacote novo pode tornar o usuário elegível; os desativados podem removê-lo
  if (params.minerId) {
    try {
      await addUserToClube300(params.userId, target.id, params.minerId)
      const remainingEligible = await prisma.userPackage.count({
        where: {
          userId: params.userId,
          minerId: params.minerId,
          isActive: true,
          isUnilevel: true,
          package: { clube300Eligible: true }
        }
      })
      if (remainingEligible === 0) {
        await removeUserFromClube300(params.userId, params.minerId)
      }
    } catch (error) {
      console.error('Erro ao atualizar Clube dos 300 após upgrade:', error)
    }
  }

  return {
    sourcePackageName: source.name,
    targetPackageName: target.name,
    consumed,
    upgradeCount,
    createdPackageIds: createdPackageIds.map(Number),
    message: `${consumed} ${source.name}(s) convertido(s) em ${upgradeCount} ${target.name}(s)`
  }
}

/** Upgrade a partir de um pacote do usuário (botão "Upgrade →" na tela do usuário) */
export async function upgradeUserPackageGroup(userId: bigint, userPackageId: bigint, performedBy: bigint) {
  const userPackage = await prisma.userPackage.findFirst({
    where: { id: userPackageId, userId },
    select: {
      id: true,
      packageId: true,
      minerId: true,
      isActive: true,
      isUnilevel: true,
      expiresAt: true,
      transaction: { select: { description: true } }
    }
  })

  if (!userPackage) {
    throw new AdminPackageError('Pacote não encontrado ou não pertence ao usuário', 404)
  }

  if (!isUpgradeable(userPackage, new Date())) {
    throw new AdminPackageError('Apenas pacotes unilevel ativos e dentro da validade podem receber upgrade')
  }

  return upgradePackageGroup({
    userId,
    packageId: userPackage.packageId,
    minerId: userPackage.minerId,
    origin: getOrigin(userPackage),
    performedBy
  })
}

/**
 * Upgrade de Tecton para Pluton (relatório do pacote Tecton): converte cada grupo
 * do usuário (mineradora + origem) que tenha pelo menos 5 Tecton.
 */
export async function upgradeUserTectonsToPluton(userId: bigint, tectonPackageId: bigint, performedBy: bigint) {
  const tecton = await prisma.package.findUnique({
    where: { id: tectonPackageId },
    select: { id: true, slug: true, name: true }
  })

  if (!tecton || tecton.slug !== TECTON_SLUG) {
    throw new AdminPackageError('Upgrade para Pluton disponível apenas no pacote Tecton')
  }

  const now = new Date()
  const tectons = await prisma.userPackage.findMany({
    where: {
      userId,
      packageId: tecton.id,
      isActive: true,
      isUnilevel: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    select: {
      id: true,
      packageId: true,
      minerId: true,
      isActive: true,
      isUnilevel: true,
      expiresAt: true,
      transaction: { select: { description: true } }
    }
  })

  const groups = new Map<string, { minerId: bigint | null; origin: PackageOrigin; count: number }>()
  for (const pkg of tectons) {
    const key = getGroupKey(pkg)
    const group = groups.get(key) ?? { minerId: pkg.minerId, origin: getOrigin(pkg), count: 0 }
    group.count++
    groups.set(key, group)
  }

  const eligibleGroups = [...groups.values()].filter((group) => group.count >= TECTON_PER_PLUTON)
  if (eligibleGroups.length === 0) {
    throw new AdminPackageError(`Usuário precisa de no mínimo ${TECTON_PER_PLUTON} Tecton no mesmo grupo para o upgrade`)
  }

  let totalConsumed = 0
  let totalCreated = 0
  for (const group of eligibleGroups) {
    const result = await upgradePackageGroup({
      userId,
      packageId: tecton.id,
      minerId: group.minerId,
      origin: group.origin,
      performedBy
    })
    totalConsumed += result.consumed
    totalCreated += result.upgradeCount
  }

  return {
    consumed: totalConsumed,
    upgradeCount: totalCreated,
    message: `${totalConsumed} Tecton convertido(s) em ${totalCreated} Pluton`
  }
}
