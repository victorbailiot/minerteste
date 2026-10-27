import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermissionOrSuperAdmin } from '@/lib/authorization'
import { auditFiltersSchema } from '@/lib/schemas/permissions'

/**
 * GET /api/admin/permissions/audit
 * Histórico de alterações de permissões e roles
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermissionOrSuperAdmin(userId, 'permissions.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar auditoria' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    const filters = auditFiltersSchema.parse({
      userId: searchParams.get('userId'),
      roleId: searchParams.get('roleId'),
      actionType: searchParams.get('actionType'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    })

    // Construir filtros
    const where: any = {}
    
    if (filters.userId) {
      const userIdBigInt = typeof filters.userId === 'bigint' ? filters.userId : BigInt(filters.userId)
      where.OR = [
        { performedBy: userIdBigInt },
        { targetUserId: userIdBigInt },
      ]
    }
    
    if (filters.roleId) {
      const roleIdBigInt = typeof filters.roleId === 'bigint' ? filters.roleId : BigInt(filters.roleId)
      where.targetRoleId = roleIdBigInt
    }
    
    if (filters.actionType) {
      where.actionType = filters.actionType
    }
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate)
      }
    }

    // Calcular paginação
    const page = filters.page || 1
    const limit = filters.limit || 20
    const skip = (page - 1) * limit

    // Buscar registros de auditoria
    const [audits, total] = await Promise.all([
      prisma.permissionAudit.findMany({
        where,
        include: {
          performedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          targetRole: {
            select: {
              id: true,
              name: true,
            },
          },
          permission: {
            select: {
              id: true,
              key: true,
              description: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.permissionAudit.count({ where }),
    ])

    // Formatar resposta
    const formattedAudits = audits.map(audit => ({
      id: audit.id.toString(),
      actionType: audit.actionType,
      performedBy: {
        id: audit.performedByUser.id.toString(),
        name: audit.performedByUser.name,
        email: audit.performedByUser.email,
      },
      targetUser: audit.targetUser ? {
        id: audit.targetUser.id.toString(),
        name: audit.targetUser.name,
        email: audit.targetUser.email,
      } : null,
      targetRole: audit.targetRole ? {
        id: audit.targetRole.id.toString(),
        name: audit.targetRole.name,
      } : null,
      permission: audit.permission ? {
        id: audit.permission.id.toString(),
        key: audit.permission.key,
        description: audit.permission.description,
      } : null,
      oldValue: audit.oldValue,
      newValue: audit.newValue,
      reason: audit.reason,
      createdAt: audit.createdAt.toISOString(),
    }))

    // Estatísticas de ações
    const actionStats = await prisma.permissionAudit.groupBy({
      by: ['actionType'],
      where,
      _count: {
        actionType: true,
      },
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: {
        audits: formattedAudits,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        stats: {
          byAction: actionStats.map(stat => ({
            actionType: stat.actionType,
            count: stat._count.actionType,
          })),
        },
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar auditoria:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Filtros inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao buscar auditoria' },
      { status: 500 }
    )
  }
}

