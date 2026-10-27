/**
 * Função de debug para investigar problemas com o Clube dos 300
 */

import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Debug completo da adição ao Clube dos 300
 */
export async function debugClube300Addition(
  userId: bigint,
  packagePrice: number
): Promise<{
  success: boolean
  steps: Array<{
    step: string
    success: boolean
    data?: any
    error?: string
  }>
}> {
  const steps: Array<{
    step: string
    success: boolean
    data?: any
    error?: string
  }> = []

  try {
    console.log(`🔍 DEBUG: Iniciando debug para usuário ${Number(userId)}, preço R$ ${packagePrice}`)

    // Step 1: Verificar se há pacote elegível pelo campo clube300Eligible
    const eligiblePackageInSystem = await prisma.package.findFirst({
      where: { isActive: true, clube300Eligible: true, price: packagePrice },
      select: { id: true, name: true, clube300Eligible: true }
    })
    const isEligible = !!eligiblePackageInSystem

    steps.push({
      step: 'Verificar pacote elegível (clube300Eligible)',
      success: isEligible,
      data: { packagePrice, isEligible, package: eligiblePackageInSystem }
    })

    if (!isEligible) {
      return { success: false, steps }
    }

    // Step 2: Verificar se já é membro (em qualquer mineradora)
    const existingMembers = await prisma.clube300Member.findMany({
      where: { userId, isActive: true },
      include: {
        user: {
          select: { name: true }
        }
      },
      take: 1
    })
    const existingMember = existingMembers[0] ?? null

    steps.push({
      step: 'Verificar se já é membro',
      success: !existingMember,
      data: existingMember ? {
        memberNumber: existingMember.memberNumber,
        isActive: existingMember.isActive,
        userName: existingMember.user.name
      } : null
    })

    if (existingMember) {
      return { success: false, steps }
    }

    // Step 3: Verificar se usuário existe e está ativo
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        isActive: true
      }
    })

    steps.push({
      step: 'Verificar usuário existe e ativo',
      success: !!(user && user.isActive),
      data: user ? {
        id: Number(user.id),
        name: user.name,
        isActive: user.isActive
      } : null
    })

    if (!user || !user.isActive) {
      return { success: false, steps }
    }

    // Step 4: Buscar UserPackages ativos do usuário
    const userPackages = await prisma.userPackage.findMany({
      where: {
        userId,
        isActive: true,
        isUnilevel: true
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            price: true,
            isUnilevel: true,
            clube300Eligible: true,
            clube300Cotas: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    steps.push({
      step: 'Buscar UserPackages ativos',
      success: userPackages.length > 0,
      data: {
        totalPackages: userPackages.length,
        packages: userPackages.map(up => ({
          id: Number(up.id),
          packageId: Number(up.packageId),
          packageName: up.package.name,
          packagePrice: up.package.price.toNumber(),
          isUnilevel: up.isUnilevel,
          createdAt: up.createdAt,
          activatedAt: up.activatedAt
        }))
      }
    })

    // Step 5: Buscar pacotes elegíveis do usuário
    const packagesEligible = userPackages.filter(up => up.package.clube300Eligible)

    steps.push({
      step: 'Buscar pacotes elegíveis do usuário (clube300Eligible)',
      success: packagesEligible.length > 0,
      data: {
        foundPackages: packagesEligible.length,
        packages: packagesEligible.map(up => ({
          id: Number(up.id),
          packageId: Number(up.packageId),
          packageName: up.package.name,
          packagePrice: up.package.price.toNumber(),
          isUnilevel: up.isUnilevel,
          createdAt: up.createdAt,
          activatedAt: up.activatedAt
        }))
      }
    })

    if (packagesEligible.length === 0) {
      return { success: false, steps }
    }

    // Step 7: Verificar vagas no Clube dos 300
    const currentMembersCount = await prisma.clube300Member.count({
      where: { isActive: true }
    })

    const hasSpace = currentMembersCount < 300
    steps.push({
      step: 'Verificar vagas no Clube dos 300',
      success: hasSpace,
      data: {
        currentMembers: currentMembersCount,
        maxMembers: 300,
        hasSpace
      }
    })

    if (!hasSpace) {
      return { success: false, steps }
    }

    // Step 8: Tentar adicionar ao clube
    const userPackage = packagesEligible[0]
    const cotas = userPackage.package.clube300Cotas

    if (!userPackage.minerId) {
      steps.push({
        step: 'Adicionar ao Clube dos 300',
        success: false,
        error: 'UserPackage sem minerId associado'
      })
      return { success: false, steps }
    }

    const minerId = userPackage.minerId

    // Usar transação para garantir que o memberNumber seja único
    const newMember = await prisma.$transaction(async (tx) => {
      // Buscar o maior memberNumber atual para evitar conflitos
      const maxMember = await tx.clube300Member.findFirst({
        where: { isActive: true, minerId },
        orderBy: { memberNumber: 'desc' },
        select: { memberNumber: true }
      })

      const nextMemberNumber = (maxMember?.memberNumber || 0) + 1

      // Verificar novamente se há vagas dentro da transação
      const currentCount = await tx.clube300Member.count({
        where: { isActive: true, minerId }
      })

      if (currentCount >= 300) {
        throw new Error('Clube dos 300 lotado')
      }

      // Adicionar ao clube
      const member = await tx.clube300Member.create({
        data: {
          userId,
          userPackageId: userPackage.id,
          minerId,
          memberNumber: nextMemberNumber,
          cotas,
          isActive: true
        }
      })

      return member
    })

    steps.push({
      step: 'Adicionar ao Clube dos 300',
      success: true,
      data: {
        memberId: Number(newMember.id),
        memberNumber: newMember.memberNumber,
        cotas,
        userPackageId: Number(userPackage.id)
      }
    })

    console.log(`✅ DEBUG: Usuário ${Number(userId)} adicionado com sucesso ao Clube dos 300 como membro #${newMember.memberNumber}`)
    return { success: true, steps }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    steps.push({
      step: 'Erro geral',
      success: false,
      error: errorMessage
    })

    console.error(`❌ DEBUG: Erro ao adicionar usuário ao Clube dos 300:`, error)
    return { success: false, steps }
  }
}

/**
 * Verificar status atual do usuário no Clube dos 300
 */
export async function checkUserClube300Status(userId: bigint): Promise<{
  isMember: boolean
  memberData?: any
  userPackages: any[]
  eligiblePackages: any[]
}> {
  try {
    // Verificar se é membro (em qualquer mineradora; retorna o mais recente)
    const memberDataList = await prisma.clube300Member.findMany({
      where: { userId, isActive: true },
      include: {
        user: {
          select: { name: true }
        },
        userPackage: {
          include: {
            package: {
              select: { name: true, price: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    })
    const memberData = memberDataList[0] ?? null

    const userPackages = await prisma.userPackage.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            price: true,
            isUnilevel: true,
            clube300Eligible: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Filtrar pacotes elegíveis pelo campo clube300Eligible
    const eligiblePackages = userPackages.filter(up => up.package.clube300Eligible && up.isUnilevel)

    return {
      isMember: !!memberData,
      memberData: memberData ? {
        memberNumber: memberData.memberNumber,
        cotas: memberData.cotas,
        isActive: memberData.isActive,
        userName: memberData.user.name,
        packageName: memberData.userPackage.package.name,
        packagePrice: memberData.userPackage.package.price.toNumber()
      } : null,
      userPackages: userPackages.map(up => ({
        id: Number(up.id),
        packageId: Number(up.packageId),
        packageName: up.package.name,
        packagePrice: up.package.price.toNumber(),
        isUnilevel: up.isUnilevel,
        isActive: up.isActive,
        createdAt: up.createdAt,
        activatedAt: up.activatedAt
      })),
      eligiblePackages: eligiblePackages.map(up => ({
        id: Number(up.id),
        packageId: Number(up.packageId),
        packageName: up.package.name,
        packagePrice: up.package.price.toNumber(),
        isUnilevel: up.isUnilevel,
        createdAt: up.createdAt,
        activatedAt: up.activatedAt
      }))
    }

  } catch (error) {
    console.error('Erro ao verificar status do Clube dos 300:', error)
    throw error
  }
}

