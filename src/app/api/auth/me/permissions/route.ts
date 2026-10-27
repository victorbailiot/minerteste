import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { getUserPermissions, getUserRoles } from '@/lib/authorization'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/me/permissions
 * Obter permissões e roles do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)

    // Buscar roles do usuário
    const roles = await getUserRoles(userId)

    // Buscar permissões efetivas
    const permissionKeys = await getUserPermissions(userId)

    // Buscar detalhes das permissões
    const permissions = await prisma.permission.findMany({
      where: {
        key: {
          in: permissionKeys,
        },
      },
      select: {
        id: true,
        key: true,
        resource: true,
        action: true,
        description: true,
      },
    })

    // Buscar permissões individuais (GRANT e REVOKE)
    const individualPermissions = await prisma.userPermission.findMany({
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

    // Agrupar permissões por recurso
    const groupedPermissions: Record<string, any[]> = {}
    for (const permission of permissions) {
      if (!groupedPermissions[permission.resource]) {
        groupedPermissions[permission.resource] = []
      }
      groupedPermissions[permission.resource].push({
        id: permission.id.toString(),
        key: permission.key,
        action: permission.action,
        description: permission.description,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        roles: roles.map(role => ({
          id: role.id.toString(),
          name: role.name,
          description: role.description,
          isSystemRole: role.isSystemRole,
        })),
        permissions: {
          all: permissions.map(p => ({
            id: p.id.toString(),
            key: p.key,
            resource: p.resource,
            action: p.action,
            description: p.description,
          })),
          grouped: groupedPermissions,
          keys: permissionKeys,
        },
        individualPermissions: {
          granted: individualPermissions
            .filter(ip => ip.type === 'GRANT')
            .map(ip => ({
              id: ip.permission.id.toString(),
              key: ip.permission.key,
              description: ip.permission.description,
              grantedAt: ip.grantedAt.toISOString(),
              expiresAt: ip.expiresAt?.toISOString(),
            })),
          revoked: individualPermissions
            .filter(ip => ip.type === 'REVOKE')
            .map(ip => ({
              id: ip.permission.id.toString(),
              key: ip.permission.key,
              description: ip.permission.description,
              grantedAt: ip.grantedAt.toISOString(),
              expiresAt: ip.expiresAt?.toISOString(),
            })),
        },
      },
    })
  } catch (error) {
    console.error('Erro ao buscar permissões do usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar permissões' },
      { status: 500 }
    )
  }
}

