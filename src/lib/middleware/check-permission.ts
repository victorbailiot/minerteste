import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, hasAnyPermission, hasRole, hasAnyRole } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'
import * as jwt from 'jsonwebtoken'
import { isBlacklisted, logBlacklistAccess } from '@/lib/blacklist'

/**
 * Obter usuário autenticado (NextAuth ou JWT)
 */
export async function getAuthenticatedUser(request: NextRequest) {
  let user: any = null

  // Tentar NextAuth session primeiro
  const session = await getServerSession(authOptions)
  if (session?.user) {
    user = session.user
  } else {
    // Tentar JWT token do header Authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
        const userFromToken = await prisma.user.findUnique({
          where: { id: BigInt(decoded.userId) },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        })
        if (userFromToken) {
          user = {
            id: userFromToken.id.toString(),
            email: userFromToken.email,
            name: userFromToken.name,
            role: userFromToken.role,
          }
        }
      } catch (error) {
        console.log('Token JWT inválido:', error)
      }
    }
  }

  return user
}

/**
 * Middleware para verificar permissão única
 */
export function requirePermission(permissionKey: string) {
  return async (request: NextRequest, handler: () => Promise<NextResponse>) => {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const hasAccess = await hasPermission(userId, permissionKey)

    if (!hasAccess) {
      return NextResponse.json(
        { error: `Permissão necessária: ${permissionKey}` },
        { status: 403 }
      )
    }

    return handler()
  }
}

/**
 * Middleware para verificar múltiplas permissões (precisa ter todas)
 */
export function requireAllPermissions(permissionKeys: string[]) {
  return async (request: NextRequest, handler: () => Promise<NextResponse>) => {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const hasAccess = await hasAnyPermission(userId, permissionKeys)

    if (!hasAccess) {
      return NextResponse.json(
        { error: `Permissões necessárias: ${permissionKeys.join(', ')}` },
        { status: 403 }
      )
    }

    return handler()
  }
}

/**
 * Middleware para verificar se tem pelo menos uma das permissões
 */
export function requireAnyPermission(permissionKeys: string[]) {
  return async (request: NextRequest, handler: () => Promise<NextResponse>) => {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const hasAccess = await hasAnyPermission(userId, permissionKeys)

    if (!hasAccess) {
      return NextResponse.json(
        { error: `Uma das permissões necessárias: ${permissionKeys.join(', ')}` },
        { status: 403 }
      )
    }

    return handler()
  }
}

/**
 * Middleware para verificar role
 */
export function requireRole(roleName: string) {
  return async (request: NextRequest, handler: () => Promise<NextResponse>) => {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const hasAccess = await hasRole(userId, roleName)

    if (!hasAccess) {
      return NextResponse.json(
        { error: `Role necessário: ${roleName}` },
        { status: 403 }
      )
    }

    return handler()
  }
}

/**
 * Middleware para verificar múltiplos roles (precisa ter um deles)
 */
export function requireAnyRole(roleNames: string[]) {
  return async (request: NextRequest, handler: () => Promise<NextResponse>) => {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const hasAccess = await hasAnyRole(userId, roleNames)

    if (!hasAccess) {
      return NextResponse.json(
        { error: `Um dos roles necessários: ${roleNames.join(', ')}` },
        { status: 403 }
      )
    }

    return handler()
  }
}

/**
 * Middleware simples para verificar autenticação
 */
export async function requireAuth(request: NextRequest): Promise<{ user: any } | NextResponse> {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  return { user }
}

/**
 * Helper para usar em route handlers
 */
export async function checkPermission(request: NextRequest, permissionKey: string): Promise<boolean> {
  const user = await getAuthenticatedUser(request)
  if (!user) return false

  const userId = BigInt(user.id)
  return hasPermission(userId, permissionKey)
}

/**
 * Helper para usar em route handlers (role)
 */
export async function checkRole(request: NextRequest, roleName: string): Promise<boolean> {
  const user = await getAuthenticatedUser(request)
  if (!user) return false

  const userId = BigInt(user.id)
  return hasRole(userId, roleName)
}

// ==================== BLACKLIST MIDDLEWARE ====================

/**
 * Middleware para verificar se usuário não está na blacklist
 * PRIORIDADE MÁXIMA - deve ser usado antes de verificações de permissão
 */
export function requireNotBlacklisted(resource: string, action?: string) {
  return async (request: NextRequest, handler: () => Promise<NextResponse>) => {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const blacklistCheck = await isBlacklisted(userId, resource, action)

    if (blacklistCheck.blocked) {
      // Registrar tentativa de acesso bloqueado
      await logBlacklistAccess(userId, resource, action || null, blacklistCheck.reason || '')

      return NextResponse.json(
        {
          error: blacklistCheck.reason || 'Acesso bloqueado',
          type: 'blacklist',
          blocked: true
        },
        { status: 403 }
      )
    }

    return handler()
  }
}

/**
 * Helper para verificar blacklist em route handlers
 */
export async function checkBlacklist(
  request: NextRequest,
  resource: string,
  action?: string
): Promise<{ blocked: boolean; reason?: string }> {
  const user = await getAuthenticatedUser(request)
  if (!user) return { blocked: false }

  const userId = BigInt(user.id)
  const result = await isBlacklisted(userId, resource, action)

  if (result.blocked) {
    await logBlacklistAccess(userId, resource, action || null, result.reason || '')
  }

  return result
}

