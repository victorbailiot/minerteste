import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { removeUserFromClube300 } from '@/lib/clube300-service'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, packageId: string }> }
) {
  try {
    const { id, packageId } = await params
    const userId = BigInt(id)
    const userPackageId = BigInt(packageId)

    // Verificar se o pacote existe e pertence ao usuário
    const userPackage = await prisma.userPackage.findFirst({
      where: {
        id: userPackageId,
        userId: userId,
        isActive: true
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

    // Verificar se foi criado há menos de 1 hora
    const activatedAt = new Date(userPackage.activatedAt)
    const now = new Date()
    const timeDiff = now.getTime() - activatedAt.getTime()
    const hoursDiff = timeDiff / (1000 * 3600)

    if (hoursDiff >= 1) {
      return NextResponse.json({
        success: false,
        error: 'Não é possível deletar pacotes criados há mais de 1 hora'
      }, { status: 400 })
    }

    // Usar transação para deletar pacote e transações relacionadas
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buscar transações relacionadas ao pacote
      const whereConditions: any[] = []
      
      // Adicionar transação de pagamento se existir
      if (userPackage.transactionId) {
        whereConditions.push({ id: userPackage.transactionId })
      }
      
      // Adicionar transações de compra relacionadas
      whereConditions.push({
        type: 'PURCHASE',
        description: {
          contains: userPackage.package.name
        },
        createdAt: {
          gte: new Date(userPackage.activatedAt.getTime() - 60000), // 1 minuto antes
          lte: new Date(userPackage.activatedAt.getTime() + 60000)  // 1 minuto depois
        }
      })

      const relatedTransactions = await tx.transaction.findMany({
        where: {
          userId: userId,
          OR: whereConditions
        }
      })

      console.log(`🗑️ Encontradas ${relatedTransactions.length} transações relacionadas ao pacote ${userPackage.package.name}`)

      // 2. Deletar transações relacionadas
      if (relatedTransactions.length > 0) {
        await tx.transaction.deleteMany({
          where: {
            id: {
              in: relatedTransactions.map(t => t.id)
            }
          }
        })
        console.log(`✅ ${relatedTransactions.length} transações deletadas`)
      }

      // 3. Deletar o pacote
      const deletedPackage = await tx.userPackage.delete({
        where: {
          id: userPackageId
        }
      })

      return {
        deletedPackage,
        deletedTransactions: relatedTransactions.length,
        packagePrice: userPackage.package.price.toNumber()
      }
    })

    // 4. Verificar se deve remover do Clube dos 300
    let clube300Removed = false

    if (userPackage.package.clube300Eligible && userPackage.minerId) {
      const minerId = userPackage.minerId

      const remainingEligiblePackages = await prisma.userPackage.count({
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
        const removed = await removeUserFromClube300(userId, minerId)
        if (removed) {
          clube300Removed = true
          console.log(`🚫 Usuário ${userId} removido do Clube dos 300 - não possui mais pacotes elegíveis`)
        }
      } else {
        console.log(`ℹ️ Usuário ${userId} mantido no Clube dos 300 - possui ${remainingEligiblePackages} pacote(s) elegível(eis) restante(s)`)
      }
    }

    // 5. Preparar resposta
    let message = `Pacote ${userPackage.package.name} deletado com sucesso. ${result.deletedTransactions} transações relacionadas também foram removidas.`
    
    if (clube300Removed) {
      message += ` Usuário removido do Clube dos 300.`
    }

    return NextResponse.json({
      success: true,
      message: message,
      data: {
        deletedTransactions: result.deletedTransactions,
        packageName: userPackage.package.name,
        clube300Removed: clube300Removed
      }
    })

  } catch (error) {
    console.error('Erro ao deletar pacote:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
