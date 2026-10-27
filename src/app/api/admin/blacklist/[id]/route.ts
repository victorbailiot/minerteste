import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { updateBlacklistEntry, removeBlacklistEntryById } from '@/lib/blacklist'
import { updateBlacklistSchema } from '@/lib/schemas/blacklist.schema'
import { prisma } from '@/lib/prisma'

// GET - Obter detalhes de uma entrada
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
    const canView = await hasPermission(userId, 'blacklist.view')
    
    if (!canView) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    const entryId = BigInt(id)
    const entry = await prisma.blacklistEntry.findUnique({
      where: { id: entryId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        addedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entrada não encontrada' }, { status: 404 })
    }

    const now = new Date()
    const formattedEntry = {
      ...entry,
      id: entry.id.toString(),
      userId: entry.userId.toString(),
      addedBy: entry.addedBy.toString(),
      user: {
        ...entry.user,
        id: entry.user.id.toString()
      },
      addedByUser: {
        ...entry.addedByUser,
        id: entry.addedByUser.id.toString()
      },
      isExpired: entry.expiresAt ? entry.expiresAt < now : false
    }

    return NextResponse.json({
      success: true,
      data: formattedEntry
    })
  } catch (error) {
    console.error('Erro ao buscar entrada:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar entrada' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar entrada
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
    const canManage = await hasPermission(userId, 'blacklist.manage')
    
    if (!canManage) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateBlacklistSchema.parse(body)

    const { id } = await params
    const entryId = BigInt(id)
    const result = await updateBlacklistEntry(entryId, validated, userId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Entrada não encontrada' ? 404 : 400 }
      )
    }

    const formattedEntry = {
      ...result.entry,
      id: result.entry.id.toString(),
      userId: result.entry.userId.toString(),
      user: {
        ...result.entry.user,
        id: result.entry.user.id.toString()
      }
    }

    return NextResponse.json({
      success: true,
      data: formattedEntry
    })
  } catch (error: any) {
    console.error('Erro ao atualizar entrada:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao atualizar entrada' },
      { status: 500 }
    )
  }
}

// DELETE - Remover entrada
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
    const canManage = await hasPermission(userId, 'blacklist.manage')
    
    if (!canManage) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await params
    const entryId = BigInt(id)
    const result = await removeBlacklistEntryById(entryId, userId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Entrada não encontrada' ? 404 : 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Entrada removida com sucesso'
    })
  } catch (error) {
    console.error('Erro ao remover entrada:', error)
    return NextResponse.json(
      { error: 'Erro ao remover entrada' },
      { status: 500 }
    )
  }
}
