import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Gerencia a lógica dos 10 primeiros investidores
 * - Os 2 maiores investimentos ocupam o topo da rede
 * - Os demais são posicionados diretamente sob esses 2
 * - REORGANIZAÇÃO AUTOMÁTICA quando há mudança nos top 2
 */

interface TopInvestor {
  userId: bigint
  totalInvestment: Decimal
  position: 'LEFT' | 'RIGHT'
  userName: string
}

export interface InitialNetworkResult {
  applied: boolean
  message: string
  reorganized?: boolean
  action?: string
}

export interface UserWithPackageValue {
  id: bigint
  name: string
  totalPackageValue: number
  position?: 'LEFT' | 'RIGHT'
  parentId?: bigint
}

/**
 * Verifica se deve usar a lógica dos 10 primeiros
 * @returns boolean - true se ainda está nos primeiros 10 cadastros
 */
export async function shouldUseInitialNetworkLogic(): Promise<boolean> {
  const totalUsers = await prisma.user.count({
    where: {
      role: 'USER' // Não contar admin
    }
  })
  
  return totalUsers < 10
}

/**
 * Obtém os 2 maiores investidores atuais com cálculo CORRETO do investimento total
 * CORRIGIDO: Inclui o novo pacote sendo comprado no cálculo
 */
async function getTop2Investors(excludeUserId?: bigint, additionalInvestment?: { userId: bigint, value: Decimal }): Promise<TopInvestor[]> {
  // Buscar usuários com seus investimentos totais (excluindo o usuário especificado se necessário)
  const whereClause: any = {
    role: 'USER'
  }
  
  if (excludeUserId) {
    whereClause.id = { not: excludeUserId }
  }

  const usersWithInvestments = await prisma.user.findMany({
    where: whereClause,
    include: {
      packages: {
        where: { isActive: true },
        include: {
          package: true
        }
      }
    }
  })

  // Calcular investimento total de cada usuário
  const investorsList = usersWithInvestments.map(user => {
    let totalInvestment = user.packages.reduce((sum, userPackage) => {
      return sum.add(userPackage.package.price)
    }, new Decimal(0))

    // Se é o usuário que está comprando um pacote adicional, somar o novo valor
    if (additionalInvestment && user.id === additionalInvestment.userId) {
      totalInvestment = totalInvestment.add(additionalInvestment.value)
    }

    return {
      userId: user.id,
      totalInvestment,
      position: 'LEFT' as 'LEFT' | 'RIGHT', // Será definido depois
      userName: user.name
    }
  })

  // Se temos o usuário adicional (nova compra), incluir na lista
  if (additionalInvestment && !usersWithInvestments.find(u => u.id === additionalInvestment.userId)) {
    // Buscar dados do usuário
    const newUser = await prisma.user.findUnique({
      where: { id: additionalInvestment.userId },
      include: {
        packages: {
          where: { isActive: true },
          include: {
            package: true
          }
        }
      }
    })

    if (newUser) {
      let totalInvestment = newUser.packages.reduce((sum, userPackage) => {
        return sum.add(userPackage.package.price)
      }, new Decimal(0))
      
      totalInvestment = totalInvestment.add(additionalInvestment.value)

      investorsList.push({
        userId: newUser.id,
        totalInvestment,
        position: 'LEFT' as 'LEFT' | 'RIGHT',
        userName: newUser.name
      })
    }
  }

  // Ordenar por maior investimento
  investorsList.sort((a, b) => {
    return Number(b.totalInvestment.sub(a.totalInvestment))
  })

  // Retornar os top 2
  const top2 = investorsList.slice(0, 2)
  
  // Definir posições LEFT e RIGHT
  if (top2.length >= 1) {
    top2[0].position = 'LEFT'
  }
  if (top2.length >= 2) {
    top2[1].position = 'RIGHT'
  }

  return top2
}

/**
 * Aplica a lógica inicial no processo de compra de pacote
 * CORRIGIDO: Sempre verifica se precisa reorganizar, mesmo para usuários existentes
 */
export async function applyInitialNetworkLogic(
  userId: bigint,
  packageValue: Decimal
): Promise<InitialNetworkResult> {

  ///
  ///DESATIVANDO ESTA REGRA, RETORNANDO SEMPRE false PARA NAO FUNCIONAR
  ///
  return {
    applied: false,
    message: `DESATIVANDO ESTA REGRA, RETORNANDO SEMPRE false PARA NAO FUNCIONAR`
  }
  ///
  
  // Contar total de usuários cadastrados (excluindo Admin)
  const totalUsers = await prisma.user.count({
    where: { role: 'USER' }
  })

  console.log(`🔢 Total de usuários cadastrados: ${totalUsers}`)

  // Se já passou dos 10 primeiros, usar spillover normal
  if (totalUsers > 10) {
    return {
      applied: false,
      message: 'Mais de 10 usuários - usando spillover normal'
    }
  }

  // Lógica dos 10 primeiros cadastros
  console.log(`🎯 Aplicando lógica dos 10 primeiros cadastros...`)

  // Buscar Admin
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (!admin) {
    throw new Error('Admin não encontrado')
  }

  // Se for o primeiro usuário, colocar na posição preferida do Admin
  if (totalUsers === 1) {
    const position = admin?.preferredSide || 'LEFT'
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        sponsorId: admin?.id,
        parentId: admin?.id,
        position: position as 'LEFT' | 'RIGHT'
      }
    })

    return {
      applied: true,
      message: `Primeiro usuário posicionado em ${position} sob Admin`
    }
  }

  // Se for o segundo usuário, colocar no lado oposto
  if (totalUsers === 2) {
    const firstUser = await prisma.user.findFirst({
      where: { 
        role: 'USER',
        parentId: admin?.id 
      }
    })

    const position = firstUser?.position === 'LEFT' ? 'RIGHT' : 'LEFT'
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        sponsorId: admin?.id,
        parentId: admin?.id,
        position: position as 'LEFT' | 'RIGHT'
      }
    })

    return {
      applied: true,
      message: `Segundo usuário posicionado em ${position} sob Admin`
    }
  }

  // Para usuários 3-10: Aplicar regra de reorganização por valor
  if (totalUsers >= 3 && totalUsers <= 10) {
    const reorganizationResult = await applyPackageValueReorganization(userId, packageValue)
    
    if (reorganizationResult.reorganized) {
      return {
        applied: true,
        message: reorganizationResult.message,
        reorganized: true,
        action: reorganizationResult.action
      }
    }
  }

  // Fallback para spillover normal se nenhuma regra especial se aplicou
  return {
    applied: false,
    message: 'Nenhuma regra especial dos 10 primeiros se aplicou'
  }
}

/**
 * Aplica reorganização baseada no valor do pacote (regra dos 10 primeiros)
 */
async function applyPackageValueReorganization(
  newUserId: bigint,
  newPackageValue: Decimal
): Promise<InitialNetworkResult> {
  
  console.log(`💰 Verificando reorganização por valor do pacote...`)

  // Buscar Admin
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  // Calcular valor total dos pacotes dos usuários existentes nas posições TOP 2
  const topUsers = await prisma.user.findMany({
    where: {
      parentId: admin?.id,
      role: 'USER'
    },
    include: {
      packages: {
        include: {
          package: {
            select: { price: true }
          }
        }
      }
    }
  })

  console.log(`🔍 Usuários atualmente nas posições TOP: ${topUsers.length}`)

  // Calcular valores dos pacotes
  const usersWithValues: UserWithPackageValue[] = []

  for (const user of topUsers) {
    const totalValue = user.packages.reduce((sum, userPackage) => 
      sum + Number(userPackage.package.price), 0
    )
    
    usersWithValues.push({
      id: user.id,
      name: user.name,
      totalPackageValue: totalValue,
      position: user.position as 'LEFT' | 'RIGHT',
      parentId: user.parentId || undefined
    })
  }

  // Adicionar novo usuário
  const newUserValue = Number(newPackageValue)
  console.log(`💵 Novo usuário valor: $${newUserValue}`)

  // Verificar se o novo usuário tem valor maior que algum dos TOP 2
  const userToReplace = usersWithValues.find(user => newUserValue > user.totalPackageValue)

  if (!userToReplace) {
    console.log(`📊 Novo usuário não supera valores existentes - spillover normal`)
    return {
      applied: false,
      message: 'Valor do pacote não justifica reorganização'
    }
  }

  console.log(`🔄 Reorganização necessária: Novo usuário ($${newUserValue}) > ${userToReplace.name} ($${userToReplace.totalPackageValue})`)

  // Escolher posição baseada na preferência do Admin
  const targetPosition = admin?.preferredSide === 'RIGHT' ? 'RIGHT' : 'LEFT'
  
  // Verificar se já existe alguém na posição preferida
  const userInPreferredPosition = usersWithValues.find(u => u.position === targetPosition)
  
  let finalPosition: 'LEFT' | 'RIGHT' = targetPosition
  let userToRebate = userInPreferredPosition

  // Se posição preferida está ocupada por usuário com valor menor, usar essa posição
  if (userInPreferredPosition && newUserValue > userInPreferredPosition.totalPackageValue) {
    finalPosition = targetPosition
    userToRebate = userInPreferredPosition
  } else {
    // Usar a outra posição
    finalPosition = targetPosition === 'LEFT' ? 'RIGHT' : 'LEFT'
    userToRebate = usersWithValues.find(u => u.position === finalPosition)
  }

  if (!userToRebate) {
    // Posição está vazia, apenas posicionar
    await prisma.user.update({
      where: { id: newUserId },
      data: {
        sponsorId: admin?.id,
        parentId: admin?.id,
        position: finalPosition
      }
    })

    return {
      applied: true,
      message: `Usuário posicionado em ${finalPosition} (posição vazia)`,
      reorganized: true,
      action: `Posicionado em ${finalPosition}`
    }
  }

  // Executar reorganização: novo usuário assume posição, usuário atual é rebaixado
  console.log(`🔄 Executando reorganização:`)
  console.log(`   ${userToRebate.name} (${finalPosition}) → Filho do novo usuário`)
  console.log(`   Novo usuário → ${finalPosition} sob Admin`)

  // 1. Novo usuário assume a posição
  await prisma.user.update({
    where: { id: newUserId },
    data: {
      sponsorId: admin?.id,
      parentId: admin?.id,
      position: finalPosition
    }
  })

  // 2. Usuário existente é rebaixado
  const rebatePosition: 'LEFT' | 'RIGHT' = admin?.preferredSide || 'LEFT'
  await prisma.user.update({
    where: { id: userToRebate.id },
    data: {
      parentId: newUserId,
      // sponsorId mantém o original para bônus
      position: rebatePosition
    }
  })

  return {
    applied: true,
    message: `Reorganização aplicada: ${userToRebate.name} rebaixado, novo usuário assume ${finalPosition}`,
    reorganized: true,
    action: `Usuário ${userToRebate.name} rebaixado`
  }
}


export async function getInitialNetworkStats() {
  const totalUsers = await prisma.user.count({
    where: { role: 'USER' }
  })

  const shouldUseLogic = totalUsers < 10

  const top2 = await getTop2Investors()

  return {
    totalUsers,
    shouldUseInitialLogic: shouldUseLogic,
    top2Investors: top2.map(investor => ({
      userId: Number(investor.userId),
      userName: investor.userName,
      totalInvestment: Number(investor.totalInvestment),
      position: investor.position
    }))
  }
}

/**
 * Busca os 2 maiores investidores entre os 10 primeiros
 */
export async function getTopTwoInvestors(): Promise<UserWithPackageValue[]> {
  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    include: {
      packages: {
        include: {
          package: {
            select: { price: true }
          }
        }
      }
    },
    take: 10, // Apenas os 10 primeiros
    orderBy: { createdAt: 'asc' }
  })

  const usersWithValues = users.map(user => ({
    id: user.id,
    name: user.name,
    totalPackageValue: user.packages.reduce((sum, userPackage) => 
      sum + Number(userPackage.package.price), 0
    )
  }))

  // Ordenar por valor decrescente e pegar os 2 maiores
  return usersWithValues
    .sort((a, b) => b.totalPackageValue - a.totalPackageValue)
    .slice(0, 2)
}
