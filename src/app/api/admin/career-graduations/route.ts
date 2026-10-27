import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'career.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar graduações de carreira' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const careerId = searchParams.get('careerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Construir filtros
    const where: any = {}

    // Filtro por nível de carreira (graduação)
    if (careerId) {
      where.careerId = BigInt(careerId)
    }

    // Filtro por nome ou código de indicação
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { referralCode: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    // Filtro por período
    if (startDate || endDate) {
      where.graduatedAt = {}
      if (startDate) {
        where.graduatedAt.gte = new Date(startDate)
      }
      if (endDate) {
        // Adicionar 23:59:59 ao endDate para incluir todo o dia
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.graduatedAt.lte = end
      }
    }

    // Buscar total de registros
    const total = await prisma.unilevelUserCareer.count({ where })

    // Buscar graduações
    const graduations = await prisma.unilevelUserCareer.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            referralCode: true,
            profilePhotos: {
              select: {
                photoUrl: true
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 1
            }
          }
        },
        career: {
          select: {
            id: true,
            name: true,
            pinImageUrl: true,
            requiredPoints: true,
            maxTeamVolumePercent: true,
            indirectBonusLevels: true,
            reactivationLevels: true,
            extraProfitPercent: true,
            travelBonus: true,
            travelValue: true,
            hasPrizeChoice: true,
            careerPrizeDescription: true,
            careerPrizeValue: true,
            flyers: {
              select: {
                id: true,
                textColor: true,
                backgroundImage: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: {
        graduatedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    // Formatar dados
    const formattedGraduations = graduations.map(grad => ({
      id: grad.id.toString(),
      userId: grad.userId.toString(),
      userName: grad.user.name,
      userEmail: grad.user.email,
      referralCode: grad.user.referralCode,
      photoUrl: grad.user.profilePhotos[0]?.photoUrl || null,
      careerLevel: grad.career.name,
      pinImageUrl: grad.career.pinImageUrl || null,
      requiredPoints: grad.career.requiredPoints,
      totalNetworkPoints: grad.totalNetworkPoints,
      validPoints: grad.validPoints,
      maxTeamVolumePercent: grad.maxTeamVolumePercent.toString(),
      indirectBonusLevels: grad.career.indirectBonusLevels,
      reactivationLevels: grad.career.reactivationLevels,
      extraProfitPercent: grad.career.extraProfitPercent.toString(),
      travelBonus: grad.career.travelBonus,
      travelValue: grad.career.travelValue?.toString() || null,
      hasPrizeChoice: grad.career.hasPrizeChoice,
      careerPrizeDescription: grad.career.careerPrizeDescription,
      careerPrizeValue: grad.career.careerPrizeValue?.toNumber(),
      prizeChoice: grad.prizeChoice,
      flyer: grad.career.flyers && grad.career.flyers.length > 0 ? {
        id: grad.career.flyers[0].id.toString(),
        textColor: grad.career.flyers[0].textColor,
        backgroundImage: grad.career.flyers[0].backgroundImage
      } : null,
      graduatedAt: grad.graduatedAt.toISOString()
    }))

    return NextResponse.json({
      graduations: formattedGraduations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar graduações:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar graduações' },
      { status: 500 }
    )
  }
}

