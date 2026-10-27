import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermissionOrSuperAdmin } from '@/lib/authorization'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermissionOrSuperAdmin(userId, 'roles.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar roles' }, { status: 403 })
    }

    const roleId = BigInt(params.id)

    // Buscar usuários que têm este role
    const userRoles = await prisma.userRole.findMany({
      where: {
        roleId: roleId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            createdAt: true
          }
        },
        assignedByRole: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      }
    })

    // Formatar dados para resposta
    const users = userRoles.map(userRole => ({
      id: userRole.user.id.toString(),
      name: userRole.user.name,
      email: userRole.user.email,
      avatar: null, // Não há campo de avatar no User
      status: userRole.user.isActive ? 'active' : 'inactive',
      assignedAt: userRole.assignedAt,
      assignedBy: userRole.assignedByRole?.name || null,
      expiresAt: userRole.expiresAt,
      isExpired: userRole.expiresAt ? new Date(userRole.expiresAt) < new Date() : false
    }))

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length
    })

  } catch (error) {
    console.error('Erro ao buscar usuários do role:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermissionOrSuperAdmin(userId, 'roles.assign')) {
      return NextResponse.json({ error: 'Sem permissão para atribuir roles' }, { status: 403 })
    }

    const roleId = BigInt(params.id)
    const body = await request.json()
    const { userId: targetUserId, expiresAt, reason } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    const targetUserBigInt = BigInt(targetUserId)

    // Verificar se o role existe
    const role = await prisma.roleModel.findUnique({
      where: { id: roleId }
    })

    if (!role) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    // Verificar se o usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserBigInt }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se o usuário já tem este role
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: targetUserBigInt,
        roleId: roleId
      }
    })

    if (existingUserRole) {
      return NextResponse.json({ error: 'Usuário já possui este role' }, { status: 400 })
    }

    // Atribuir role ao usuário
    const userRole = await prisma.userRole.create({
      data: {
        userId: targetUserBigInt,
        roleId: roleId,
        assignedBy: userId,
        assignedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    })

    // Criar auditoria
    await prisma.permissionAudit.create({
      data: {
        actionType: 'ROLE_ASSIGNED_TO_USER',
        performedBy: userId,
        targetUserId: targetUserBigInt,
        targetRoleId: roleId,
        reason: reason || 'Role atribuído via painel admin',
        oldValue: null,
        newValue: JSON.stringify({
          roleName: role.name,
          userId: targetUserId
        }),
        createdAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Role atribuído com sucesso',
      data: userRole
    })

  } catch (error) {
    console.error('Erro ao atribuir role:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermissionOrSuperAdmin(userId, 'roles.assign')) {
      return NextResponse.json({ error: 'Sem permissão para remover roles' }, { status: 403 })
    }

    const roleId = BigInt(params.id)
    const body = await request.json()
    const { userId: targetUserId, reason } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    const targetUserBigInt = BigInt(targetUserId)

    // Verificar se o role existe
    const role = await prisma.roleModel.findUnique({
      where: { id: roleId }
    })

    if (!role) {
      return NextResponse.json({ error: 'Role não encontrado' }, { status: 404 })
    }

    // Verificar se o usuário tem este role
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: targetUserBigInt,
        roleId: roleId
      }
    })

    if (!userRole) {
      return NextResponse.json({ error: 'Usuário não possui este role' }, { status: 404 })
    }

    // Remover role do usuário
    await prisma.userRole.delete({
      where: { id: userRole.id }
    })

    // Criar auditoria
    await prisma.permissionAudit.create({
      data: {
        actionType: 'ROLE_REMOVED_FROM_USER',
        performedBy: userId,
        targetUserId: targetUserBigInt,
        targetRoleId: roleId,
        reason: reason || 'Role removido via painel admin',
        oldValue: JSON.stringify({
          roleName: role.name,
          userId: targetUserId
        }),
        newValue: null,
        createdAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Role removido com sucesso'
    })

  } catch (error) {
    console.error('Erro ao remover role:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
