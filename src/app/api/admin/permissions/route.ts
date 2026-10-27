import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermissionOrSuperAdmin } from '@/lib/authorization'
import { permissionFiltersSchema } from '@/lib/schemas/permissions'

/**
 * GET /api/admin/permissions
 * Listar todas as permissões disponíveis
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermissionOrSuperAdmin(userId, 'permissions.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar permissões' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filters = permissionFiltersSchema.parse({
      resource: searchParams.get('resource'),
      action: searchParams.get('action'),
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      search: searchParams.get('search'),
    })

    // Construir filtros
    const where: any = {}
    if (filters.resource) {
      where.resource = filters.resource
    }
    if (filters.action) {
      where.action = filters.action
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }
    if (filters.search) {
      where.OR = [
        { key: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { resource: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    // Buscar permissões
    const permissions = await prisma.permission.findMany({
      where,
      include: {
        _count: {
          select: {
            roles: true,
            userPermissions: true,
          },
        },
      },
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
    })

    // Agrupar por recurso
    const groupedByResource: Record<string, any[]> = {}
    
    for (const permission of permissions) {
      if (!groupedByResource[permission.resource]) {
        groupedByResource[permission.resource] = []
      }
      
      groupedByResource[permission.resource].push({
        id: permission.id.toString(),
        key: permission.key,
        action: permission.action,
        description: permission.description,
        isActive: permission.isActive,
        rolesCount: permission._count.roles,
        usersCount: permission._count.userPermissions,
        createdAt: permission.createdAt.toISOString(),
      })
    }

    // Formatar resposta com e sem agrupamento
    const allPermissions = permissions.map(p => ({
      id: p.id.toString(),
      key: p.key,
      resource: p.resource,
      action: p.action,
      description: p.description,
      isActive: p.isActive,
      rolesCount: p._count.roles,
      usersCount: p._count.userPermissions,
      createdAt: p.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        permissions: allPermissions,
        grouped: groupedByResource,
        resources: Object.keys(groupedByResource).sort(),
      },
    })
  } catch (error: any) {
    console.error('Erro ao listar permissões:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Filtros inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao listar permissões' },
      { status: 500 }
    )
  }
}

