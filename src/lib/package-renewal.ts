import { prisma } from './prisma'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_VALIDITY_DAYS = 365

interface RenewablePackage {
  isActive: boolean
  expiresAt: Date | null
  renewedDays: number | null
}

/**
 * Uma cota pode ser renovada uma única vez, apenas depois de expirar.
 * `renewedDays` preenchido indica que a renovação já foi usada.
 */
export function canRenewUserPackage(pkg: RenewablePackage, now: Date = new Date()): boolean {
  return pkg.isActive && !!pkg.expiresAt && pkg.expiresAt < now && pkg.renewedDays == null
}

/**
 * Dias acrescentados na renovação: a validade original da cota (activatedAt → expiresAt)
 * mais os dias em que ela ficou expirada. Assim a nova validade conta a partir do dia da
 * renovação, mantendo o horário original de expiração.
 * Ex.: Núcleo expirado em 09/10/2026 e renovado em 15/10/2026 → 365 + 6 = 371 dias → 15/10/2027.
 */
export function calculateRenewalDays(activatedAt: Date, expiresAt: Date, now: Date = new Date()): number {
  const validityDays = Math.round((expiresAt.getTime() - activatedAt.getTime()) / DAY_MS)
  const daysExpired = Math.max(0, Math.ceil((now.getTime() - expiresAt.getTime()) / DAY_MS))
  return (validityDays > 0 ? validityDays : DEFAULT_VALIDITY_DAYS) + daysExpired
}

export class PackageRenewalError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
  }
}

/**
 * Renova gratuitamente uma cota expirada do usuário (uma única vez).
 */
export async function renewUserPackage(userId: bigint, userPackageId: bigint) {
  const userPackage = await prisma.userPackage.findFirst({
    where: { id: userPackageId, userId },
    include: { package: { select: { name: true } } }
  })

  if (!userPackage) {
    throw new PackageRenewalError('Cota não encontrada', 404)
  }

  if (!userPackage.isActive) {
    throw new PackageRenewalError('Não é possível renovar uma cota inativa')
  }

  if (userPackage.renewedDays != null) {
    throw new PackageRenewalError('Esta cota já foi renovada. A renovação só pode ser feita uma vez.')
  }

  const now = new Date()
  if (!userPackage.expiresAt || userPackage.expiresAt >= now) {
    throw new PackageRenewalError('Apenas cotas expiradas podem ser renovadas')
  }

  const daysAdded = calculateRenewalDays(userPackage.activatedAt, userPackage.expiresAt, now)
  const newExpiresAt = new Date(userPackage.expiresAt.getTime() + daysAdded * DAY_MS)

  // updateMany com renewedDays: null evita renovação dupla em requisições simultâneas
  const updated = await prisma.userPackage.updateMany({
    where: { id: userPackageId, userId, renewedDays: null },
    data: { expiresAt: newExpiresAt, renewedDays: daysAdded }
  })

  if (updated.count === 0) {
    throw new PackageRenewalError('Esta cota já foi renovada. A renovação só pode ser feita uma vez.')
  }

  return {
    id: Number(userPackage.id),
    packageName: userPackage.package.name,
    expiresAt: newExpiresAt.toISOString(),
    renewedDays: daysAdded,
    daysAdded
  }
}
