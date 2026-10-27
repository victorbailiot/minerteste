import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    // Buscar todos os diretos do usuário (sponsorId = userId)
    const directReferrals = await prisma.user.findMany({
      where: { 
        sponsorId: userId,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        country: true,
        referralCode: true,
        createdAt: true,
        profilePhotos: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { photoUrl: true }
        },
        packages: {
          where: { isActive: true },
          include: {
            package: {
              select: {
                name: true,
                price: true,
                points: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        unilevelUser: {
          select: {
            totalPoints: true,
            teamVolume: true,
            careerLevel: {
              select: {
                name: true,
                pinImageUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Processar dados dos diretos
    const processedDirects = directReferrals.map(referral => {
      // Todos os pacotes ativos
      const allActivePackages = referral.packages.map(up => ({
        name: up.package.name,
        price: Number(up.package.price),
        points: up.package.points
      }))
      // Maior pacote (por preço) para exibição na lista
      const highestPackage = allActivePackages.length > 0
        ? allActivePackages.reduce((max, p) => (p.price > max.price ? p : max))
        : null
      
      // Pontos do unilevel (se existir)
      const unilevelData = referral.unilevelUser
      const totalPoints = unilevelData?.totalPoints || 0
      const careerLevel = unilevelData?.careerLevel

      const latestPhoto = referral.profilePhotos[0]

      return {
        id: Number(referral.id),
        name: referral.name,
        email: referral.email,
        phone: referral.phone,
        country: referral.country,
        photoUrl: latestPhoto?.photoUrl || null,
        referralCode: referral.referralCode,
        registeredAt: referral.createdAt.toISOString(),
        graduation: careerLevel?.name || 'Sem graduação',
        pinImageUrl: careerLevel?.pinImageUrl || null,
        package: highestPackage,
        packages: allActivePackages,
        points: {
          total: totalPoints,
          left: 0, // Não temos separação por lado no unilevel
          right: 0  // Não temos separação por lado no unilevel
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        directs: processedDirects,
        total: processedDirects.length
      }
    })

  } catch (error) {
    console.error('Erro ao buscar diretos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
