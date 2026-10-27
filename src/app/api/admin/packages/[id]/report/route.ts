import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'packages.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar pacotes' }, { status: 403 })
    }

    const { id } = await params
    const packageId = BigInt(id)

    // Buscar o pacote
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        points: true,
        isActive: true,
        createdAt: true
      }
    })

    if (!pkg) {
      return NextResponse.json(
        { error: 'Pacote não encontrado' },
        { status: 404 }
      )
    }

    // Buscar apenas os UserPackages ativos deste pacote
    // IMPORTANTE: Usar os mesmos critérios da divisão de lucros para consistência
    // - isActive: true
    // - isUnilevel: true (apenas pacotes unilevel participam da divisão)
    // - expiresAt: null OU expiresAt > data_atual (não expirados)
    const now = new Date()
    const userPackages = await prisma.userPackage.findMany({
      where: {
        packageId: packageId,
        isActive: true,
        isUnilevel: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            isActive: true
          }
        }
      }
    })

    // Contar usuários únicos (todos os pacotes retornados já são ativos)
    const uniqueUserIds = new Set(userPackages.map(up => up.userId.toString()))
    const uniqueUsersCount = uniqueUserIds.size

    // Contar pacotes ativos (já filtrados na query)
    const activePackagesCount = userPackages.length

    // Contar pacotes inativos (buscar separadamente para estatísticas)
    const inactivePackagesCount = await prisma.userPackage.count({
      where: {
        packageId: packageId,
        OR: [
          { isActive: false },
          { isUnilevel: false },
          { 
            AND: [
              { expiresAt: { not: null } },
              { expiresAt: { lte: now } }
            ]
          }
        ]
      }
    })

    // Contar usuários únicos com pacotes ativos (todos já são ativos)
    const activeUniqueUsersCount = uniqueUsersCount

    // Estatísticas de ciclos completados
    const totalCyclesCompleted = userPackages.reduce((sum, up) => sum + up.completedCycles, 0)
    const avgCyclesPerPackage = userPackages.length > 0 
      ? totalCyclesCompleted / userPackages.length 
      : 0

    // Estatísticas por período (últimos 30 dias)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const packagesLast30Days = userPackages.filter(
      up => new Date(up.createdAt) >= thirtyDaysAgo
    ).length

    const uniqueUsersLast30Days = new Set(
      userPackages
        .filter(up => new Date(up.createdAt) >= thirtyDaysAgo)
        .map(up => up.userId.toString())
    ).size

    // Estatísticas por período (últimos 7 dias)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const packagesLast7Days = userPackages.filter(
      up => new Date(up.createdAt) >= sevenDaysAgo
    ).length

    const uniqueUsersLast7Days = new Set(
      userPackages
        .filter(up => new Date(up.createdAt) >= sevenDaysAgo)
        .map(up => up.userId.toString())
    ).size

    // Estatísticas de expiração
    // Buscar TODOS os pacotes (ativos e inativos) para estatísticas de expiração
    const allUserPackages = await prisma.userPackage.findMany({
      where: {
        packageId: packageId
      },
      select: {
        isActive: true,
        expiresAt: true
      }
    })

    const expiredPackages = allUserPackages.filter(
      up => up.expiresAt && new Date(up.expiresAt) < now
    ).length

    const packagesExpiringSoon = userPackages.filter(
      up => {
        if (!up.expiresAt) return false
        const expiresAt = new Date(up.expiresAt)
        const daysUntilExpiry = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0
      }
    ).length

    // Distribuição de pacotes por usuário (quantos usuários têm 1, 2, 3+ pacotes)
    const packagesPerUser = new Map<string, number>()
    userPackages.forEach(up => {
      const userIdStr = up.userId.toString()
      packagesPerUser.set(userIdStr, (packagesPerUser.get(userIdStr) || 0) + 1)
    })

    const usersWithOnePackage = Array.from(packagesPerUser.values()).filter(count => count === 1).length
    const usersWithMultiplePackages = Array.from(packagesPerUser.values()).filter(count => count > 1).length
    const maxPackagesPerUser = packagesPerUser.size > 0 
      ? Math.max(...Array.from(packagesPerUser.values()))
      : 0

    // Lista de usuários com múltiplos pacotes
    const usersWithMultiplePackagesList = Array.from(packagesPerUser.entries())
      .filter(([_, count]) => count > 1)
      .map(([userIdStr, count]) => {
        const user = userPackages.find(up => up.userId.toString() === userIdStr)?.user
        return {
          userId: userIdStr,
          userName: user?.name || 'N/A',
          userEmail: user?.email || 'N/A',
          packagesCount: count
        }
      })
      .sort((a, b) => b.packagesCount - a.packagesCount)

    // Lista de usuários com 1 pacote
    const usersWithOnePackageList = Array.from(packagesPerUser.entries())
      .filter(([_, count]) => count === 1)
      .map(([userIdStr, count]) => {
        const user = userPackages.find(up => up.userId.toString() === userIdStr)?.user
        return {
          userId: userIdStr,
          userName: user?.name || 'N/A',
          userEmail: user?.email || 'N/A',
          packagesCount: count
        }
      })
      .sort((a, b) => a.userName.localeCompare(b.userName))

    // Formatar resposta
    return NextResponse.json({
      success: true,
      data: {
        package: {
          id: Number(pkg.id),
          name: pkg.name,
          slug: pkg.slug,
          description: pkg.description,
          price: Number(pkg.price),
          points: pkg.points,
          isActive: pkg.isActive,
          createdAt: pkg.createdAt
        },
        statistics: {
          // Contagens principais
          totalPackages: userPackages.length,
          activePackages: activePackagesCount,
          inactivePackages: inactivePackagesCount,
          uniqueUsers: uniqueUsersCount,
          activeUniqueUsers: activeUniqueUsersCount,
          
          // Estatísticas de ciclos
          totalCyclesCompleted,
          avgCyclesPerPackage: Math.round(avgCyclesPerPackage * 100) / 100,
          
          // Estatísticas temporais
          packagesLast7Days,
          packagesLast30Days,
          uniqueUsersLast7Days,
          uniqueUsersLast30Days,
          
          // Estatísticas de expiração
          expiredPackages,
          packagesExpiringSoon,
          
          // Distribuição
          usersWithOnePackage,
          usersWithMultiplePackages,
          maxPackagesPerUser,
          usersWithMultiplePackagesList,
          usersWithOnePackageList
        }
      }
    })

  } catch (error) {
    console.error('Erro ao buscar relatório do pacote:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar o relatório do pacote' 
      },
      { status: 500 }
    )
  }
}


