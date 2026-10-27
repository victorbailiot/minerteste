import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { addBlacklistEntry, getUserBlacklist } from '@/lib/blacklist'
import { addBlacklistSchema, queryBlacklistSchema } from '@/lib/schemas/blacklist.schema'
import { prisma } from '@/lib/prisma'

// GET - Listar entradas de blacklist
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validated = queryBlacklistSchema.parse(queryParams)
    const { page, limit, userId: filterUserId, resource, action, isActive, includeExpired } = validated

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}

    if (filterUserId) {
      where.userId = BigInt(filterUserId)
    }

    if (resource) {
      where.resource = resource
    }

    if (action) {
      where.action = action
    }

    if (isActive !== 'all') {
      where.isActive = isActive === 'true'
    }

    if (includeExpired === 'false') {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    }

    const [entries, total] = await Promise.all([
      prisma.blacklistEntry.findMany({
        where,
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
        },
        skip,
        take: limit,
        orderBy: {
          addedAt: 'desc'
        }
      }),
      prisma.blacklistEntry.count({ where })
    ])

    const now = new Date()
    const formattedEntries = entries.map(entry => ({
      ...entry,
      id: entry.id.toString(),
      userId: entry.userId.toString(),
      addedBy: entry.addedBy.toString(),
      isExpired: entry.expiresAt ? entry.expiresAt < now : false
    }))

    return NextResponse.json({
      success: true,
      data: {
        entries: formattedEntries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Erro ao buscar blacklist:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar blacklist' },
      { status: 500 }
    )
  }
}

// POST - Adicionar entrada na blacklist
export async function POST(request: NextRequest) {
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
    const validated = addBlacklistSchema.parse(body)

    const createdEntries: any[] = []
    const errors: string[] = []

    for (const { resource, action } of validated.resources) {
      const result = await addBlacklistEntry({
        userId: validated.userId,
        resource,
        action: action || null,
        reason: validated.reason,
        addedBy: userId,
        expiresAt: validated.expiresAt || null
      })

      if (result.success && result.entry) {
        createdEntries.push({
          ...result.entry,
          id: result.entry.id.toString(),
          userId: result.entry.userId.toString(),
          addedBy: result.entry.addedBy.toString(),
          user: {
            ...result.entry.user,
            id: result.entry.user.id.toString()
          },
          addedByUser: {
            ...result.entry.addedByUser,
            id: result.entry.addedByUser.id.toString()
          }
        })
      } else if (!result.success) {
        errors.push(result.error || `${resource}${action ? `/${action}` : ''}`)
      }
    }

    if (createdEntries.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: errors.join('; ') },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: createdEntries.length === 1 ? createdEntries[0] : createdEntries
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao adicionar entrada na blacklist:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao adicionar entrada na blacklist' },
      { status: 500 }
    )
  }
}
