import { Tree } from '@/app/model/Tree'
import { prisma } from './prisma'
import { isUserActive } from './business-utils'

export type Position = 'LEFT' | 'RIGHT'

export interface SpilloverResult {
  sponsorId: bigint    // Quem indicou (recebe bônus)
  parentId: bigint     // Onde será posicionado na árvore
  position: Position
  level: number
  path: string[]
}

export interface SpilloverPosition {
  parentId: bigint
  position: 'LEFT' | 'RIGHT'
}

/**
 * Calcula pontos LEFT e RIGHT de um usuário a partir do histórico
 */
async function calculateUserPoints(userId: bigint): Promise<{ leftPoints: number; rightPoints: number }> {
  const pointsHistory = await prisma.userPointsHistory.findMany({
    where: { userId },
    select: {
      points: true,
      side: true
    }
  })

  let leftPoints = 0
  let rightPoints = 0

  for (const record of pointsHistory) {
    if (record.side === 'LEFT') {
      leftPoints += record.points
    } else {
      rightPoints += record.points
    }
  }

  return { leftPoints, rightPoints }
}

/**
 * Visualiza a estrutura da rede de um usuário
 * @param userId - ID do usuário raiz
 * @param maxDepth - Profundidade máxima da árvore
 * @returns Estrutura da rede em formato de árvore
 */
export async function getNetworkTree(userId: bigint, maxDepth: number = 5) {
  async function buildTree(currentUserId: bigint, depth: number = 0): Promise<Tree | null> {
    if (depth >= maxDepth) return null

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        children: {
          select: {
            id: true,
            name: true,
            position: true
          }
        }
      }
    })

    if (!user) return null

    // Calcular pontos do usuário a partir do histórico
    //const userPoints = await calculateUserPoints(user.id)

    // Verificar status de ativação do usuário
    const isActive = await isUserActive(user.id)

    const leftChild = user.children.find(child => child.position === 'LEFT')
    const rightChild = user.children.find(child => child.position === 'RIGHT')

    console.log(leftChild, rightChild)

    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      position: user.position,
      //leftPoints: userPoints.leftPoints,
      //rightPoints: userPoints.rightPoints,
      level: depth,
      isActive,
      left: leftChild ? await buildTree(leftChild.id, depth + 1) : null,
      right: rightChild ? await buildTree(rightChild.id, depth + 1) : null
    }
  }

  return buildTree(userId)
}

/**
 * Calcula estatísticas da rede de um usuário
 * @param userId - ID do usuário
 * @returns Estatísticas da rede
 */
export async function getNetworkStats(userId: bigint) {
  // Função recursiva para contar membros na rede
  async function countNetworkMembers(currentUserId: bigint, side?: Position): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: {
        children: {
          select: { id: true, position: true }
        }
      }
    })

    if (!user) return 0

    let count = 1 // Contar o usuário atual

    for (const child of user.children) {
      if (!side || child.position === side) {
        count += await countNetworkMembers(child.id)
      }
    }

    return count
  }

  // Função para contar indicações diretas
  async function countDirectReferrals(currentUserId: bigint): Promise<number> {
    const directReferrals = await prisma.user.count({
      where: { sponsorId: currentUserId }
    })
    return directReferrals
  }

  // Calcular pontos do usuário atual
  const userPoints = await calculateUserPoints(userId)

  // Contar membros em cada lado
  const leftMembers = await countNetworkMembers(userId, 'LEFT')
  const rightMembers = await countNetworkMembers(userId, 'RIGHT')

  // Contar indicações diretas
  const directReferrals = await countDirectReferrals(userId)

  return {
    leftPoints: userPoints.leftPoints,
    rightPoints: userPoints.rightPoints,
    totalLeftMembers: leftMembers - 1, // Subtrair o próprio usuário
    totalRightMembers: rightMembers - 1, // Subtrair o próprio usuário
    directReferrals: directReferrals,
    totalMembers: leftMembers + rightMembers - 1 // Total menos o próprio usuário
  }
}

/**
 * Encontra a melhor posição de spillover considerando a preferência do patrocinador
 * ATUALIZADO: Incorpora busca recursiva baseada em preferredSide
 */
export async function findBestSpilloverPosition(sponsorId: bigint): Promise<SpilloverResult> {
  
  // Buscar dados do patrocinador
  const sponsor = await prisma.user.findUnique({
    where: { id: sponsorId },
    select: {
      id: true,
      name: true,
      preferredSide: true
    }
  })

  if (!sponsor) {
    throw new Error('Patrocinador não encontrado')
  }

  console.log(`🎯 Spillover para patrocinador: ${sponsor.name}`)
  console.log(`   PreferredSide: ${sponsor.preferredSide || 'INDEFINIDO'}`)

  // Se tem preferência definida, usar busca recursiva
  if (sponsor.preferredSide) {
    console.log('🔍 Usando busca recursiva baseada na preferência')
    return await findPreferredSideRecursivePosition(sponsorId, sponsor.preferredSide)
  }

  // Se não tem preferência, usar spillover balanceado tradicional
  console.log('⚖️  Usando spillover balanceado tradicional')
  return await findBalancedSpilloverPosition(sponsorId)
}

/**
 * Busca recursiva baseada na preferência do patrocinador
 */
async function findPreferredSideRecursivePosition(
  sponsorId: bigint,
  preferredSide: 'LEFT' | 'RIGHT'
): Promise<SpilloverResult> {
  
  const sponsor = await prisma.user.findUnique({
    where: { id: sponsorId },
    select: { name: true }
  })

  const result = await searchRecursivePosition(
    sponsorId,
    preferredSide,
    [sponsor?.name || 'Unknown'],
    0,
    sponsorId  // Passar sponsorId original
  )
  
  return result
}

/**
 * Busca recursiva implementação
 */
async function searchRecursivePosition(
  currentUserId: bigint,
  direction: 'LEFT' | 'RIGHT',
  path: string[],
  depth: number,
  originalSponsorId: bigint
): Promise<SpilloverResult> {
  
  console.log(`🔍 Buscando em: ${path[path.length - 1]} (profundidade ${depth})`)

  // Buscar filhos do usuário atual
  const children = await prisma.user.findMany({
    where: { parentId: currentUserId },
    select: {
      id: true,
      name: true,
      position: true
    }
  })

  const leftChild = children.find(c => c.position === 'LEFT')
  const rightChild = children.find(c => c.position === 'RIGHT')

  console.log(`   LEFT: ${leftChild ? leftChild.name : 'VAZIO'}`)
  console.log(`   RIGHT: ${rightChild ? rightChild.name : 'VAZIO'}`)

  // Verificar se a direção preferida está vazia
  const targetChild = direction === 'LEFT' ? leftChild : rightChild

  if (!targetChild) {
    // Posição vazia encontrada!
    console.log(`🎯 Posição ${direction} vazia encontrada!`)
    
    return {
      sponsorId: originalSponsorId,  // Usar sponsor original
      parentId: currentUserId,
      position: direction,
      level: depth,
      path
    }
  }

  // Posição ocupada - continuar busca recursiva
  console.log(`➡️  Continuando busca em ${targetChild.name}`)
  
  return await searchRecursivePosition(
    targetChild.id,
    direction,
    [...path, targetChild.name],
    depth + 1,
    originalSponsorId
  )
}

/**
 * Spillover balanceado tradicional (quando não há preferência)
 */
async function findBalancedSpilloverPosition(sponsorId: bigint): Promise<SpilloverResult> {
  
  // const sponsor = await prisma.user.findUnique({
  //   where: { id: sponsorId },
  //   select: { name: true }
  // })

  // Usar BFS para encontrar primeira posição livre balanceada
  return await searchSpilloverBFS(sponsorId, null)
}

/**
 * Busca BFS para spillover (preserva lógica original)
 * Atualizado para aceitar preferência opcional
 */
async function searchSpilloverBFS(
  startUserId: bigint,
  preferredSide: 'LEFT' | 'RIGHT' | null = null
): Promise<SpilloverResult> {
  
  const queue: Array<{
    userId: bigint
    path: string[]
    depth: number
  }> = []

  // Inicializar com usuário inicial
  const startUser = await prisma.user.findUnique({
    where: { id: startUserId },
    select: { name: true }
  })

  queue.push({
    userId: startUserId,
    path: [startUser?.name || 'Unknown'],
    depth: 0
  })

  while (queue.length > 0) {
    const current = queue.shift()!

    // Buscar filhos do usuário atual
    const children = await prisma.user.findMany({
      where: { parentId: current.userId },
      select: {
        id: true,
        name: true,
        position: true
      }
    })

    const leftChild = children.find(c => c.position === 'LEFT')
    const rightChild = children.find(c => c.position === 'RIGHT')

    // Se tem preferência, priorizar lado preferido
    if (preferredSide) {
      const preferredChild = preferredSide === 'LEFT' ? leftChild : rightChild
      const otherChild = preferredSide === 'LEFT' ? rightChild : leftChild
      const otherSide = preferredSide === 'LEFT' ? 'RIGHT' : 'LEFT'

      // Verificar lado preferido primeiro
      if (!preferredChild) {
        return {
          sponsorId: startUserId,
          parentId: current.userId,
          position: preferredSide,
          level: current.depth,
          path: current.path
        }
      }

      // Verificar outro lado
      if (!otherChild) {
        return {
          sponsorId: startUserId,
          parentId: current.userId,
          position: otherSide,
          level: current.depth,
          path: current.path
        }
      }

      // Adicionar à fila (preferido primeiro)
      queue.push({
        userId: preferredChild.id,
        path: [...current.path, preferredChild.name],
        depth: current.depth + 1
      })
      
      queue.push({
        userId: otherChild.id,
        path: [...current.path, otherChild.name],
        depth: current.depth + 1
      })
    } else {
      // Sem preferência - ordem tradicional LEFT, RIGHT
      if (!leftChild) {
        return {
          sponsorId: startUserId,
          parentId: current.userId,
          position: 'LEFT',
          level: current.depth,
          path: current.path
        }
      }

      if (!rightChild) {
        return {
          sponsorId: startUserId,
          parentId: current.userId,
          position: 'RIGHT',
          level: current.depth,
          path: current.path
        }
      }

      // Adicionar ambos à fila
      queue.push({
        userId: leftChild.id,
        path: [...current.path, leftChild.name],
        depth: current.depth + 1
      })
      
      queue.push({
        userId: rightChild.id,
        path: [...current.path, rightChild.name],
        depth: current.depth + 1
      })
    }
  }

  throw new Error('Nenhuma posição livre encontrada')
}

/**
 * Encontra a primeira posição disponível na rede seguindo o spillover
 * Função principal para compatibilidade com sistema existente
 */
export async function findSpilloverPosition(
  originalSponsorId: bigint,
  requestedPosition: Position = 'LEFT'
): Promise<SpilloverResult> {
  
  // Função recursiva para buscar posição disponível
  async function searchAvailablePosition(
    currentParentId: bigint,
    targetPosition: Position,
    level: number = 0,
    path: string[] = [],
    originalSponsorId: bigint
  ): Promise<SpilloverResult> {
    
    // Buscar o usuário atual e seus filhos diretos na árvore binária
    const currentUser = await prisma.user.findUnique({
      where: { id: currentParentId },
      include: {
        children: {
          select: {
            id: true,
            name: true,
            position: true
          }
        }
      }
    })

    if (!currentUser) {
      throw new Error(`Usuário ${currentParentId} não encontrado`)
    }

    // Verificar se a posição solicitada está disponível diretamente
    const hasDirectChild = currentUser.children.some(child => child.position === targetPosition)
    
    if (!hasDirectChild) {
      // Posição disponível encontrada!
      return {
        sponsorId: originalSponsorId, // Mantém o patrocinador original
        parentId: currentParentId,    // Pai na árvore binária
        position: targetPosition,
        level,
        path: [...path, currentUser.name]
      }
    }

    // Posição ocupada, precisamos fazer spillover
    // Encontrar o filho que está na posição solicitada
    const childInPosition = currentUser.children.find(child => child.position === targetPosition)
    
    if (!childInPosition) {
      // Isso não deveria acontecer, mas por segurança
      return {
        sponsorId: originalSponsorId,
        parentId: currentParentId,
        position: targetPosition,
        level,
        path: [...path, currentUser.name]
      }
    }

    // Continuar a busca recursivamente no filho da posição solicitada
    return searchAvailablePosition(
      childInPosition.id,
      targetPosition, // Manter sempre a mesma direção
      level + 1,
      [...path, currentUser.name],
      originalSponsorId
    )
  }

  return searchAvailablePosition(originalSponsorId, requestedPosition, 0, [], originalSponsorId)
} 