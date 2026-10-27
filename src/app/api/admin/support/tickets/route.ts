import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listTicketsSchema } from '@/lib/validations/support'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        name: true, 
        email: true,
        role: true,
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se é admin
    const isAdmin = user.role === 'ADMIN' || 
      user.userRoles.some(ur => 
        ur.role.permissions.some(rp => 
          rp.permission.key === 'support.read'
        )
      )

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar esta funcionalidade.' },
        { status: 403 }
      )
    }

    // Obter parâmetros da query
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Validar parâmetros
    const validation = listTicketsSchema.safeParse({
      status: status || undefined,
      page,
      limit
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros inválidos',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { status: validStatus, page: validPage, limit: validLimit } = validation.data

    // Construir filtros - Admin vê TODOS os tickets
    const where: any = {}
    
    if (validStatus) {
      where.status = validStatus
    }

    // Calcular offset para paginação
    const skip = (validPage - 1) * validLimit

    // Buscar tickets com paginação
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          messages: {
            select: {
              id: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: validLimit
      }),
      prisma.supportTicket.count({ where })
    ])

    // Transformar dados para resposta
    const ticketsData = tickets.map(ticket => ({
      id: ticket.id.toString(),
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      messageCount: ticket.messages.length,
      user: {
        id: ticket.user.id.toString(),
        name: ticket.user.name,
        email: ticket.user.email
      }
    }))

    const totalPages = Math.ceil(total / validLimit)

    return NextResponse.json({
      tickets: ticketsData,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages
      }
    })

  } catch (error) {
    console.error('Erro ao listar tickets administrativos:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar os tickets. Tente novamente.'
      },
      { status: 500 }
    )
  }
}
