import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * GET /api/transfers/search-user
 * Busca usuários por código de indicação ou nome para transferências
 * Requer autenticação
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Digite pelo menos 2 caracteres para buscar' },
        { status: 400 }
      )
    }

    const searchTerm = query.trim()

    // Buscar usuários por código de indicação ou nome
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { referralCode: { equals: searchTerm.toUpperCase(), mode: 'insensitive' } },
              { name: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          {
            isActive: true // Apenas usuários ativos
          },
          {
            id: { not: BigInt(session.user.id) } // Não permitir transferir para si mesmo
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true
      },
      take: 10,
      orderBy: {
        name: 'asc'
      }
    })

    // Serializar BigInt para número
    const serializedUsers = users.map(user => ({
      id: Number(user.id),
      name: user.name,
      email: user.email,
      referralCode: user.referralCode
    }))

    return NextResponse.json({
      success: true,
      users: serializedUsers
    })

  } catch (error) {
    console.error('Erro ao buscar usuários para transferência:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

