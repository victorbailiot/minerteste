import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission, assignRoleToUser, removeRoleFromUser } from '@/lib/authorization'
import { assignRoleSchema, removeRoleSchema } from '@/lib/schemas/roles'

/**
 * GET /api/admin/users/[id]/roles
 * Listar roles de um usuário
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'users.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar usuários' }, { status: 403 })
    }

    const { id } = await params
    const targetUserId = BigInt(id)

    // Verificar se usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Buscar roles do usuário
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: targetUserId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        role: {
          include: {
            _count: {
              select: {
                permissions: true,
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    })

    const formattedRoles = userRoles.map(ur => ({
      id: ur.role.id.toString(),
      name: ur.role.name,
      description: ur.role.description,
      isSystemRole: ur.role.isSystemRole,
      isActive: ur.role.isActive,
      permissionsCount: ur.role._count.permissions,
      assignedAt: ur.assignedAt.toISOString(),
      expiresAt: ur.expiresAt?.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: formattedRoles,
    })
  } catch (error) {
    console.error('Erro ao listar roles do usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao listar roles do usuário' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users/[id]/roles
 * Atribuir role a usuário
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'roles.assign')) {
      return NextResponse.json({ error: 'Sem permissão para atribuir roles' }, { status: 403 })
    }

    const { id } = await params
    const targetUserId = BigInt(id)

    const body = await request.json()
    const validatedData = assignRoleSchema.parse(body)

    const roleId = typeof validatedData.roleId === 'bigint' 
      ? validatedData.roleId 
      : BigInt(validatedData.roleId)

    // Verificar se usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se role existe
    const role = await prisma.roleModel.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    // Verificar se já tem esse role
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: targetUserId,
          roleId,
        },
      },
    })

    if (existingUserRole) {
      return NextResponse.json(
        { error: 'Usuário já possui este role' },
        { status: 400 }
      )
    }

    // Atribuir role
    const expiresAt = validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
    await assignRoleToUser(
      targetUserId,
      roleId,
      userId,
      expiresAt,
      validatedData.reason || undefined
    )

    return NextResponse.json({
      success: true,
      message: `Role "${role.name}" atribuído ao usuário com sucesso`,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao atribuir role:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    if (error.message.includes('Sem permissão')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Erro ao atribuir role' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id]/roles
 * Remover role de usuário
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'roles.assign')) {
      return NextResponse.json({ error: 'Sem permissão para remover roles' }, { status: 403 })
    }

    const { id } = await params
    const targetUserId = BigInt(id)

    const body = await request.json()
    const validatedData = removeRoleSchema.parse(body)

    const roleId = typeof validatedData.roleId === 'bigint' 
      ? validatedData.roleId 
      : BigInt(validatedData.roleId)

    // Verificar se usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se role existe
    const role = await prisma.roleModel.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    // Remover role
    await removeRoleFromUser(
      targetUserId,
      roleId,
      userId,
      validatedData.reason || undefined
    )

    return NextResponse.json({
      success: true,
      message: `Role "${role.name}" removido do usuário com sucesso`,
    })
  } catch (error: any) {
    console.error('Erro ao remover role:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    if (error.message.includes('Sem permissão')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Erro ao remover role' },
      { status: 500 }
    )
  }
}

