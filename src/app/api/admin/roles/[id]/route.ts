import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermissionOrSuperAdmin } from '@/lib/authorization'
import { updateRoleSchema } from '@/lib/schemas/roles'
import { auditPermissionChange } from '@/lib/authorization'

/**
 * GET /api/admin/roles/[id]
 * Obter detalhes de um role
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
    if (!await hasPermissionOrSuperAdmin(userId, 'roles.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar roles' }, { status: 403 })
    }

    const { id } = await params
    const roleId = BigInt(id)

    const role = await prisma.roleModel.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            permissions: true,
            users: true,
          },
        },
      },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    // Formatar resposta
    const formattedRole = {
      id: role.id.toString(),
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
      permissions: role.permissions.map(rp => ({
        id: rp.permission.id.toString(),
        key: rp.permission.key,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description,
        grantedAt: rp.grantedAt.toISOString(),
      })),
      users: role.users.map(ur => ({
        id: ur.user.id.toString(),
        name: ur.user.name,
        email: ur.user.email,
        assignedAt: ur.assignedAt.toISOString(),
        expiresAt: ur.expiresAt?.toISOString(),
      })),
      counts: {
        permissions: role._count.permissions,
        users: role._count.users,
      },
    }

    return NextResponse.json({
      success: true,
      data: formattedRole,
    })
  } catch (error) {
    console.error('Erro ao buscar role:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar role' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/roles/[id]
 * Atualizar role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermissionOrSuperAdmin(userId, 'roles.update')) {
      return NextResponse.json({ error: 'Sem permissão para atualizar roles' }, { status: 403 })
    }

    const { id } = await params
    const roleId = BigInt(id)

    // Verificar se role existe
    const existingRole = await prisma.roleModel.findUnique({
      where: { id: roleId },
    })

    if (!existingRole) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    // Não permitir editar roles do sistema
    if (existingRole.isSystemRole) {
      return NextResponse.json(
        { error: 'Não é permitido editar roles do sistema' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateRoleSchema.parse(body)

    // Se está mudando o nome, verificar se não existe outro com esse nome
    if (validatedData.name && validatedData.name !== existingRole.name) {
      const duplicateRole = await prisma.roleModel.findUnique({
        where: { name: validatedData.name },
      })

      if (duplicateRole) {
        return NextResponse.json(
          { error: 'Já existe um role com este nome' },
          { status: 400 }
        )
      }
    }

    // Atualizar role
    const updatedRole = await prisma.roleModel.update({
      where: { id: roleId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.description && { description: validatedData.description }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
    })

    // Registrar auditoria
    await auditPermissionChange({
      actionType: validatedData.isActive !== undefined 
        ? (validatedData.isActive ? 'ROLE_ACTIVATED' : 'ROLE_DEACTIVATED')
        : 'ROLE_UPDATED',
      performedBy: userId,
      targetRoleId: roleId,
      oldValue: JSON.stringify({
        name: existingRole.name,
        description: existingRole.description,
        isActive: existingRole.isActive,
      }),
      newValue: JSON.stringify({
        name: updatedRole.name,
        description: updatedRole.description,
        isActive: updatedRole.isActive,
      }),
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedRole.id.toString(),
        name: updatedRole.name,
        description: updatedRole.description,
        isSystemRole: updatedRole.isSystemRole,
        isActive: updatedRole.isActive,
        updatedAt: updatedRole.updatedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Erro ao atualizar role:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao atualizar role' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/roles/[id]
 * Deletar role
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
    if (!await hasPermissionOrSuperAdmin(userId, 'roles.delete')) {
      return NextResponse.json({ error: 'Sem permissão para deletar roles' }, { status: 403 })
    }

    const { id } = await params
    const roleId = BigInt(id)

    // Verificar se role existe
    const role = await prisma.roleModel.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    // Não permitir deletar roles do sistema
    if (role.isSystemRole) {
      return NextResponse.json(
        { error: 'Não é permitido deletar roles do sistema' },
        { status: 403 }
      )
    }

    // Avisar se o role tem usuários atribuídos
    if (role._count.users > 0) {
      return NextResponse.json(
        {
          error: `Este role está atribuído a ${role._count.users} usuário(s). Remova as atribuições antes de deletar.`,
        },
        { status: 400 }
      )
    }

    // Deletar role (as permissões serão deletadas automaticamente por CASCADE)
    await prisma.roleModel.delete({
      where: { id: roleId },
    })

    // Registrar auditoria
    await auditPermissionChange({
      actionType: 'ROLE_DELETED',
      performedBy: userId,
      targetRoleId: roleId,
      oldValue: JSON.stringify({
        name: role.name,
        description: role.description,
      }),
    })

    return NextResponse.json({
      success: true,
      message: 'Role deletado com sucesso',
    })
  } catch (error) {
    console.error('Erro ao deletar role:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar role' },
      { status: 500 }
    )
  }
}

