import { prisma } from './prisma'

export interface PreferredSidePlacementResult {
  parentId: bigint
  position: 'LEFT' | 'RIGHT'
  path: string[]
  depth: number
}

/**
 * Encontra a última posição livre seguindo a preferência do patrocinador
 * Busca recursivamente na direção preferida até encontrar posição vazia
 */
export async function findPreferredSidePlacement(
  sponsorId: bigint
): Promise<PreferredSidePlacementResult> {
  
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

  console.log(`🎯 Aplicando preferência do patrocinador: ${sponsor.name}`)
  console.log(`   PreferredSide: ${sponsor.preferredSide}`)

  // Se não tem preferência definida, usar spillover normal
  if (!sponsor.preferredSide) {
    console.log('⚠️  Patrocinador sem preferência definida - usando spillover normal')
    throw new Error('Patrocinador sem preferência definida')
  }

  // Buscar recursivamente a última posição livre na direção preferida
  const placement = await searchLastAvailablePosition(
    sponsorId,
    sponsor.preferredSide,
    [sponsor.name],
    0
  )

  console.log(`✅ Posição encontrada:`)
  console.log(`   Parent: ${Number(placement.parentId)}`)
  console.log(`   Position: ${placement.position}`)
  console.log(`   Path: ${placement.path.join(' → ')}`)
  console.log(`   Depth: ${placement.depth}`)

  return placement
}

/**
 * Busca recursivamente a última posição livre na direção preferida
 */
async function searchLastAvailablePosition(
  currentUserId: bigint,
  preferredDirection: 'LEFT' | 'RIGHT',
  path: string[],
  depth: number
): Promise<PreferredSidePlacementResult> {
  
  console.log(`🔍 Buscando em: ${path[path.length - 1]} (profundidade ${depth})`)

  // Buscar filhos do usuário atual
  const children = await prisma.user.findMany({
    where: {
      parentId: currentUserId
    },
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

  // Verificar se a posição preferida está vazia
  const preferredChild = preferredDirection === 'LEFT' ? leftChild : rightChild

  if (!preferredChild) {
    // Posição preferida está vazia - esta é a posição!
    console.log(`🎯 Posição ${preferredDirection} vazia encontrada!`)
    
    return {
      parentId: currentUserId,
      position: preferredDirection,
      path,
      depth
    }
  }

  // Posição preferida ocupada - continuar busca recursiva
  console.log(`➡️  Continuando busca em ${preferredChild.name}`)
  
  return await searchLastAvailablePosition(
    preferredChild.id,
    preferredDirection,
    [...path, preferredChild.name],
    depth + 1
  )
}

/**
 * Verifica se um usuário já está posicionado corretamente
 */
export async function verifyPreferredSidePlacement(
  userId: bigint,
  sponsorId: bigint
): Promise<{
  isCorrect: boolean
  currentPlacement: { parentId: bigint | null, position: string | null }
  expectedPlacement: PreferredSidePlacementResult
}> {
  
  // Buscar posição atual do usuário
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      parentId: true,
      position: true
    }
  })

  // Calcular posição esperada
  const expectedPlacement = await findPreferredSidePlacement(sponsorId)

  const isCorrect = Boolean(
    user?.parentId && Number(user.parentId) === Number(expectedPlacement.parentId) &&
    user?.position === expectedPlacement.position
  )

  return {
    isCorrect,
    currentPlacement: {
      parentId: user?.parentId || null,
      position: user?.position || null
    },
    expectedPlacement
  }
}

/**
 * Aplica o posicionamento baseado na preferência do patrocinador
 */
export async function applyPreferredSidePlacement(
  userId: bigint,
  sponsorId: bigint
): Promise<void> {
  
  const placement = await findPreferredSidePlacement(sponsorId)

  await prisma.user.update({
    where: { id: userId },
    data: {
      parentId: placement.parentId,
      position: placement.position,
      sponsorId: sponsorId // Manter sponsor original para bônus
    }
  })

  console.log(`✅ User ${Number(userId)} posicionado corretamente`)
  console.log(`   Parent: ${Number(placement.parentId)}`)
  console.log(`   Position: ${placement.position}`)
} 