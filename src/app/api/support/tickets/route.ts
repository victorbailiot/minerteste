import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createTicketSchema, listTicketsSchema } from '@/lib/validations/support'
import { uploadSupportImages } from '@/lib/firebase-support'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    console.log('Session:', session)
    
    if (!session?.user?.email) {
      console.log('No session or email found')
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

    // Construir filtros - Todos os usuários veem apenas seus próprios tickets
    const where: any = {
      userId: user.id
    }

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
    console.error('Erro ao listar tickets:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar os tickets. Tente novamente.'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Processar FormData
    const formData = await request.formData()
    const subject = formData.get('subject') as string
    const message = formData.get('message') as string
    const images = formData.getAll('images') as File[]

    // Validar dados básicos
    const validation = createTicketSchema.safeParse({
      subject,
      message: message || undefined
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { subject: validSubject, message: validMessage } = validation.data

    // Validar imagens
    if (images.length > 5) {
      return NextResponse.json(
        { error: 'Máximo de 5 imagens por ticket' },
        { status: 400 }
      )
    }

    // Filtrar apenas arquivos válidos
    const validImages = images.filter(file => 
      file instanceof File && 
      file.size > 0 && 
      file.type.startsWith('image/')
    )

    // Criar ticket no banco
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: validSubject,
        status: 'OPEN'
      }
    })

    // Upload das imagens se houver
    let imageUrls: string[] = []
    if (validImages.length > 0) {
      try {
        const uploadResults = await uploadSupportImages(ticket.id.toString(), validImages)
        imageUrls = uploadResults.map(result => result.url)

        // Salvar URLs das imagens no banco
        await prisma.supportTicketImage.createMany({
          data: imageUrls.map(url => ({
            ticketId: ticket.id,
            imageUrl: url
          }))
        })
      } catch (uploadError) {
        console.error('Erro ao fazer upload das imagens:', uploadError)
        // Se falhar o upload, deletar o ticket criado
        await prisma.supportTicket.delete({
          where: { id: ticket.id }
        })
        
        return NextResponse.json(
          {
            error: 'Erro ao fazer upload das imagens',
            message: 'Não foi possível salvar as imagens. Tente novamente.'
          },
          { status: 500 }
        )
      }
    }

    // Criar primeira mensagem se fornecida
    if (validMessage) {
      await prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          userId: user.id,
          message: validMessage,
          isAdminReply: false
        }
      })
    }

    // Buscar ticket completo com relações
    const ticketWithRelations = await prisma.supportTicket.findUnique({
      where: { id: ticket.id },
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

    return NextResponse.json({
      ticket: ticketWithRelations,
      success: true,
      message: 'Ticket de suporte criado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao criar ticket de suporte:', error)
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        message: 'Não foi possível criar o ticket. Tente novamente.'
      },
      { status: 500 }
    )
  }
}
