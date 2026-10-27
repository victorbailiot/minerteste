import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addUserToClube300, removeUserFromClube300 } from '@/lib/clube300-service'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, packageId: string }> }
) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const currentUserId = BigInt(user.id)
    if (!await hasPermission(currentUserId, 'packages.update')) {
      return NextResponse.json({ error: 'Sem permissão para gerenciar pacotes' }, { status: 403 })
    }

    const { id, packageId } = await params
    const userId = BigInt(id)
    const userPackageId = BigInt(packageId)

    // Verificar se o pacote existe e pertence ao usuário
    const userPackage = await prisma.userPackage.findFirst({
      where: {
        id: userPackageId,
        userId: userId
      },
      include: {
        package: true
      }
    })

    if (!userPackage) {
      return NextResponse.json({
        success: false,
        error: 'Pacote não encontrado ou não pertence ao usuário'
      }, { status: 404 })
    }

    // Alternar status do pacote
    const newStatus = !userPackage.isActive
    
    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      // 1. Atualizar status do pacote
      const updatedPackage = await tx.userPackage.update({
        where: {
          id: userPackageId
        },
        data: {
          isActive: newStatus,
          updatedAt: new Date()
        }
      })

      // 2. Se desativando um pacote elegível para o Clube dos 300, verificar se deve remover do clube
      if (!newStatus && userPackage.package.clube300Eligible && userPackage.minerId) {
        const minerId = userPackage.minerId

        const remainingEligiblePackages = await tx.userPackage.count({
          where: {
            userId: userId,
            minerId: minerId,
            isActive: true,
            isUnilevel: true,
            package: {
              clube300Eligible: true
            }
          }
        })

        if (remainingEligiblePackages === 0) {
          const removedFromClube = await removeUserFromClube300(userId, minerId)
          if (removedFromClube) {
            console.log(`🚫 Usuário ${userId} removido do Clube dos 300 da mineradora ${Number(minerId)} - pacote ${userPackage.package.name} desativado`)
          }
        } else {
          console.log(`ℹ️ Usuário ${userId} mantido no Clube dos 300 - possui ${remainingEligiblePackages} pacote(s) elegível(eis) restante(s)`)
        }
      }

      // 3. Se ativando um pacote elegível para o Clube dos 300, adicionar ao clube
      if (newStatus && userPackage.package.clube300Eligible && userPackage.minerId) {
        const minerId = userPackage.minerId
        const addedToClube = await addUserToClube300(userId, userPackage.package.id, minerId)
        if (addedToClube) {
          console.log(`🏆 Usuário ${userId} adicionado ao Clube dos 300 da mineradora ${Number(minerId)} - ${userPackage.package.name}`)
        } else {
          console.log(`⚠️ Não foi possível adicionar usuário ${userId} ao Clube dos 300 (pode estar lotado ou já ser membro)`)
        }
      }

      return {
        updatedPackage,
        packagePrice: userPackage.package.price.toNumber()
      }
    })

    const action = newStatus ? 'ativado' : 'desativado'
    const packageName = userPackage.package.name

    return NextResponse.json({
      success: true,
      message: `Pacote ${packageName} ${action} com sucesso`,
      data: {
        packageName: packageName,
        isActive: newStatus,
        packagePrice: result.packagePrice
      }
    })

  } catch (error) {
    console.error('Erro ao alterar status do pacote:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
