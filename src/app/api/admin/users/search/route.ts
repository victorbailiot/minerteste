import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const currentUserId = BigInt(user.id)
    const canReadUsers = await hasPermission(currentUserId, 'users.read')
    if (!canReadUsers) {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('query')

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query de pesquisa não fornecida' },
        { status: 400 }
      )
    }

    // Remover pontuação do CPF para busca (manter apenas números)
    const queryOnlyNumbers = query.replace(/[^\d]/g, '')
    
    const orConditions: any[] = [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query, mode: 'insensitive' } },
      { referralCode: { contains: query, mode: 'insensitive' } }
    ]
    
    // Se o termo de busca contém números, adicionar busca por CPF
    if (queryOnlyNumbers) {
      orConditions.push({ cpf: { contains: queryOnlyNumbers, mode: 'insensitive' } })
    }
    
    const users = await prisma.user.findMany({
      where: {
        OR: orConditions
      },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true
      },
      take: 20,
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

    return NextResponse.json({ success: true, data: serializedUsers })
  } catch (error) {
    console.error('Erro ao pesquisar usuários:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao pesquisar usuários' },
      { status: 500 }
    )
  }
}

