import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermissionOrSuperAdmin } from '@/lib/authorization'
import { createRoleSchema } from '@/lib/schemas/roles'
import { auditPermissionChange } from '@/lib/authorization'

/**
 * GET /api/admin/roles
 * Listar todos os roles
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermissionOrSuperAdmin(userId, 'roles.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar roles' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')

    // Construir filtros
    const where: any = {}
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Buscar roles com contagem de permissões e usuários
    const roles = await prisma.roleModel.findMany({
      where,
      include: {
        _count: {
          select: {
            permissions: true,
            users: true,
          },
        },
      },
      orderBy: [
        { isSystemRole: 'desc' },
        { name: 'asc' },
      ],
    })

    // Formatar resposta
    const formattedRoles = roles.map(role => ({
      id: role.id.toString(),
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      permissionsCount: role._count.permissions,
      usersCount: role._count.users,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: formattedRoles,
    })
  } catch (error) {
    console.error('Erro ao listar roles:', error)
    return NextResponse.json(
      { error: 'Erro ao listar roles' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/roles
 * Criar novo role
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermissionOrSuperAdmin(userId, 'roles.create')) {
      return NextResponse.json({ error: 'Sem permissão para criar roles' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createRoleSchema.parse(body)

    // Verificar se já existe role com esse nome
    const existingRole = await prisma.roleModel.findUnique({
      where: { name: validatedData.name },
    })

    if (existingRole) {
      return NextResponse.json(
        { error: 'Já existe um role com este nome' },
        { status: 400 }
      )
    }

    // Criar role
    const role = await prisma.roleModel.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        isSystemRole: false,
        isActive: validatedData.isActive ?? true,
      },
    })

    // Registrar auditoria
    await auditPermissionChange({
      actionType: 'ROLE_CREATED',
      performedBy: userId,
      targetRoleId: role.id,
      newValue: JSON.stringify({
        name: role.name,
        description: role.description,
      }),
    })

    return NextResponse.json({
      success: true,
      data: {
        id: role.id.toString(),
        name: role.name,
        description: role.description,
        isSystemRole: role.isSystemRole,
        isActive: role.isActive,
        createdAt: role.createdAt.toISOString(),
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar role:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao criar role' },
      { status: 500 }
    )
  }
}

