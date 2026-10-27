import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateStatusSchema } from '@/lib/validations/support'

export async function PATCH(
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

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem alterar o status' },
        { status: 403 }
      )
    }

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
        status: true,
        subject: true
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      )
    }

    // Obter dados da requisição
    const body = await request.json()
    
    // Validar dados
    const validation = updateStatusSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { status: newStatus } = validation.data

    // Verificar se o status está mudando
    if (ticket.status === newStatus) {
      return NextResponse.json(
        { error: 'O ticket já está com este status' },
        { status: 400 }
      )
    }

    // Atualizar status do ticket
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { 
        status: newStatus,
        updatedAt: new Date()
      }
    })

    // Criar mensagem automática informando mudança de status
    const statusMessages = {
      OPEN: 'Ticket reaberto',
      IN_PROGRESS: 'Ticket em análise',
      RESOLVED: 'Ticket resolvido',
      CLOSED: 'Ticket fechado'
    }

    await prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: user.id,
        message: `Status alterado para "${statusMessages[newStatus]}" por ${user.name}`,
        isAdminReply: true
      }
    })

    // Transformar dados para resposta
    const ticketData = {
      id: updatedTicket.id.toString(),
      subject: updatedTicket.subject,
      status: updatedTicket.status,
      createdAt: updatedTicket.createdAt,
      updatedAt: updatedTicket.updatedAt
    }

    return NextResponse.json({
      ticket: ticketData,
      success: true,
      message: `Status alterado para "${statusMessages[newStatus]}" com sucesso`
    })

  } catch (error) {
    console.error('Erro ao atualizar status do ticket:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: 'Não foi possível atualizar o status. Tente novamente.'
      },
      { status: 500 }
    )
  }
}
