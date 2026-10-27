import { prisma } from '@/lib/prisma'
import { BlacklistActionType } from '@/generated/prisma'

// ==================== CACHE SYSTEM ====================

interface BlacklistCacheEntry {
  entries: Array<{
    resource: string
    action: string | null
    reason: string
    expiresAt: Date | null
  }>
  timestamp: number
}

const blacklistCache = new Map<string, BlacklistCacheEntry>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

const getCacheKey = (userId: bigint): string => `blacklist:${userId}`

const getCachedBlacklist = (userId: bigint): BlacklistCacheEntry | null => {
  const key = getCacheKey(userId)
  const cached = blacklistCache.get(key)
  
  if (!cached) return null
  
  const now = Date.now()
  if (now - cached.timestamp > CACHE_TTL) {
    blacklistCache.delete(key)
    return null
  }
  
  return cached
}

const setCachedBlacklist = (userId: bigint, entries: BlacklistCacheEntry['entries']): void => {
  const key = getCacheKey(userId)
  blacklistCache.set(key, {
    entries,
    timestamp: Date.now()
  })
}

export const clearBlacklistCache = (userId: bigint): void => {
  const key = getCacheKey(userId)
  blacklistCache.delete(key)
}

export const clearAllBlacklistCache = (): void => {
  blacklistCache.clear()
}

// ==================== CORE FUNCTIONS ====================

interface BlacklistCheckResult {
  blocked: boolean
  reason?: string
}

export async function isBlacklisted(
  userId: bigint,
  resource: string,
  action?: string
): Promise<BlacklistCheckResult> {
  try {
    // Verificar cache
    const cached = getCachedBlacklist(userId)
    let entries = cached?.entries

    // Se não está no cache, buscar do banco
    if (!entries) {
      const dbEntries = await prisma.blacklistEntry.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          resource: true,
          action: true,
          reason: true,
          expiresAt: true
        }
      })

      entries = dbEntries
      setCachedBlacklist(userId, dbEntries)
    }

    const now = new Date()

    // Verificar bloqueio específico (resource + action)
    if (action) {
      const specificBlock = entries.find(
        (entry) =>
          entry.resource === resource &&
          entry.action === action &&
          (!entry.expiresAt || entry.expiresAt > now)
      )

      if (specificBlock) {
        return {
          blocked: true,
          reason: specificBlock.reason
        }
      }
    }

    // Verificar bloqueio geral do recurso (resource sem action)
    const generalBlock = entries.find(
      (entry) =>
        entry.resource === resource &&
        entry.action === null &&
        (!entry.expiresAt || entry.expiresAt > now)
    )

    if (generalBlock) {
      return {
        blocked: true,
        reason: generalBlock.reason
      }
    }

    return { blocked: false }
  } catch (error) {
    console.error('Erro ao verificar blacklist:', error)
    // Em caso de erro, permitir acesso (fail-open) para não travar o sistema
    return { blocked: false }
  }
}

export async function getBlacklistReason(
  userId: bigint,
  resource: string,
  action?: string
): Promise<string | null> {
  const result = await isBlacklisted(userId, resource, action)
  return result.blocked ? result.reason || null : null
}

// ==================== MANAGEMENT FUNCTIONS ====================

interface AddBlacklistEntryData {
  userId: bigint
  resource: string
  action?: string | null
  reason: string
  addedBy: bigint
  expiresAt?: Date | null
}

export async function addBlacklistEntry(
  data: AddBlacklistEntryData
): Promise<{ success: boolean; entry?: any; error?: string }> {
  try {
    // Verificar se já existe entrada idêntica (findFirst pois action pode ser null)
    const existing = await prisma.blacklistEntry.findFirst({
      where: {
        userId: data.userId,
        resource: data.resource,
        action: data.action ?? null
      }
    })

    if (existing) {
      return {
        success: false,
        error: 'Já existe uma entrada de blacklist para este usuário, recurso e ação'
      }
    }

    // Criar entrada
    const entry = await prisma.blacklistEntry.create({
      data: {
        userId: data.userId,
        resource: data.resource,
        action: data.action || null,
        reason: data.reason,
        addedBy: data.addedBy,
        expiresAt: data.expiresAt || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        addedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Registrar auditoria
    await prisma.blacklistAudit.create({
      data: {
        actionType: BlacklistActionType.ENTRY_ADDED,
        performedBy: data.addedBy,
        targetUserId: data.userId,
        entryId: entry.id,
        resource: data.resource,
        action: data.action || null,
        reason: data.reason,
        metadata: JSON.stringify({
          expiresAt: data.expiresAt?.toISOString() || null
        })
      }
    })

    // Limpar cache do usuário
    clearBlacklistCache(data.userId)

    return { success: true, entry }
  } catch (error) {
    console.error('Erro ao adicionar entrada na blacklist:', error)
    return {
      success: false,
      error: 'Erro ao adicionar entrada na blacklist'
    }
  }
}

export async function removeBlacklistEntry(
  userId: bigint,
  resource: string,
  action?: string | null,
  removedBy?: bigint
): Promise<{ success: boolean; error?: string }> {
  try {
    const entry = await prisma.blacklistEntry.findFirst({
      where: {
        userId,
        resource,
        action: action ?? null
      }
    })

    if (!entry) {
      return {
        success: false,
        error: 'Entrada não encontrada'
      }
    }

    await prisma.blacklistEntry.delete({
      where: {
        id: entry.id
      }
    })

    // Registrar auditoria
    if (removedBy) {
      await prisma.blacklistAudit.create({
        data: {
          actionType: BlacklistActionType.ENTRY_REMOVED,
          performedBy: removedBy,
          targetUserId: userId,
          entryId: entry.id,
          resource,
          action: action || null,
          reason: entry.reason
        }
      })
    }

    // Limpar cache do usuário
    clearBlacklistCache(userId)

    return { success: true }
  } catch (error) {
    console.error('Erro ao remover entrada da blacklist:', error)
    return {
      success: false,
      error: 'Erro ao remover entrada da blacklist'
    }
  }
}

export async function removeBlacklistEntryById(
  entryId: bigint,
  removedBy: bigint
): Promise<{ success: boolean; error?: string }> {
  try {
    const entry = await prisma.blacklistEntry.findUnique({
      where: { id: entryId }
    })

    if (!entry) {
      return {
        success: false,
        error: 'Entrada não encontrada'
      }
    }

    await prisma.blacklistEntry.delete({
      where: { id: entryId }
    })

    // Registrar auditoria
    await prisma.blacklistAudit.create({
      data: {
        actionType: BlacklistActionType.ENTRY_REMOVED,
        performedBy: removedBy,
        targetUserId: entry.userId,
        entryId: entry.id,
        resource: entry.resource,
        action: entry.action,
        reason: entry.reason
      }
    })

    // Limpar cache do usuário
    clearBlacklistCache(entry.userId)

    return { success: true }
  } catch (error) {
    console.error('Erro ao remover entrada da blacklist:', error)
    return {
      success: false,
      error: 'Erro ao remover entrada da blacklist'
    }
  }
}

interface UpdateBlacklistEntryData {
  reason?: string
  expiresAt?: Date | null
  isActive?: boolean
  resources?: Array<{ resource: string; action?: string | null }>
}

export async function updateBlacklistEntry(
  entryId: bigint,
  data: UpdateBlacklistEntryData,
  updatedBy: bigint
): Promise<{ success: boolean; entry?: any; error?: string }> {
  try {
    const oldEntry = await prisma.blacklistEntry.findUnique({
      where: { id: entryId }
    })

    if (!oldEntry) {
      return {
        success: false,
        error: 'Entrada não encontrada'
      }
    }

    // Se foi enviada nova lista de recursos, sincronizar todas as entradas do usuário
    if (data.resources && data.resources.length > 0) {
      const reason = data.reason ?? oldEntry.reason
      const expiresAt = data.expiresAt !== undefined ? data.expiresAt : oldEntry.expiresAt

      // Remover entradas atuais do usuário (serão recriadas com a nova lista)
      await prisma.blacklistEntry.deleteMany({
        where: { userId: oldEntry.userId }
      })

      // Criar uma entrada por recurso selecionado
      let firstEntry: any = null
      for (const { resource, action } of data.resources) {
        const created = await prisma.blacklistEntry.create({
          data: {
            userId: oldEntry.userId,
            resource,
            action: action ?? null,
            reason,
            addedBy: updatedBy,
            expiresAt
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        })
        if (!firstEntry) firstEntry = created

        await prisma.blacklistAudit.create({
          data: {
            actionType: BlacklistActionType.ENTRY_ADDED,
            performedBy: updatedBy,
            targetUserId: oldEntry.userId,
            entryId: created.id,
            resource,
            action: action ?? null,
            reason,
            metadata: JSON.stringify({
              expiresAt: expiresAt?.toISOString() || null,
              syncFromEntryId: entryId.toString()
            })
          }
        })
      }

      clearBlacklistCache(oldEntry.userId)
      return { success: true, entry: firstEntry }
    }

    // Atualização simples (apenas reason, expiresAt, isActive)
    const entry = await prisma.blacklistEntry.update({
      where: { id: entryId },
      data: {
        reason: data.reason,
        expiresAt: data.expiresAt,
        isActive: data.isActive
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    await prisma.blacklistAudit.create({
      data: {
        actionType: BlacklistActionType.ENTRY_UPDATED,
        performedBy: updatedBy,
        targetUserId: entry.userId,
        entryId: entry.id,
        resource: entry.resource,
        action: entry.action,
        reason: entry.reason,
        metadata: JSON.stringify({
          oldReason: oldEntry.reason,
          newReason: data.reason,
          oldExpiresAt: oldEntry.expiresAt?.toISOString() || null,
          newExpiresAt: data.expiresAt?.toISOString() || null,
          oldIsActive: oldEntry.isActive,
          newIsActive: data.isActive
        })
      }
    })

    clearBlacklistCache(entry.userId)
    return { success: true, entry }
  } catch (error) {
    console.error('Erro ao atualizar entrada da blacklist:', error)
    return {
      success: false,
      error: 'Erro ao atualizar entrada da blacklist'
    }
  }
}

export async function getUserBlacklist(userId: bigint) {
  try {
    const entries = await prisma.blacklistEntry.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        addedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        addedAt: 'desc'
      }
    })

    const now = new Date()

    return entries.map((entry) => ({
      id: entry.id,
      resource: entry.resource,
      action: entry.action,
      reason: entry.reason,
      addedBy: entry.addedByUser,
      addedAt: entry.addedAt,
      expiresAt: entry.expiresAt,
      isExpired: entry.expiresAt ? entry.expiresAt < now : false,
      isActive: entry.isActive
    }))
  } catch (error) {
    console.error('Erro ao buscar blacklist do usuário:', error)
    return []
  }
}

// ==================== CLEANUP ====================

export async function cleanExpiredBlacklist(): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  try {
    const now = new Date()

    // Buscar entradas expiradas
    const expiredEntries = await prisma.blacklistEntry.findMany({
      where: {
        isActive: true,
        expiresAt: {
          lt: now
        }
      },
      select: {
        id: true,
        userId: true
      }
    })

    if (expiredEntries.length === 0) {
      return { success: true, count: 0 }
    }

    // Desativar entradas expiradas
    await prisma.blacklistEntry.updateMany({
      where: {
        id: {
          in: expiredEntries.map((e) => e.id)
        }
      },
      data: {
        isActive: false
      }
    })

    // Registrar auditoria para cada entrada expirada
    const auditRecords = expiredEntries.map((entry) => ({
      actionType: BlacklistActionType.ENTRY_EXPIRED,
      performedBy: BigInt(1), // Sistema
      targetUserId: entry.userId,
      entryId: entry.id,
      createdAt: now
    }))

    await prisma.blacklistAudit.createMany({
      data: auditRecords
    })

    // Limpar cache dos usuários afetados
    const uniqueUserIds = [...new Set(expiredEntries.map((e) => e.userId))]
    uniqueUserIds.forEach((userId) => clearBlacklistCache(userId))

    return {
      success: true,
      count: expiredEntries.length
    }
  } catch (error) {
    console.error('Erro ao limpar blacklist expirada:', error)
    return {
      success: false,
      error: 'Erro ao limpar entradas expiradas'
    }
  }
}

// ==================== AUDIT ====================

export async function logBlacklistAccess(
  userId: bigint,
  resource: string,
  action: string | null,
  reason: string
): Promise<void> {
  try {
    await prisma.blacklistAudit.create({
      data: {
        actionType: BlacklistActionType.ACCESS_BLOCKED,
        performedBy: userId,
        targetUserId: userId,
        resource,
        action,
        reason,
        metadata: JSON.stringify({
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
        })
      }
    })
  } catch (error) {
    console.error('Erro ao registrar acesso bloqueado:', error)
  }
}
