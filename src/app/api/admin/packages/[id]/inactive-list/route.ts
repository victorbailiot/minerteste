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

    // Obter parâmetros de filtro da query string
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Buscar o pacote para validar
    const pkg = await prisma.package.findUnique({
      where: { id: packageId }
    })

    if (!pkg) {
      return NextResponse.json(
        { error: 'Pacote não encontrado' },
        { status: 404 }
      )
    }

    // Construir filtros de data
    const dateFilters: any = {}
    
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      dateFilters.gte = start
    }
    
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      dateFilters.lte = end
    }

    // Buscar pacotes inativos
    // Um pacote é considerado inativo se:
    // - isActive: false OU
    // - isUnilevel: false OU
    // - expiresAt não é null E expiresAt <= data_atual
    const now = new Date()
    const inactivePackages = await prisma.userPackage.findMany({
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
        ],
        ...(Object.keys(dateFilters).length > 0 && {
          createdAt: dateFilters
        })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    })

    // Agrupar por usuário e contar pacotes
    const userPackagesMap = new Map<string, {
      userId: string
      userName: string
      userEmail: string
      packagesCount: number
      packages: Array<{
        id: number
        createdAt: string
        expiresAt: string | null
        isActive: boolean
        isUnilevel: boolean
        completedCycles: number
      }>
    }>()

    inactivePackages.forEach(up => {
      const userIdStr = up.userId.toString()
      
      if (!userPackagesMap.has(userIdStr)) {
        userPackagesMap.set(userIdStr, {
          userId: userIdStr,
          userName: up.user.name,
          userEmail: up.user.email,
          packagesCount: 0,
          packages: []
        })
      }
      
      const userData = userPackagesMap.get(userIdStr)!
      userData.packagesCount++
      userData.packages.push({
        id: Number(up.id),
        createdAt: up.createdAt.toISOString(),
        expiresAt: up.expiresAt ? up.expiresAt.toISOString() : null,
        isActive: up.isActive,
        isUnilevel: up.isUnilevel,
        completedCycles: up.completedCycles
      })
    })

    // Converter para array e ordenar por quantidade de pacotes (desc) e depois por nome
    const groupedUsers = Array.from(userPackagesMap.values())
      .sort((a, b) => {
        if (b.packagesCount !== a.packagesCount) {
          return b.packagesCount - a.packagesCount
        }
        return a.userName.localeCompare(b.userName)
      })

    return NextResponse.json({
      success: true,
      data: {
        users: groupedUsers,
        total: inactivePackages.length,
        uniqueUsers: groupedUsers.length
      }
    })

  } catch (error) {
    console.error('Erro ao buscar pacotes inativos:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar os pacotes inativos' 
      },
      { status: 500 }
    )
  }
}

