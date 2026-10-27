import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'users.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar membros do Clube dos 300' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const packageFilter = searchParams.get('package') || 'all'
    const minerIdParam = searchParams.get('minerId') || 'all'

    // Construir filtros
    const where: any = {
      isActive: true
    }

    if (minerIdParam && minerIdParam !== 'all') {
      where.minerId = BigInt(minerIdParam)
    }

    // Filtro por pacote
    if (packageFilter && packageFilter !== 'all') {
      where.userPackage = {
        package: {
          name: packageFilter
        }
      }
    }

    // Filtro de busca (nome, email, CPF, código)
    if (search) {
      const searchOnlyNumbers = search.replace(/[^\d]/g, '')
      
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { referralCode: { contains: search, mode: 'insensitive' } }
        ]
      }

      // Se o termo de busca contém números, adicionar busca por CPF
      if (searchOnlyNumbers) {
        where.user.OR.push({ cpf: { contains: searchOnlyNumbers, mode: 'insensitive' } })
      }
    }

    // Buscar membros do Clube dos 300
    const members = await prisma.clube300Member.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            cpf: true,
            referralCode: true
          }
        },
        miner: {
          select: {
            id: true,
            name: true
          }
        },
        userPackage: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        memberNumber: 'asc'
      }
    })

    // Formatar dados para resposta
    const formattedMembers = members.map(member => ({
      id: Number(member.id),
      userId: Number(member.userId),
      memberNumber: member.memberNumber,
      minerId: Number(member.minerId),
      minerName: member.miner.name,
      name: member.user.name,
      email: member.user.email,
      cpf: member.user.cpf,
      referralCode: member.user.referralCode,
      packageName: member.userPackage.package.name,
      packagePrice: Number(member.userPackage.package.price),
      cotas: member.cotas,
      joinedAt: member.createdAt.toISOString(),
      isActive: member.isActive
    }))

    // Contar total de membros
    const total = await prisma.clube300Member.count({ where })

    return NextResponse.json({
      success: true,
      data: formattedMembers,
      total
    })
  } catch (error) {
    console.error('Erro ao buscar membros do Clube dos 300:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar membros do Clube dos 300' },
      { status: 500 }
    )
  }
}

