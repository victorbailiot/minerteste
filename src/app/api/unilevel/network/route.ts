import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCurrentCareerLevel } from '@/lib/business-logic-unilevel'

interface UnilevelNode {
  id: number
  name: string
  email: string
  level: number
  levelFromRoot: number // Nível em relação ao usuário logado original
  isActive: boolean
  packageName?: string
  totalPoints: number
  networkPoints: number // Pontos da rede
  ownPoints: number // Pontos próprios
  teamVolume: number
  careerLevel?: string
  children: UnilevelNode[]
}

interface UnilevelNetworkData {
  tree: UnilevelNode
  stats: {
    totalMembers: number
    directReferrals: number
    totalPoints: number
    totalTeamVolume: number
    levelBreakdown: {
      level1: number
      level2: number
      level3: number
      level4: number
      level5: number
    }
  }
  metadata: {
    maxDepth: number
    rootUserId: string
    originalUserId: string // ID do usuário logado original
    clickedUserLevel: number // Nível do usuário clicado em relação ao usuário logado
    generatedAt: string
  }
}

async function buildUnilevelTree(
  userId: number,
  currentLevel: number = 0,
  maxLevel: number = 5,
  clickedUserLevel: number = 0 // Nível do usuário clicado em relação ao usuário logado
): Promise<UnilevelNode | null> {
  if (currentLevel >= maxLevel) {
    return null
  }

  // Buscar dados do usuário
  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    include: {
      unilevelUser: true,
      packages: {
        where: { isActive: true },
        include: { package: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  if (!user) {
    return null
  }

  // Calcular nível em relação ao usuário logado original
  // clickedUserLevel = nível do usuário clicado
  // currentLevel = nível relativo na árvore atual (0, 1, 2, 3, 4)
  // levelFromRoot = clickedUserLevel + currentLevel
  const levelFromRoot = clickedUserLevel + currentLevel

  // Buscar downlines diretos (sponsorId = userId)
  const downlines = await prisma.user.findMany({
    where: { 
      sponsorId: BigInt(userId),
      unilevelUser: {
        isActive: true
      }
    },
    include: {
      unilevelUser: true,
      packages: {
        where: { isActive: true },
        include: { package: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  // Construir árvore recursivamente
  const children: UnilevelNode[] = []
  
  for (const downline of downlines) {
    const childNode = await buildUnilevelTree(
      Number(downline.id),
      currentLevel + 1,
      maxLevel,
      clickedUserLevel // Passar o mesmo nível do usuário clicado
    )
    
    if (childNode) {
      children.push(childNode)
    }
  }

  // Determinar pacote ativo
  const activePackage = user.packages[0]?.package
  const packageName = activePackage?.name || 'Sem Pacote'

  // Buscar nível de carreira atual usando a nova estrutura
  const careerData = await getCurrentCareerLevel(BigInt(userId))
  const careerLevel = careerData?.careerName || 'Iniciante'

  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    level: currentLevel, // Nível na árvore atual (sempre começa em 0)
    levelFromRoot: levelFromRoot, // Nível em relação ao usuário logado original
    isActive: user.unilevelUser?.isActive || false,
    packageName,
    totalPoints: user.unilevelUser?.totalPoints || 0,
    networkPoints: user.unilevelUser?.networkPoints || 0, // Pontos da rede
    ownPoints: user.unilevelUser?.ownPoints || 0, // Pontos próprios
    teamVolume: Number(user.unilevelUser?.teamVolume || 0),
    careerLevel,
    children
  }
}

async function calculateNetworkStats(
  tree: UnilevelNode,
  level: number = 0
): Promise<{
  totalMembers: number
  totalPoints: number
  totalTeamVolume: number
  levelBreakdown: { [key: string]: number }
}> {
  const stats = {
    totalMembers: 1, // Contar o próprio nó
    totalPoints: tree.totalPoints,
    totalTeamVolume: tree.teamVolume,
    levelBreakdown: { [`level${level + 1}`]: 1 }
  }

  // Recursivamente contar filhos
  for (const child of tree.children) {
    const childStats = await calculateNetworkStats(child, level + 1)
    
    stats.totalMembers += childStats.totalMembers
    stats.totalPoints += childStats.totalPoints
    stats.totalTeamVolume += childStats.totalTeamVolume
    
    // Adicionar ao breakdown de níveis
    for (const [levelKey, count] of Object.entries(childStats.levelBreakdown)) {
      stats.levelBreakdown[levelKey] = (stats.levelBreakdown[levelKey] || 0) + count
    }
  }

  return stats
}

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

    const originalUserId = Number(session.user.id) // ID do usuário logado original
    const searchParams = request.nextUrl.searchParams
    const maxDepth = parseInt(searchParams.get('depth') || '5')
    const rootUserId = searchParams.get('rootUserId') ? 
      parseInt(searchParams.get('rootUserId')!) : originalUserId
    const clickedUserLevel = parseInt(searchParams.get('clickedUserLevel') || '0') // Nível do usuário clicado

    // Verificar se o usuário tem permissão para ver a rede
    if (rootUserId !== originalUserId) {
      // Aqui você pode implementar lógica adicional de permissão se necessário
      // Por exemplo, verificar se o usuário está na rede do usuário logado
    }

    // Construir árvore unilevel passando o nível do usuário clicado
    const tree = await buildUnilevelTree(rootUserId, 0, maxDepth, clickedUserLevel)
    
    if (!tree) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Calcular estatísticas
    const stats = await calculateNetworkStats(tree)
    
    // Contar indicações diretas (nível 1)
    const directReferrals = await prisma.user.count({
      where: { 
        sponsorId: BigInt(rootUserId),
        unilevelUser: {
          isActive: true
        }
      }
    })

    const networkData: UnilevelNetworkData = {
      tree,
      stats: {
        totalMembers: stats.totalMembers,
        directReferrals,
        totalPoints: stats.totalPoints,
        totalTeamVolume: stats.totalTeamVolume,
        levelBreakdown: {
          level1: stats.levelBreakdown.level1 || 0,
          level2: stats.levelBreakdown.level2 || 0,
          level3: stats.levelBreakdown.level3 || 0,
          level4: stats.levelBreakdown.level4 || 0,
          level5: stats.levelBreakdown.level5 || 0
        }
      },
      metadata: {
        maxDepth,
        rootUserId: rootUserId.toString(),
        originalUserId: originalUserId.toString(), // ID do usuário logado original
        clickedUserLevel: clickedUserLevel, // Nível do usuário clicado
        generatedAt: new Date().toISOString()
      }
    }

    return NextResponse.json(networkData)

  } catch (error) {
    console.error('Erro ao buscar rede unilevel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
