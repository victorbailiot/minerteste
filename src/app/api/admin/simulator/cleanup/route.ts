import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userIds } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Lista de IDs de usuários é obrigatória'
      }, { status: 400 })
    }

    // Validar se todos os IDs são válidos
    const userIdsAsBigInt = userIds.map(id => BigInt(id))
    
    // Verificar se os usuários existem e são usuários de teste
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIdsAsBigInt },
        email: { contains: '@exemplo.com' } // Filtro de segurança para usuários de teste
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum usuário de teste encontrado'
      }, { status: 404 })
    }

    // Verificar se há usuários admin na lista
    const adminUsers = users.filter(user => user.role === 'ADMIN')
    if (adminUsers.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Não é possível deletar usuários administradores'
      }, { status: 403 })
    }

    let deletedCount = 0
    const deletedUsers: string[] = []

    // Deletar cada usuário em uma transação separada para evitar falhas em cascata
    for (const user of users) {
      try {
        await prisma.$transaction(async (tx) => {
          // Deletar transações do usuário
          await tx.transaction.deleteMany({
            where: { userId: user.id }
          })

          // Deletar pacotes do usuário
          await tx.userPackage.deleteMany({
            where: { userId: user.id }
          })

          // Deletar histórico de pontos do usuário
          await tx.userPointsHistory.deleteMany({
            where: { userId: user.id }
          })

          // Deletar pontos onde o usuário é a fonte
          await tx.userPointsHistory.deleteMany({
            where: { sourceUserId: user.id }
          })

          // Deletar ciclos do usuário
          await tx.cycle.deleteMany({
            where: { userId: user.id }
          })

          // Deletar ativações do usuário
          await tx.userActivation.deleteMany({
            where: { userId: user.id }
          })

          // Deletar contratos do usuário
          await tx.contract.deleteMany({
            where: { userId: user.id }
          })

          // Deletar distribuições de lucro do usuário
          await tx.profitDistribution.deleteMany({
            where: { userId: user.id }
          })

          // Remover referências como patrocinador
          await tx.user.updateMany({
            where: { sponsorId: user.id },
            data: { sponsorId: null }
          })

          // Remover referências como pai na árvore
          await tx.user.updateMany({
            where: { parentId: user.id },
            data: { parentId: null, position: undefined }
          })

          // Finalmente, deletar o usuário
          await tx.user.delete({
            where: { id: user.id }
          })
        })

        deletedCount++
        deletedUsers.push(user.name)
        
        console.log(`✅ Usuário de teste deletado: ${user.name} (ID: ${user.id})`)
        
      } catch (error) {
        console.error(`❌ Erro ao deletar usuário ${user.name}:`, error)
        // Continuar com próximo usuário
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} usuários de teste deletados com sucesso`,
      data: {
        deletedCount,
        deletedUsers,
        requestedCount: userIds.length
      }
    })

  } catch (error) {
    console.error('Erro ao limpar usuários de teste:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// Método GET para verificar usuários de teste existentes
export async function GET(request: NextRequest) {
  try {
    const testUsers = await prisma.user.findMany({
      where: {
        email: { contains: '@exemplo.com' }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        sponsorId: true,
        packages: {
          select: {
            id: true,
            isActive: true,
            package: {
              select: {
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedUsers = testUsers.map(user => ({
      id: Number(user.id),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      sponsorId: user.sponsorId ? Number(user.sponsorId) : null,
      packages: user.packages.map(pkg => ({
        id: Number(pkg.id),
        name: pkg.package.name,
        price: Number(pkg.package.price),
        isActive: pkg.isActive
      }))
    }))

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      count: testUsers.length
    })

  } catch (error) {
    console.error('Erro ao buscar usuários de teste:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 