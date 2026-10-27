import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const loggedInUserId = Number(session.user.id)
    const searchParams = request.nextUrl.searchParams
    const requestedUserId = searchParams.get('userId') 
      ? parseInt(searchParams.get('userId')!) 
      : loggedInUserId

    // Verificar se o usuário tem permissão (deve estar na rede do usuário logado)
    if (requestedUserId !== loggedInUserId) {
      // Verificar se o usuário solicitado está na rede do usuário logado
      const isValidUser = await checkUserInNetwork(requestedUserId, loggedInUserId)
      
      if (!isValidUser) {
        return NextResponse.json(
          { error: 'Usuário não encontrado na sua rede' },
          { status: 403 }
        )
      }
    }

    // Buscar indicações diretas (sponsorId = requestedUserId)
    const directs = await prisma.user.findMany({
      where: { 
        sponsorId: BigInt(requestedUserId)
      },
      include: {
        unilevelUser: true,
        packages: {
          where: { isActive: true },
          include: { package: true },
          orderBy: [
            {
              package: {
                price: 'desc'
              }
            }
          ],
          take: 1
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Importar função de carreira
    const { getCurrentCareerLevel } = await import('@/lib/business-logic-unilevel')

    // Calcular nível em relação ao usuário logado
    const directsData = await Promise.all(
      directs.map(async (direct) => {
        const level = await calculateLevelInRelationToUser(Number(direct.id), loggedInUserId)
        
        // Contar indicações diretas deste usuário
        const directCount = await prisma.user.count({
          where: { 
            sponsorId: direct.id,
            unilevelUser: {
              isActive: true
            }
          }
        })

        // Buscar nível de carreira
        const careerData = await getCurrentCareerLevel(direct.id)
        const careerLevel = careerData?.careerName || 'Iniciante'

        return {
          id: Number(direct.id),
          name: direct.name,
          email: direct.email,
          level: level,
          packageName: direct.packages[0]?.package?.name,
          directReferrals: directCount,
          totalPoints: direct.unilevelUser?.totalPoints || 0,
          isActive: direct.unilevelUser?.isActive || false,
          careerLevel: careerLevel
        }
      })
    )

    return NextResponse.json({
      directs: directsData,
      requestedUserId,
      loggedInUserId,
      count: directsData.length
    })

  } catch (error) {
    console.error('Erro ao buscar indicações diretas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função para verificar se um usuário está na rede do usuário logado
async function checkUserInNetwork(userId: number, loggedInUserId: number): Promise<boolean> {
  // Se o usuário solicitado é o próprio usuário logado
  if (userId === loggedInUserId) {
    return true
  }

  // Buscar o sponsor do usuário solicitado recursivamente até encontrar o usuário logado
  let currentUserId = userId
  
  for (let i = 0; i < 100; i++) { // Limite de profundidade
    const user = await prisma.user.findUnique({
      where: { id: BigInt(currentUserId) },
      select: { sponsorId: true }
    })

    if (!user || !user.sponsorId) {
      return false
    }

    const sponsorId = Number(user.sponsorId)

    if (sponsorId === loggedInUserId) {
      return true
    }

    currentUserId = sponsorId
  }

  return false
}

// Função para calcular o nível de um usuário em relação ao usuário logado
async function calculateLevelInRelationToUser(userId: number, loggedInUserId: number): Promise<number> {
  if (userId === loggedInUserId) {
    return 0
  }

  let level = 0
  let currentUserId = userId
  
  for (let i = 0; i < 100; i++) { // Limite de profundidade
    const user = await prisma.user.findUnique({
      where: { id: BigInt(currentUserId) },
      select: { sponsorId: true }
    })

    if (!user || !user.sponsorId) {
      return -1 // Usuário não encontrado na rede
    }

    const sponsorId = Number(user.sponsorId)
    level++

    if (sponsorId === loggedInUserId) {
      return level
    }

    currentUserId = sponsorId
  }

  return -1 // Profundidade máxima excedida
}
