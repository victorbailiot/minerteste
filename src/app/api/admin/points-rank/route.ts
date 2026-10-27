import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'points.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar ranking de pontos' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = (searchParams.get('search') || '').trim()
    const careerLevelId = searchParams.get('careerLevelId')?.trim()

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      userId: { not: BigInt(1) }
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { referralCode: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    if (careerLevelId) {
      where.careerLevelId = BigInt(careerLevelId)
    }

    const [total, unilevelUsers] = await Promise.all([
      prisma.unilevelUser.count({ where }),
      prisma.unilevelUser.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              referralCode: true,
              profilePhotos: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { photoUrl: true }
              }
            }
          },
          careerLevel: {
            select: {
              id: true,
              name: true,
              pinImageUrl: true
            }
          }
        },
        orderBy: { totalPoints: 'desc' },
        skip,
        take: limit
      })
    ])

    const data = unilevelUsers.map((u, idx) => ({
      rank: skip + idx + 1,
      userId: String(u.userId),
      userName: u.user.name,
      referralCode: u.user.referralCode,
      photoUrl: u.user.profilePhotos[0]?.photoUrl || null,
      careerLevelName: u.careerLevel?.name || null,
      pinImageUrl: u.careerLevel?.pinImageUrl || null,
      personalPoints: u.ownPoints,
      networkPoints: u.networkPoints,
      totalPoints: u.totalPoints
    }))

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar ranking de pontos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar ranking de pontos' },
      { status: 500 }
    )
  }
}
