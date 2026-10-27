import { headers } from 'next/headers'
import { prisma } from './prisma'

export type AdminAuditInput = {
  actionType: 'WITHDRAWAL_APPROVED' | 'WITHDRAWAL_REJECTED' | 'WITHDRAWAL_COMPLETED' | 'WITHDRAWAL_PIX_SENT' | 'USER_CREATED' | 'USER_UPDATED' | 'USER_ACTIVATED' | 'USER_DEACTIVATED' | 'PACKAGE_UPDATED' | 'PACKAGE_ACTIVATED' | 'PACKAGE_DEACTIVATED' | 'PARAMETER_UPDATED' | 'BONUS_ADJUSTED' | 'BONUS_GENERATED' | 'TRANSACTION_UPDATED' | 'FINANCIAL_TRANSACTION_CREATED' | 'FINANCIAL_TRANSACTION_UPDATED' | 'POINTS_RECALCULATED' | 'SPONSOR_CHANGED' | 'DIRECT_BONUS_FIX' | 'OTHER'
  performedBy: bigint
  targetUserId?: bigint
  resourceType: string
  resourceId?: bigint
  oldValue?: unknown
  newValue?: unknown
  description: string
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

export const logAdminAction = async (data: AdminAuditInput): Promise<bigint | null> => {
  try {
    // Leitura de headers protegida para não interromper o registro de auditoria
    let resolvedIp: string | null = null
    let resolvedUserAgent: string | null = null
    try {
      const hdrs = await headers()
      const forwardedFor = hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip')
      resolvedUserAgent = hdrs.get('user-agent')
      resolvedIp = forwardedFor ? forwardedFor.split(',')[0]?.trim() : null
    } catch {
      // Ignorar falhas ao ler headers (edge/runtime), continuar sem IP/UA
      resolvedIp = null
      resolvedUserAgent = null
    }
    const ip = data.ipAddress ?? resolvedIp

    // Tenta via Client tipado; se indisponível, usa SQL bruto seguro
    const prismaAny = prisma as any
    if (prismaAny.adminActionAudit?.create) {
      const created = await prismaAny.adminActionAudit.create({
        data: {
          actionType: data.actionType as any,
          performedBy: data.performedBy,
          targetUserId: data.targetUserId,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          oldValue: data.oldValue != null ? safeStringify(data.oldValue) : null,
          newValue: data.newValue != null ? safeStringify(data.newValue) : null,
          description: data.description,
          metadata: data.metadata ?? undefined,
          ipAddress: ip ?? undefined,
          userAgent: data.userAgent ?? resolvedUserAgent ?? undefined,
        },
      })
      return BigInt(created.id)
    } else {
      // Fallback SQL (PostgreSQL) - cast explícito para o enum
      await prisma.$executeRawUnsafe(
        `INSERT INTO admin_action_audits 
          ("actionType","performedBy","targetUserId","resourceType","resourceId","oldValue","newValue","description","metadata","ipAddress","userAgent","createdAt")
         VALUES ($1::"AdminActionType", $2::bigint, $3::bigint, $4, $5::bigint, $6, $7, $8, $9::jsonb, $10, $11, NOW())`,
        data.actionType,
        data.performedBy, // bigint
        data.targetUserId ?? null, // bigint | null
        data.resourceType,
        data.resourceId ?? null, // bigint | null
        data.oldValue != null ? safeStringify(data.oldValue) : null,
        data.newValue != null ? safeStringify(data.newValue) : null,
        data.description,
        data.metadata ? JSON.stringify(data.metadata) : null,
        ip,
        data.userAgent ?? resolvedUserAgent ?? null,
      )
      return null
    }
    return null
  } catch (error) {
    console.error('Falha ao registrar admin audit:', error)
    return null
  }
}

/** Resumo do favorecido para auditoria de PIX (detalhe pode ser mascarado no metadata). */
export type PayeeSummaryForPixAudit = { nome: string; metodo: string; detalhe: string }

function maskPayeeDetailForAudit(s: PayeeSummaryForPixAudit): string {
  if (s.metodo === 'Agência + Conta' || s.metodo.startsWith('Agência')) return s.detalhe
  const raw = s.detalhe.trim()
  if (raw.length <= 6) return '***'
  if (raw.includes('@')) {
    const [loc, dom] = raw.split('@')
    if (!dom) return '***'
    const prefix = (loc ?? '').slice(0, 2)
    return `${prefix}***@${dom}`
  }
  return `***${raw.slice(-4)}`
}

/**
 * Registra envio de PIX Bradesco (saque): quem pagou, valor e beneficiário.
 * Não interrompe o fluxo se o insert falhar (delegado a logAdminAction).
 */
export async function logWithdrawalPixSent(data: {
  performedByUserId: string | number | bigint
  withdrawalId: bigint
  beneficiaryUserId: bigint
  amountBRL: string
  payee: PayeeSummaryForPixAudit
  e2eid?: string | null
  idLote?: string | null
  metodoEnvio?: 'individual' | 'batch'
}): Promise<void> {
  const descBase = `PIX Bradesco: R$ ${data.amountBRL} para ${data.payee.nome} (saque #${data.withdrawalId})`
  const description = descBase.length > 500 ? `${descBase.slice(0, 497)}...` : descBase
  await logAdminAction({
    actionType: 'WITHDRAWAL_PIX_SENT',
    performedBy: BigInt(String(data.performedByUserId)),
    targetUserId: data.beneficiaryUserId,
    resourceType: 'WITHDRAWAL',
    resourceId: data.withdrawalId,
    description,
    newValue: {
      valorReais: data.amountBRL,
      recebedorNome: data.payee.nome,
      recebedorMetodo: data.payee.metodo,
    },
    metadata: {
      valorReais: data.amountBRL,
      recebedorNome: data.payee.nome,
      recebedorMetodo: data.payee.metodo,
      recebedorRefMascarado: maskPayeeDetailForAudit(data.payee),
      e2eid: data.e2eid ?? undefined,
      idLote: data.idLote ?? undefined,
      envio: data.metodoEnvio,
      provedor: 'bradesco',
    },
  })
}

export const getAdminAuditHistory = async (params: {
  page?: number
  limit?: number
  performedBy?: bigint
  performedByIn?: bigint[]
  targetUserId?: bigint
  targetUserIdIn?: bigint[]
  resourceType?: string
  actionType?: string
  from?: Date
  to?: Date
}) => {
  const page = params.page ?? 1
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100)
  const skip = (page - 1) * limit

  const where: any = {}
  if (params.performedByIn && params.performedByIn.length) {
    where.performedBy = { in: params.performedByIn }
  } else if (params.performedBy) {
    where.performedBy = params.performedBy
  }
  if (params.targetUserIdIn && params.targetUserIdIn.length) {
    where.targetUserId = { in: params.targetUserIdIn }
  } else if (params.targetUserId) {
    where.targetUserId = params.targetUserId
  }
  if (params.resourceType) where.resourceType = params.resourceType
  if (params.actionType) where.actionType = params.actionType as any
  if (params.from || params.to) {
    where.createdAt = {}
    if (params.from) where.createdAt.gte = params.from
    if (params.to) where.createdAt.lte = params.to
  }

  const prismaAny = prisma as any
  let items: any[] = []
  let total = 0

  try {
    if (prismaAny.adminActionAudit?.findMany) {
      const result = await Promise.all([
        prismaAny.adminActionAudit.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            performedByUser: { select: { id: true, name: true, email: true } },
            targetUser: { select: { id: true, name: true, email: true } },
          },
        }),
        prismaAny.adminActionAudit.count({ where }),
      ])
      items = result[0]
      total = result[1]
    } else {
      // Fallback SQL simples sem joins (apenas campos principais)
      const whereClauses: string[] = []
      const params: any[] = []

      if (paramsObjToWhere(where, whereClauses, params)) {
        // noop, helper preenche arrays
      }

      const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

      items = await prisma.$queryRawUnsafe(
        `SELECT id, "actionType", "performedBy", "targetUserId", "resourceType", "resourceId",
                "oldValue", "newValue", "description", "metadata", "ipAddress", "userAgent", "createdAt"
           FROM admin_action_audits
           ${whereSql}
           ORDER BY "createdAt" DESC
           LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        ...params,
        limit,
        skip,
      ) as any[]

      const countRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as c FROM admin_action_audits ${whereSql}`,
        ...params,
      ) as any[]
      total = countRows?.[0]?.c ?? 0
    }
  } catch (err) {
    console.error('Falha ao buscar auditoria admin:', err)
    items = []
    total = 0
  }

  // Enriquecer dados de usuário quando usamos fallback SQL (sem include)
  try {
    if (items.length && items[0] && (items[0] as any).performedByUser === undefined) {
      const performedIds = new Set<bigint>()
      const targetIds = new Set<bigint>()
      for (const it of items as any[]) {
        if (it.performedBy) performedIds.add(BigInt(it.performedBy))
        if (it.targetUserId) targetIds.add(BigInt(it.targetUserId))
      }

      const allIds = Array.from(new Set([...performedIds, ...targetIds]))
      if (allIds.length) {
        const users = await prisma.user.findMany({
          where: { id: { in: allIds } },
          select: { id: true, name: true, email: true },
        })
        const map = new Map<string, { id: bigint; name: string | null; email: string | null }>()
        for (const u of users) map.set(u.id.toString(), u)

        items = (items as any[]).map(it => ({
          ...it,
          performedByUser: it.performedBy ? map.get(it.performedBy.toString()) ?? null : null,
          targetUser: it.targetUserId ? map.get(it.targetUserId.toString()) ?? null : null,
        }))
      }
    }
  } catch (enrichErr) {
    console.error('Falha ao enriquecer usuários na auditoria admin:', enrichErr)
  }

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export const getResourceAuditHistory = async (resourceType: string, resourceId: bigint, page = 1, limit = 20) => {
  return getAdminAuditHistory({ resourceType, performedBy: undefined, targetUserId: undefined, actionType: undefined, from: undefined, to: undefined, page, limit })
}

export const getUserActionsHistory = async (performedBy: bigint, page = 1, limit = 20) => {
  return getAdminAuditHistory({ performedBy, page, limit })
}

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

// Helper: converte objeto where usado no client para SQL simples (fallback)
function paramsObjToWhere(where: any, clauses: string[], params: any[]): boolean {
  if (!where || typeof where !== 'object') return false
  if (where.performedBy) {
    if (typeof where.performedBy === 'object' && Array.isArray(where.performedBy.in)) {
      const arr = where.performedBy.in
      const holders = arr.map((_: any, idx: number) => `$${params.length + 1 + idx}`)
      clauses.push(`"performedBy" IN (${holders.join(',')})`)
      params.push(...arr)
    } else {
      clauses.push(`"performedBy" = $${params.length + 1}`)
      params.push(where.performedBy)
    }
  }
  if (where.targetUserId) {
    if (typeof where.targetUserId === 'object' && Array.isArray(where.targetUserId.in)) {
      const arr = where.targetUserId.in
      const holders = arr.map((_: any, idx: number) => `$${params.length + 1 + idx}`)
      clauses.push(`"targetUserId" IN (${holders.join(',')})`)
      params.push(...arr)
    } else {
      clauses.push(`"targetUserId" = $${params.length + 1}`)
      params.push(where.targetUserId)
    }
  }
  if (where.resourceType) {
    clauses.push(`"resourceType" = $${params.length + 1}`)
    params.push(where.resourceType)
  }
  if (where.actionType) {
    // Garantir comparação correta com enum no Postgres
    clauses.push(`"actionType" = $${params.length + 1}::"AdminActionType"`)
    params.push(where.actionType)
  }
  if (where.createdAt) {
    if (where.createdAt.gte) {
      clauses.push(`"createdAt" >= $${params.length + 1}`)
      params.push(where.createdAt.gte)
    }
    if (where.createdAt.lte) {
      clauses.push(`"createdAt" <= $${params.length + 1}`)
      params.push(where.createdAt.lte)
    }
  }
  return clauses.length > 0
}


