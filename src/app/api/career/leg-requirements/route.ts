import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface LegRequirementResult {
  legSlot: number
  requiredCareerId: number
  requiredCareerName: string
  includeIndirects: boolean
  minOccurrences: number
  isSatisfied: boolean
  satisfiedCount: number
}

interface DirectsRequirementResult {
  requiredDirects: number
  currentDirectsWithPackage: number
  isSatisfied: boolean
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    const { careerLevelId } = await request.json()

    if (!careerLevelId) {
      return NextResponse.json(
        { error: 'careerLevelId é obrigatório' },
        { status: 400 }
      )
    }

    console.log(`🔍 Verificando requisitos de pernas para usuário ${Number(userId)}, nível ${careerLevelId}`)

    // Buscar informações do nível de carreira
    const careerLevel = await prisma.careerLevel.findUnique({
      where: { id: BigInt(careerLevelId) },
      select: { 
        id: true, 
        name: true, 
        requiredDirects: true 
      }
    })

    if (!careerLevel) {
      return NextResponse.json(
        { error: 'Nível de carreira não encontrado' },
        { status: 404 }
      )
    }

    console.log(`📋 Nível: ${careerLevel.name} - Requisito de diretos com pacote: ${careerLevel.requiredDirects}`)

    // Buscar requisitos do nível
    const legRequirements = await prisma.careerLevelLegRequirement.findMany({
      where: { careerId: BigInt(careerLevelId) },
      include: {
        requiredCareer: { select: { id: true, name: true, requiredPoints: true } }
      },
      orderBy: { legSlot: 'asc' }
    })

    // Buscar diretos do usuário mesmo se não houver leg requirements
    const directs = await prisma.user.findMany({
      where: { sponsorId: userId },
      select: { id: true }
    })

    // Contar quantos diretos têm pacote ativo
    const directsWithActivePackage = await prisma.userPackage.groupBy({
      by: ['userId'],
      where: {
        userId: { in: directs.map(d => d.id) },
        isActive: true
      },
      _count: true
    })

    const directsWithPackageCount = directsWithActivePackage.length

    console.log(`👥 Diretos encontrados: ${directs.length}`)
    console.log(`📦 Diretos com pacote ativo: ${directsWithPackageCount} de ${careerLevel.requiredDirects} necessários`)

    const directsRequirement: DirectsRequirementResult = {
      requiredDirects: careerLevel.requiredDirects,
      currentDirectsWithPackage: directsWithPackageCount,
      isSatisfied: directsWithPackageCount >= careerLevel.requiredDirects
    }

    if (legRequirements.length === 0) {
      return NextResponse.json({
        success: true,
        directsRequirement,
        legRequirements: []
      })
    }

    if (directs.length === 0) {
      return NextResponse.json({
        success: true,
        directsRequirement,
        legRequirements: legRequirements.map(req => ({
          legSlot: req.legSlot,
          requiredCareerId: Number(req.requiredCareerId),
          requiredCareerName: req.requiredCareer?.name || '',
          includeIndirects: req.includeIndirects,
          minOccurrences: req.minOccurrences,
          isSatisfied: false,
          satisfiedCount: 0
        }))
      })
    }

    // Pré-carregar ranking dos níveis para comparação
    const levels = await prisma.careerLevel.findMany({
      where: { isActive: true },
      select: { id: true, requiredPoints: true }
    })
    const pointsByLevel = new Map<string, number>()
    for (const l of levels) {
      pointsByLevel.set(String(l.id), l.requiredPoints)
    }

    // Helper: Buscar careerLevelId atual de usuários
    const getUserCurrentCareerLevel = async (userIds: bigint[]): Promise<Map<string, bigint | null>> => {
      if (userIds.length === 0) return new Map()
      
      const latestCareers = await prisma.$queryRaw<Array<{ userId: bigint, careerId: bigint }>>`
        SELECT DISTINCT ON ("userId") "userId", "careerId"
        FROM unilevel_user_career
        WHERE "userId" = ANY(${userIds}::bigint[])
        ORDER BY "userId", "graduatedAt" DESC
      `
      
      const careerMap = new Map<string, bigint | null>()
      for (const userId of userIds) {
        careerMap.set(String(userId), null)
      }
      for (const record of latestCareers) {
        careerMap.set(String(record.userId), record.careerId)
      }
      
      return careerMap
    }

    // Coletar todos os userIds da rede para buscar careers de uma vez
    const collectNetworkUserIds = async (rootUserId: bigint, maxDepth: number): Promise<bigint[]> => {
      const userIds: bigint[] = []
      const queue: Array<{ userId: bigint, depth: number }> = [{ userId: rootUserId, depth: 0 }]
      const visited = new Set<string>()

      while (queue.length > 0) {
        const { userId: current, depth } = queue.shift()!
        const key = String(current)
        if (visited.has(key) || depth >= maxDepth) continue
        visited.add(key)
        userIds.push(current)

        const children = await prisma.unilevelUser.findMany({
          where: { sponsorId: current },
          select: { userId: true }
        })

        for (const child of children) {
          queue.push({ userId: child.userId, depth: depth + 1 })
        }
      }

      return userIds
    }

    // Função para contar quantos usuários atendem o requisito (sem buscar nomes)
    const countLegSatisfies = async (directUserId: bigint, req: any): Promise<number> => {
      const requiredPoints = pointsByLevel.get(String(req.requiredCareerId)) || Number.MAX_SAFE_INTEGER

      // Coletar todos os userIds da subárvore (direto + indiretos se necessário)
      let networkUserIds: bigint[] = [directUserId]
      if (req.includeIndirects) {
        networkUserIds = await collectNetworkUserIds(directUserId, 3) // Limitar a 3 níveis
      }

      // Buscar careers de todos de uma vez
      const careerMap = await getUserCurrentCareerLevel(networkUserIds)

      let count = 0
      for (const userId of networkUserIds) {
        const careerId = careerMap.get(String(userId))
        if (careerId) {
          const points = pointsByLevel.get(String(careerId)) || 0
          if (points >= requiredPoints) {
            count++
          }
        }
      }

      return count
    }

    // Agrupar requisitos por legSlot
    const bySlot = new Map<number, any[]>()
    for (const req of legRequirements) {
      const list = bySlot.get(req.legSlot) || []
      list.push(req)
      bySlot.set(req.legSlot, list)
    }

    // Construir mapa slot -> pernas candidatas (com info de quais diretos atendem)
    const slotCandidates = new Map<number, Array<{ userId: bigint; userName: string; capacity: number }>>()
    
    for (const [slot, reqs] of bySlot.entries()) {
      const candidates: Array<{ userId: bigint; userName: string; capacity: number }> = []
      
      // Log dos requisitos do slot
      console.log(`\n📍 Analisando Slot ${slot}:`)
      for (const req of reqs) {
        console.log(`   Requisito: ${req.requiredCareer?.name || 'Desconhecido'} (mín: ${req.minOccurrences}, indiretos: ${req.includeIndirects ? 'SIM' : 'NÃO'})`)
      }
      
      for (const direct of directs) {
        // Buscar nome do usuário para exibir
        const user = await prisma.user.findUnique({
          where: { id: direct.id },
          select: { name: true }
        })
        const userName = user?.name || 'Desconhecido'
        
        // Para o slot, todas as requirements devem ser satisfeitas na mesma perna
        let capacityForLeg = Infinity
        let ok = true
        
        console.log(`   🔍 Verificando direto: ${userName}`)
        
        for (const req of reqs) {
          const satisfiedCount = await countLegSatisfies(direct.id, req)
          console.log(`      ${req.requiredCareer?.name || 'Desconhecido'}: ${satisfiedCount} encontrados (precisa ${req.minOccurrences})`)
          
          if (satisfiedCount < req.minOccurrences) {
            ok = false
            console.log(`      ❌ NÃO atende o requisito`)
            break
          }
          capacityForLeg = Math.min(capacityForLeg, Math.floor(satisfiedCount / req.minOccurrences))
        }
        
        if (ok && capacityForLeg > 0) {
          console.log(`      ✅ ATENDE todos os requisitos (capacidade: ${capacityForLeg})`)
          candidates.push({ 
            userId: direct.id, 
            userName,
            capacity: capacityForLeg 
          })
        }
      }
      
      slotCandidates.set(slot, candidates)
      console.log(`   📊 Total de candidatos para Slot ${slot}: ${candidates.length}`)
    }

    // Alocar pernas distintas para cada slot (ordenado por prioridade: maior nível primeiro)
    // Ordenar slots pelo maior requiredPoints do requisito (Ouro > Prata > Cobre)
    const slotsOrdered = Array.from(slotCandidates.entries()).sort((a, b) => {
      // Buscar o maior requiredPoints de cada slot
      const reqsA = bySlot.get(a[0]) || []
      const reqsB = bySlot.get(b[0]) || []
      
      let maxPointsA = 0
      let maxPointsB = 0
      
      for (const req of reqsA) {
        const points = req.requiredCareer?.requiredPoints || 0
        maxPointsA = Math.max(maxPointsA, points)
      }
      
      for (const req of reqsB) {
        const points = req.requiredCareer?.requiredPoints || 0
        maxPointsB = Math.max(maxPointsB, points)
      }
      
      // Ordenar em ordem decrescente (maior primeiro)
      return maxPointsB - maxPointsA
    })
    
    const usedLegs = new Set<string>()
    const legAllocation = new Map<number, { userId: bigint; userName: string; capacity: number } | null>()
    
    console.log('🔍 Iniciando alocação de pernas distintas (ordenado por prioridade: maior nível primeiro):')
    for (const [slot, candidates] of slotCandidates.entries()) {
      const reqs = bySlot.get(slot) || []
      const maxPoints = Math.max(...reqs.map(req => req.requiredCareer?.requiredPoints || 0))
      const maxLevelName = reqs.find(req => (req.requiredCareer?.requiredPoints || 0) === maxPoints)?.requiredCareer?.name || 'Desconhecido'
      console.log(`  Slot ${slot} (${maxLevelName}, ${maxPoints} pts): ${candidates.length} candidatos → [${candidates.map(c => c.userName).join(', ')}]`)
    }
    
    for (const [slot, candidates] of slotsOrdered) {
      const available = candidates.find(c => !usedLegs.has(String(c.userId)) && c.capacity > 0)
      
      if (available) {
        usedLegs.add(String(available.userId))
        legAllocation.set(slot, available)
        const reqs = bySlot.get(slot) || []
        const maxLevelName = reqs[0]?.requiredCareer?.name || 'Desconhecido'
        console.log(`  ✅ Slot ${slot} (${maxLevelName}) alocado para: ${available.userName} (ID: ${available.userId})`)
      } else {
        legAllocation.set(slot, null)
        const reqs = bySlot.get(slot) || []
        const maxLevelName = reqs[0]?.requiredCareer?.name || 'Desconhecido'
        console.log(`  ❌ Slot ${slot} (${maxLevelName}): NENHUMA perna disponível (todas já foram alocadas ou não atendem)`)
      }
    }
    
    console.log(`📊 Total de pernas distintas alocadas: ${usedLegs.size} de ${directs.length} diretos`)

    // Construir resultados com base na alocação
    const results: LegRequirementResult[] = []
    
    console.log('\n📋 Resultados Finais por Slot:')
    
    for (const req of legRequirements) {
      const allocated = legAllocation.get(req.legSlot)
      const isSatisfied = allocated !== null
      
      // Contar total de membros qualificados no direto alocado (se houver)
      let satisfiedCount = 0
      if (allocated) {
        satisfiedCount = await countLegSatisfies(allocated.userId, req)
        console.log(`  Slot ${req.legSlot} - Career: ${req.requiredCareer?.name || 'Desconhecido'} → Alocado para: ${allocated.userName} (${satisfiedCount} membros qualificados)`)
      } else {
        console.log(`  Slot ${req.legSlot} - Career: ${req.requiredCareer?.name || 'Desconhecido'} → ❌ Não satisfeito`)
      }

      results.push({
        legSlot: req.legSlot,
        requiredCareerId: Number(req.requiredCareerId),
        requiredCareerName: req.requiredCareer?.name || '',
        includeIndirects: req.includeIndirects,
        minOccurrences: req.minOccurrences,
        isSatisfied,
        satisfiedCount
      })
    }

    console.log(`✅ Verificação de requisitos concluída para nível ${careerLevelId}`)
    console.log(`📊 Alocação de pernas: ${usedLegs.size} pernas distintas alocadas de ${directs.length} diretos`)
    console.log(`📦 Requisito de diretos: ${directsRequirement.isSatisfied ? '✅ SATISFEITO' : '❌ NÃO SATISFEITO'} (${directsWithPackageCount}/${careerLevel.requiredDirects})`)

    return NextResponse.json({
      success: true,
      directsRequirement,
      legRequirements: results
    })

  } catch (error) {
    console.error('❌ Erro ao verificar requisitos de pernas:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
