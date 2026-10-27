import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addMessageSchema } from '@/lib/validations/support'

export async function POST(
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
          rp.permission.key === 'support.write'
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
      select: {
        id: true,
        userId: true,
        status: true
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

    // Verificar se ticket está fechado
    if (ticket.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Não é possível adicionar mensagens em tickets fechados' },
        { status: 400 }
      )
    }

    // Obter dados da requisição
    const body = await request.json()
    
    // Validar dados
    const validation = addMessageSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { message } = validation.data

    // Criar mensagem
    const newMessage = await prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: user.id,
        message,
        isAdminReply: isAdmin
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Atualizar timestamp do ticket
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() }
    })

    // Se admin responder e ticket estiver OPEN, mudar para IN_PROGRESS
    if (isAdmin && ticket.status === 'OPEN') {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: 'IN_PROGRESS' }
      })
    }

    // Transformar dados para resposta
    const messageData = {
      id: newMessage.id.toString(),
      message: newMessage.message,
      isAdminReply: newMessage.isAdminReply,
      createdAt: newMessage.createdAt,
      user: {
        id: newMessage.user.id.toString(),
        name: newMessage.user.name,
        email: newMessage.user.email
      }
    }

    return NextResponse.json({
      message: messageData,
      success: true,
      successMessage: 'Mensagem adicionada com sucesso'
    })

  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: 'Não foi possível adicionar a mensagem. Tente novamente.'
      },
      { status: 500 }
    )
  }
}
