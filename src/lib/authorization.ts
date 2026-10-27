import { prisma } from './prisma'
import { AuditActionType, PermissionType } from '@/generated/prisma'

// Cache em memória para permissões (TTL de 5 minutos)
const permissionCache = new Map<string, { permissions: Set<string>; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Limpar cache de permissões de um usuário
 */
export function clearPermissionCache(userId: bigint): void {
  permissionCache.delete(userId.toString())
}

/**
 * Limpar todo o cache
 */
export function clearAllPermissionCache(): void {
  permissionCache.clear()
}

/**
 * Buscar permissões do usuário (com cache)
 */
async function getUserPermissionsInternal(userId: bigint): Promise<Set<string>> {
  const cacheKey = userId.toString()
  const now = Date.now()

  // Verificar cache
  const cached = permissionCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.permissions
  }

  // Buscar do banco
  const permissions = new Set<string>()

  // 1. Buscar permissões dos roles do usuário
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  })

  // Adicionar permissões dos roles
  for (const userRole of userRoles) {
    if (userRole.role.isActive) {
      for (const rolePermission of userRole.role.permissions) {
        if (rolePermission.permission.isActive) {
          permissions.add(rolePermission.permission.key)
        }
      }
    }
  }

  // 2. Buscar permissões individuais do usuário
  const userPermissions = await prisma.userPermission.findMany({
    where: {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      permission: true,
    },
  })

  // Aplicar permissões individuais (GRANT adiciona, REVOKE remove)
  for (const userPermission of userPermissions) {
    if (userPermission.permission.isActive) {
      if (userPermission.type === 'GRANT') {
        permissions.add(userPermission.permission.key)
      } else if (userPermission.type === 'REVOKE') {
        permissions.delete(userPermission.permission.key)
      }
    }
  }

  // Armazenar no cache
  permissionCache.set(cacheKey, {
    permissions,
    timestamp: now,
  })

  return permissions
}

/**
 * Verificar se usuário é SUPER_ADMIN ou tem a permissão (evita 403 quando SUPER_ADMIN não tem RolePermissions no DB)
 */
export async function hasPermissionOrSuperAdmin(userId: bigint, permissionKey: string): Promise<boolean> {
  if (await hasRole(userId, 'SUPER_ADMIN')) return true
  return hasPermission(userId, permissionKey)
}

/**
 * Verificar se usuário tem uma permissão específica
 */
export async function hasPermission(userId: bigint, permissionKey: string): Promise<boolean> {
  try {
    const permissions = await getUserPermissionsInternal(userId)
    return permissions.has(permissionKey)
  } catch (error) {
    console.error('Erro ao verificar permissão:', error)
    return false
  }
}

/**
 * Verificar se usuário tem todas as permissões (AND)
 */
export async function hasAllPermissions(userId: bigint, permissionKeys: string[]): Promise<boolean> {
  try {
    const permissions = await getUserPermissionsInternal(userId)
    return permissionKeys.every(key => permissions.has(key))
  } catch (error) {
    console.error('Erro ao verificar permissões:', error)
    return false
  }
}

/**
 * Verificar se usuário tem pelo menos uma permissão (OR)
 */
export async function hasAnyPermission(userId: bigint, permissionKeys: string[]): Promise<boolean> {
  try {
    const permissions = await getUserPermissionsInternal(userId)
    return permissionKeys.some(key => permissions.has(key))
  } catch (error) {
    console.error('Erro ao verificar permissões:', error)
    return false
  }
}

/**
 * Obter todas as permissões do usuário
 */
export async function getUserPermissions(userId: bigint): Promise<string[]> {
  try {
    const permissions = await getUserPermissionsInternal(userId)
    return Array.from(permissions)
  } catch (error) {
    console.error('Erro ao obter permissões:', error)
    return []
  }
}

/**
 * Verificar se usuário tem um role específico
 */
export async function hasRole(userId: bigint, roleName: string): Promise<boolean> {
  try {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          name: roleName,
          isActive: true,
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    })

    return userRole !== null
  } catch (error) {
    console.error('Erro ao verificar role:', error)
    return false
  }
}

/**
 * Verificar se usuário tem algum dos roles
 */
export async function hasAnyRole(userId: bigint, roleNames: string[]): Promise<boolean> {
  try {
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          name: { in: roleNames },
          isActive: true,
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    })

    return userRole !== null
  } catch (error) {
    console.error('Erro ao verificar roles:', error)
    return false
  }
}

/**
 * Obter roles do usuário
 */
export async function getUserRoles(userId: bigint) {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        role: true,
      },
    })

    return userRoles
      .filter(ur => ur.role.isActive)
      .map(ur => ur.role)
  } catch (error) {
    console.error('Erro ao obter roles:', error)
    return []
  }
}

/**
 * Registrar auditoria de mudança de permissão
 */
export async function auditPermissionChange(data: {
  actionType: AuditActionType
  performedBy: bigint
  targetUserId?: bigint
  targetRoleId?: bigint
  permissionId?: bigint
  oldValue?: string
  newValue?: string
  reason?: string
}): Promise<void> {
  try {
    await prisma.permissionAudit.create({
      data: {
        actionType: data.actionType,
        performedBy: data.performedBy,
        targetUserId: data.targetUserId,
        targetRoleId: data.targetRoleId,
        permissionId: data.permissionId,
        oldValue: data.oldValue,
        newValue: data.newValue,
        reason: data.reason,
        createdAt: new Date(),
      },
    })

    // Limpar cache do usuário afetado
    if (data.targetUserId) {
      clearPermissionCache(data.targetUserId)
    }
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error)
    throw error
  }
}

/**
 * Verificar se usuário é SUPER_ADMIN
 */
export async function isSuperAdmin(userId: bigint): Promise<boolean> {
  return hasRole(userId, 'SUPER_ADMIN')
}

/**
 * Verificar se usuário pode gerenciar outro usuário (hierarquia)
 */
export async function canManageUser(managerId: bigint, targetUserId: bigint): Promise<boolean> {
  try {
    // SUPER_ADMIN pode gerenciar qualquer um
    if (await isSuperAdmin(managerId)) {
      return true
    }

    // Ninguém pode gerenciar SUPER_ADMIN exceto outro SUPER_ADMIN
    if (await isSuperAdmin(targetUserId)) {
      return false
    }

    // Outros checks de hierarquia podem ser adicionados aqui
    return true
  } catch (error) {
    console.error('Erro ao verificar hierarquia:', error)
    return false
  }
}

/**
 * Atribuir role a usuário
 */
export async function assignRoleToUser(
  userId: bigint,
  roleId: bigint,
  assignedBy: bigint,
  expiresAt?: Date,
  reason?: string
): Promise<void> {
  try {
    // Verificar se pode gerenciar o usuário
    if (!await canManageUser(assignedBy, userId)) {
      throw new Error('Sem permissão para gerenciar este usuário')
    }

    // Criar a atribuição
    await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy: roleId, // Corrigir: deveria ser assignedBy do usuário
        assignedAt: new Date(),
        expiresAt,
      },
    })

    // Registrar auditoria
    await auditPermissionChange({
      actionType: 'ROLE_ASSIGNED_TO_USER',
      performedBy: assignedBy,
      targetUserId: userId,
      targetRoleId: roleId,
      reason,
    })

    // Limpar cache
    clearPermissionCache(userId)
  } catch (error) {
    console.error('Erro ao atribuir role:', error)
    throw error
  }
}

/**
 * Remover role de usuário
 */
export async function removeRoleFromUser(
  userId: bigint,
  roleId: bigint,
  performedBy: bigint,
  reason?: string
): Promise<void> {
  try {
    // Verificar se pode gerenciar o usuário
    if (!await canManageUser(performedBy, userId)) {
      throw new Error('Sem permissão para gerenciar este usuário')
    }

    // Remover a atribuição
    await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId,
      },
    })

    // Registrar auditoria
    await auditPermissionChange({
      actionType: 'ROLE_REMOVED_FROM_USER',
      performedBy,
      targetUserId: userId,
      targetRoleId: roleId,
      reason,
    })

    // Limpar cache
    clearPermissionCache(userId)
  } catch (error) {
    console.error('Erro ao remover role:', error)
    throw error
  }
}

/**
 * Conceder permissão individual a usuário
 */
export async function grantPermissionToUser(
  userId: bigint,
  permissionId: bigint,
  grantedBy: bigint,
  expiresAt?: Date,
  reason?: string
): Promise<void> {
  try {
    // Verificar se pode gerenciar o usuário
    if (!await canManageUser(grantedBy, userId)) {
      throw new Error('Sem permissão para gerenciar este usuário')
    }

    // Criar ou atualizar permissão
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
      update: {
        type: 'GRANT',
        grantedBy,
        grantedAt: new Date(),
        expiresAt,
      },
      create: {
        userId,
        permissionId,
        type: 'GRANT',
        grantedBy,
        grantedAt: new Date(),
        expiresAt,
      },
    })

    // Registrar auditoria
    await auditPermissionChange({
      actionType: 'PERMISSION_GRANTED_TO_USER',
      performedBy: grantedBy,
      targetUserId: userId,
      permissionId,
      reason,
    })

    // Limpar cache
    clearPermissionCache(userId)
  } catch (error) {
    console.error('Erro ao conceder permissão:', error)
    throw error
  }
}

/**
 * Revogar permissão individual de usuário
 */
export async function revokePermissionFromUser(
  userId: bigint,
  permissionId: bigint,
  revokedBy: bigint,
  expiresAt?: Date,
  reason?: string
): Promise<void> {
  try {
    // Verificar se pode gerenciar o usuário
    if (!await canManageUser(revokedBy, userId)) {
      throw new Error('Sem permissão para gerenciar este usuário')
    }

    // Criar ou atualizar permissão
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
      update: {
        type: 'REVOKE',
        grantedBy: revokedBy,
        grantedAt: new Date(),
        expiresAt,
      },
      create: {
        userId,
        permissionId,
        type: 'REVOKE',
        grantedBy: revokedBy,
        grantedAt: new Date(),
        expiresAt,
      },
    })

    // Registrar auditoria
    await auditPermissionChange({
      actionType: 'PERMISSION_REVOKED_FROM_USER',
      performedBy: revokedBy,
      targetUserId: userId,
      permissionId,
      reason,
    })

    // Limpar cache
    clearPermissionCache(userId)
  } catch (error) {
    console.error('Erro ao revogar permissão:', error)
    throw error
  }
}

// ==================== INTEGRATED ACCESS CHECK ====================

import { isBlacklisted } from './blacklist'

/**
 * Verificação integrada de acesso (blacklist + permissions)
 * A blacklist tem PRIORIDADE MÁXIMA
 */
export async function checkAccess(
  userId: bigint,
  resource: string,
  action?: string
): Promise<{ allowed: boolean; reason?: string; type?: 'blacklist' | 'permission' }> {
  try {
    // 1. Verificar blacklist (PRIORIDADE MÁXIMA)
    const blacklistCheck = await isBlacklisted(userId, resource, action)
    if (blacklistCheck.blocked) {
      return {
        allowed: false,
        reason: blacklistCheck.reason,
        type: 'blacklist'
      }
    }

    // 2. Verificar permissões normais
    const permissionKey = action ? `${resource}.${action}` : resource
    const hasAccess = await hasPermission(userId, permissionKey)
    
    if (!hasAccess) {
      return {
        allowed: false,
        reason: 'Você não tem permissão para esta ação',
        type: 'permission'
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Erro ao verificar acesso:', error)
    return {
      allowed: false,
      reason: 'Erro ao verificar acesso'
    }
  }
}

