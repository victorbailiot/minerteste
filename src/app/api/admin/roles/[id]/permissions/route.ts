import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermissionOrSuperAdmin, auditPermissionChange, clearAllPermissionCache } from '@/lib/authorization'
import { assignPermissionsToRoleSchema } from '@/lib/schemas/roles'

/**
 * GET /api/admin/roles/[id]/permissions
 * Listar permissões de um role
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

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    })

    const formattedPermissions = rolePermissions.map(rp => ({
      id: rp.permission.id.toString(),
      key: rp.permission.key,
      resource: rp.permission.resource,
      action: rp.permission.action,
      description: rp.permission.description,
      isActive: rp.permission.isActive,
      grantedAt: rp.grantedAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: formattedPermissions,
    })
  } catch (error) {
    console.error('Erro ao listar permissões do role:', error)
    return NextResponse.json(
      { error: 'Erro ao listar permissões do role' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/roles/[id]/permissions
 * Atribuir permissões a um role
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
    if (!await hasPermissionOrSuperAdmin(userId, 'permissions.assign')) {
      return NextResponse.json({ error: 'Sem permissão para atribuir permissões' }, { status: 403 })
    }

    const { id } = await params
    const roleId = BigInt(id)

    // Verificar se role existe
    const role = await prisma.roleModel.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = assignPermissionsToRoleSchema.parse(body)

    // Converter permissionIds para BigInt
    const permissionIds = validatedData.permissionIds.map(id => 
      typeof id === 'bigint' ? id : BigInt(id)
    )

    // Verificar se as permissões existem
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
      },
    })

    if (permissions.length !== permissionIds.length) {
      return NextResponse.json(
        { error: 'Uma ou mais permissões não foram encontradas' },
        { status: 400 }
      )
    }

    // Buscar permissões já atribuídas
    const existingPermissions = await prisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: { in: permissionIds },
      },
    })

    const existingPermissionIds = new Set(
      existingPermissions.map(rp => rp.permissionId.toString())
    )

    // Filtrar apenas as novas permissões
    const newPermissionIds = permissionIds.filter(
      id => !existingPermissionIds.has(id.toString())
    )

    // Criar as novas atribuições
    const created = await prisma.rolePermission.createMany({
      data: newPermissionIds.map(permissionId => ({
        roleId,
        permissionId,
        grantedBy: userId,
        grantedAt: new Date(),
      })),
      skipDuplicates: true,
    })

    // Registrar auditoria para cada permissão
    for (const permissionId of newPermissionIds) {
      await auditPermissionChange({
        actionType: 'PERMISSION_ASSIGNED_TO_ROLE',
        performedBy: userId,
        targetRoleId: roleId,
        permissionId,
        reason: validatedData.reason || undefined,
      })
    }

    // Limpar cache de todos os usuários que têm esse role
    clearAllPermissionCache()

    return NextResponse.json({
      success: true,
      message: `${created.count} permissão(ões) atribuída(s) ao role`,
      data: {
        added: created.count,
        skipped: permissionIds.length - created.count,
      },
    })
  } catch (error: any) {
    console.error('Erro ao atribuir permissões:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao atribuir permissões' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/roles/[id]/permissions
 * Remover permissões de um role
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
    if (!await hasPermissionOrSuperAdmin(userId, 'permissions.revoke')) {
      return NextResponse.json({ error: 'Sem permissão para revogar permissões' }, { status: 403 })
    }

    const { id } = await params
    const roleId = BigInt(id)

    // Verificar se role existe
    const role = await prisma.roleModel.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    // Não permitir remover permissões de SUPER_ADMIN
    if (role.name === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Não é permitido remover permissões do SUPER_ADMIN' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = assignPermissionsToRoleSchema.parse(body)

    // Converter permissionIds para BigInt
    const permissionIds = validatedData.permissionIds.map(id => 
      typeof id === 'bigint' ? id : BigInt(id)
    )

    // Deletar as atribuições
    const deleted = await prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { in: permissionIds },
      },
    })

    // Registrar auditoria para cada permissão
    for (const permissionId of permissionIds) {
      await auditPermissionChange({
        actionType: 'PERMISSION_REMOVED_FROM_ROLE',
        performedBy: userId,
        targetRoleId: roleId,
        permissionId,
        reason: validatedData.reason || undefined,
      })
    }

    // Limpar cache de todos os usuários que têm esse role
    clearAllPermissionCache()

    return NextResponse.json({
      success: true,
      message: `${deleted.count} permissão(ões) removida(s) do role`,
      data: {
        removed: deleted.count,
      },
    })
  } catch (error: any) {
    console.error('Erro ao remover permissões:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao remover permissões' },
      { status: 500 }
    )
  }
}

