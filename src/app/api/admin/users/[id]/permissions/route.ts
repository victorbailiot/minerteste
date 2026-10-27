import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission, grantPermissionToUser, revokePermissionFromUser } from '@/lib/authorization'
import { grantUserPermissionSchema, revokeUserPermissionSchema, deleteUserPermissionSchema } from '@/lib/schemas/permissions'

/**
 * GET /api/admin/users/[id]/permissions
 * Listar permissões individuais de um usuário
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

    // Buscar permissões individuais do usuário
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId: targetUserId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        permission: true,
        grantedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        grantedAt: 'desc',
      },
    })

    const granted = userPermissions
      .filter(up => up.type === 'GRANT')
      .map(up => ({
        id: up.permission.id.toString(),
        key: up.permission.key,
        resource: up.permission.resource,
        action: up.permission.action,
        description: up.permission.description,
        grantedAt: up.grantedAt.toISOString(),
        grantedBy: up.grantedByUser ? { name: up.grantedByUser.name } : null,
        expiresAt: up.expiresAt?.toISOString(),
      }))

    const revoked = userPermissions
      .filter(up => up.type === 'REVOKE')
      .map(up => ({
        id: up.permission.id.toString(),
        key: up.permission.key,
        resource: up.permission.resource,
        action: up.permission.action,
        description: up.permission.description,
        grantedAt: up.grantedAt.toISOString(),
        grantedBy: up.grantedByUser ? { name: up.grantedByUser.name } : null,
        expiresAt: up.expiresAt?.toISOString(),
      }))

    return NextResponse.json({
      success: true,
      data: {
        granted,
        revoked,
      },
    })
  } catch (error) {
    console.error('Erro ao listar permissões do usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao listar permissões do usuário' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users/[id]/permissions
 * Conceder permissão individual a usuário
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
    if (!await hasPermission(userId, 'permissions.assign')) {
      return NextResponse.json({ error: 'Sem permissão para conceder permissões' }, { status: 403 })
    }

    const { id } = await params
    const targetUserId = BigInt(id)

    const body = await request.json()
    const validatedData = grantUserPermissionSchema.parse(body)

    const permissionId = typeof validatedData.permissionId === 'bigint' 
      ? validatedData.permissionId 
      : BigInt(validatedData.permissionId)

    // Verificar se usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se permissão existe
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    })

    if (!permission) {
      return NextResponse.json({ error: 'Permissão não encontrada' }, { status: 404 })
    }

    // Conceder permissão
    const expiresAt = validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
    await grantPermissionToUser(
      targetUserId,
      permissionId,
      userId,
      expiresAt,
      validatedData.reason || undefined
    )

    return NextResponse.json({
      success: true,
      message: `Permissão "${permission.key}" concedida ao usuário com sucesso`,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao conceder permissão:', error)

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
      { error: 'Erro ao conceder permissão' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/users/[id]/permissions
 * Revogar permissão individual de usuário
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
    if (!await hasPermission(userId, 'permissions.revoke')) {
      return NextResponse.json({ error: 'Sem permissão para revogar permissões' }, { status: 403 })
    }

    const { id } = await params
    const targetUserId = BigInt(id)

    const body = await request.json()
    const validatedData = revokeUserPermissionSchema.parse(body)

    const permissionId = typeof validatedData.permissionId === 'bigint' 
      ? validatedData.permissionId 
      : BigInt(validatedData.permissionId)

    // Verificar se usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se permissão existe
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
    })

    if (!permission) {
      return NextResponse.json({ error: 'Permissão não encontrada' }, { status: 404 })
    }

    // Revogar permissão
    const expiresAt = validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
    await revokePermissionFromUser(
      targetUserId,
      permissionId,
      userId,
      expiresAt,
      validatedData.reason || undefined
    )

    return NextResponse.json({
      success: true,
      message: `Permissão "${permission.key}" revogada do usuário com sucesso`,
    })
  } catch (error: any) {
    console.error('Erro ao revogar permissão:', error)

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
      { error: 'Erro ao revogar permissão' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[id]/permissions
 * Deletar permissão individual de usuário completamente
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
    if (!await hasPermission(userId, 'permissions.revoke')) {
      return NextResponse.json({ error: 'Sem permissão para deletar permissões' }, { status: 403 })
    }

    const { id } = await params
    const targetUserId = BigInt(id)

    const body = await request.json()
    const validatedData = deleteUserPermissionSchema.parse(body)

    const permissionId = typeof validatedData.permissionId === 'bigint' 
      ? validatedData.permissionId 
      : BigInt(validatedData.permissionId)

    // Verificar se usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Deletar permissão individual
    await prisma.userPermission.deleteMany({
      where: {
        userId: targetUserId,
        permissionId,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Permissão individual removida com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao deletar permissão:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao deletar permissão' },
      { status: 500 }
    )
  }
}

