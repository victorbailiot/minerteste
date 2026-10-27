import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Validar ID do ticket
    const resolvedParams = await params
    const ticketId = parseInt(resolvedParams.id)
    if (isNaN(ticketId)) {
      return NextResponse.json(
        { error: 'ID do ticket inválido' },
        { status: 400 }
      )
    }

    // Buscar ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        images: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão (admin ou dono do ticket)
    if (!isAdmin && ticket.userId !== user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Transformar dados para resposta
    const ticketData = {
      id: ticket.id.toString(),
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      user: {
        id: ticket.user.id.toString(),
        name: ticket.user.name,
        email: ticket.user.email,
        phone: ticket.user.phone
      },
      messages: ticket.messages.map(message => ({
        id: message.id.toString(),
        message: message.message,
        isAdminReply: message.isAdminReply,
        createdAt: message.createdAt,
        user: {
          id: message.user.id.toString(),
          name: message.user.name,
          email: message.user.email
        }
      })),
      images: ticket.images.map(image => ({
        id: image.id.toString(),
        imageUrl: image.imageUrl,
        createdAt: image.createdAt
      }))
    }

    return NextResponse.json({
      ticket: ticketData,
      success: true
    })

  } catch (error) {
    console.error('Erro ao buscar detalhes do ticket:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar os detalhes do ticket. Tente novamente.'
      },
      { status: 500 }
    )
  }
}
