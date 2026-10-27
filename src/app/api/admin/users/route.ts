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
      return NextResponse.json({ error: 'Sem permissão para visualizar usuários' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || ''
    const packageFilter = searchParams.get('package') || ''

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {
      // Excluir usuário ID=1 (usuário sistema)
      id: { not: 1 }
    }
    
    if (search) {
      // Remover pontuação do CPF para busca (manter apenas números)
      const searchOnlyNumbers = search.replace(/[^\d]/g, '')
      
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { referralCode: { contains: search, mode: 'insensitive' } }
      ]
      
      // Se o termo de busca contém números, adicionar busca por CPF
      if (searchOnlyNumbers) {
        where.OR.push({ cpf: { contains: searchOnlyNumbers, mode: 'insensitive' } })
      }
    }

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'active') {
        where.isActive = true
      } else if (statusFilter === 'inactive') {
        where.isActive = false
      }
    }

    // Buscar usuários com dados essenciais
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        sponsorId: true,
        parentId: true,
        position: true,
        createdAt: true,
        lastLogin: true,
        referralCode: true,
        profilePhotos: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            photoUrl: true
          }
        },
        packages: {
          where: packageFilter && packageFilter !== 'all' ? {
            package: {
              name: packageFilter
            }
          } : {},
          include: {
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
      },
      skip,
      take: limit
    })

    // Buscar total de usuários
    const total = await prisma.user.count({ where })

    // Processar dados essenciais para cada usuário
    const formattedUsers = await Promise.all(users.map(async (user) => {
      // Verificar se tem ativação ativa
      const activeActivation = await prisma.userActivation.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          expiresAt: {
            gt: new Date()
          }
        }
      })

      // Buscar pacote ativo
      const activePackage = user.packages.find(pkg => pkg.isActive)

      // Determinar status do usuário
      let status = 'inactive'
      if (!user.isActive) {
        status = 'banned'
      } else if (activeActivation || activePackage) {
        status = 'active'
      }

      return {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        photoUrl: user.profilePhotos[0]?.photoUrl || null,
        status,
        package: activePackage?.package.name || null,
        registeredAt: user.createdAt.toISOString(),
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin?.toISOString() || null,
        referralCode: user.referralCode,
        position: user.position,
        sponsorId: user.sponsorId ? Number(user.sponsorId) : null,
        parentId: user.parentId ? Number(user.parentId) : null,
        packages: user.packages.map(pkg => ({
          id: Number(pkg.id),
          name: pkg.package.name,
          price: Number(pkg.package.price),
          isActive: pkg.isActive,
          activatedAt: pkg.activatedAt.toISOString()
        }))
      }
    }))

    // Aplicar filtro de pacote se necessário
    let filteredUsers = formattedUsers
    if (packageFilter && packageFilter !== 'all') {
      filteredUsers = formattedUsers.filter(user => 
        user.packages.some(pkg => pkg.name === packageFilter)
      )
    }

    return NextResponse.json({
      success: true,
      data: filteredUsers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    })

  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const currentUserId = BigInt(user.id)
    if (!await hasPermission(currentUserId, 'users.create')) {
      return NextResponse.json({ error: 'Sem permissão para criar usuários' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role = 'USER', sponsorId, isTestUser = false } = body

    // Validações básicas
    if (!name || !email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Nome, email e senha são obrigatórios'
      }, { status: 400 })
    }

    // Normalizar email (converter para minúsculas e remover espaços)
    const normalizedEmail = email.toLowerCase().trim()

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Email já está em uso'
      }, { status: 409 })
    }

    // Gerar código de indicação único
    const { generateUniqueReferralCode } = await import('@/lib/utils')
    const referralCode = await generateUniqueReferralCode(prisma)

    // Criar usuário
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: await import('bcryptjs').then(bcrypt => bcrypt.hash(password, 10)),
        role,
        referralCode,
        sponsorId: sponsorId ? BigInt(sponsorId) : null,
        isActive: true,
        phone: ''
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        sponsorId: true,
        createdAt: true
      }
    })

    // Para usuários de teste, criar ativação automática
    if (isTestUser) {
      const { Decimal } = await import('@prisma/client/runtime/library')
      
      await prisma.userActivation.create({
        data: {
          userId: newUser.id,
          type: "PIX",
          amount: new Decimal(0),
          activatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          status: 'ACTIVE',
          correlationID: `USER-CREATION-${Date.now()}-${newUser.id}`
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newUser,
        id: Number(newUser.id),
        sponsorId: newUser.sponsorId ? Number(newUser.sponsorId) : null
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const currentUserId = BigInt(user.id)
    if (!await hasPermission(currentUserId, 'users.delete')) {
      return NextResponse.json({ error: 'Sem permissão para deletar usuários' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ID do usuário é obrigatório'
      }, { status: 400 })
    }

    // Verificar se o usuário existe
    const userToDelete = await prisma.user.findUnique({
      where: { id: BigInt(userId) }
    })

    if (!userToDelete) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado'
      }, { status: 404 })
    }

    // Não permitir deletar admin
    if (userToDelete.role === 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Não é possível deletar usuário administrador'
      }, { status: 403 })
    }

    // Deletar usuário e dados relacionados
    await prisma.$transaction(async (tx) => {
      // Deletar transações
      await tx.transaction.deleteMany({
        where: { userId: BigInt(userId) }
      })

      // Deletar pacotes do usuário
      await tx.userPackage.deleteMany({
        where: { userId: BigInt(userId) }
      })

      // Deletar histórico de pontos
      await tx.userPointsHistory.deleteMany({
        where: { userId: BigInt(userId) }
      })

      // Deletar ciclos
      await tx.cycle.deleteMany({
        where: { userId: BigInt(userId) }
      })

      // Deletar ativações
      await tx.userActivation.deleteMany({
        where: { userId: BigInt(userId) }
      })

      // Deletar contratos
      await tx.contract.deleteMany({
        where: { userId: BigInt(userId) }
      })

      // Remover referências como patrocinador
      await tx.user.updateMany({
        where: { sponsorId: BigInt(userId) },
        data: { sponsorId: null }
      })

      // Remover referências como pai na árvore
      await tx.user.updateMany({
        where: { parentId: BigInt(userId) },
        data: { parentId: null }
      })

      // Finalmente, deletar o usuário
      await tx.user.delete({
        where: { id: BigInt(userId) }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Usuário deletado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 