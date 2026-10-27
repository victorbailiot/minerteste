import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { profitScheduleSchema } from '@/lib/schemas/profit-schedule-schema'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    // Usar permissão de financial ou packages como fallback
    const hasAccess = await hasPermission(userId, 'financial.read') || 
                      await hasPermission(userId, 'packages.read')
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sem permissão para visualizar agendamentos' }, { status: 403 })
    }

    // Buscar todos os agendamentos ordenados por data de criação descendente
    const schedules = await prisma.profitSchedule.findMany({
      include: {
        miner: {
          select: {
            id: true,
            name: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Formatar resposta
    const formattedSchedules = schedules.map(schedule => ({
      id: Number(schedule.id),
      totalProfit: Number(schedule.totalProfit),
      minerId: schedule.minerId ? Number(schedule.minerId) : null,
      miner: schedule.miner
        ? {
            id: Number(schedule.miner.id),
            name: schedule.miner.name
          }
        : null,
      scheduledAt: schedule.scheduledAt.toISOString(),
      isActive: schedule.isActive,
      createdBy: schedule.createdBy ? Number(schedule.createdBy) : null,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
      createdByUser: schedule.createdByUser ? {
        id: Number(schedule.createdByUser.id),
        name: schedule.createdByUser.name,
        email: schedule.createdByUser.email
      } : null
    }))

    return NextResponse.json({
      success: true,
      data: formattedSchedules
    })

  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar os agendamentos' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    // Usar permissão de financial ou packages como fallback
    const hasAccess = await hasPermission(userId, 'financial.read') || 
                      await hasPermission(userId, 'packages.read')
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sem permissão para criar agendamentos' }, { status: 403 })
    }

    const body = await request.json()

    // Validar dados com Zod
    const validatedData = profitScheduleSchema.parse(body)

    // Se isActive=true, verificar se já existe outro agendamento ativo
    if (validatedData.isActive) {
      const selectedMinerId = BigInt(validatedData.minerId)
      const existingActive = await prisma.profitSchedule.findFirst({
        where: {
          isActive: true,
          minerId: selectedMinerId
        }
      })

      if (existingActive) {
        return NextResponse.json(
          { 
            error: 'Já existe um agendamento ativo para esta mineradora',
            message: 'Desative o agendamento ativo desta mineradora antes de criar um novo'
          },
          { status: 400 }
        )
      }
    }

    const miner = await prisma.miner.findUnique({
      where: { id: BigInt(validatedData.minerId) },
      select: { id: true, name: true }
    })

    if (!miner) {
      return NextResponse.json(
        { error: 'Mineradora não encontrada' },
        { status: 404 }
      )
    }

    // Converter scheduledAt de string para Date
    const scheduledAt = new Date(validatedData.scheduledAt)

    // Criar agendamento
    const schedule = await prisma.profitSchedule.create({
      data: {
        totalProfit: new Decimal(validatedData.totalProfit),
        minerId: BigInt(validatedData.minerId),
        scheduledAt,
        isActive: validatedData.isActive,
        createdBy: userId
      },
      include: {
        miner: {
          select: {
            id: true,
            name: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: Number(schedule.id),
        totalProfit: Number(schedule.totalProfit),
        minerId: schedule.minerId ? Number(schedule.minerId) : null,
        miner: schedule.miner
          ? {
              id: Number(schedule.miner.id),
              name: schedule.miner.name
            }
          : null,
        scheduledAt: schedule.scheduledAt.toISOString(),
        isActive: schedule.isActive,
        createdBy: schedule.createdBy ? Number(schedule.createdBy) : null,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString(),
        createdByUser: schedule.createdByUser ? {
          id: Number(schedule.createdByUser.id),
          name: schedule.createdByUser.name,
          email: schedule.createdByUser.email
        } : null
      }
    }, { status: 201 })

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: error.issues 
        },
        { status: 400 }
      )
    }

    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível criar o agendamento' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const hasAccess = await hasPermission(userId, 'financial.read') || 
                      await hasPermission(userId, 'packages.read')
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sem permissão para editar agendamentos' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID do agendamento é obrigatório' },
        { status: 400 }
      )
    }

    // Validar dados com Zod
    const validatedData = profitScheduleSchema.parse(updateData)

    // Verificar se o agendamento existe
    const existingSchedule = await prisma.profitSchedule.findUnique({
      where: { id: BigInt(id) }
    })

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Se isActive=true e o agendamento atual está inativo, verificar se já existe outro ativo
    if (validatedData.isActive && !existingSchedule.isActive) {
      const selectedMinerId = BigInt(validatedData.minerId)
      const existingActive = await prisma.profitSchedule.findFirst({
        where: { 
          isActive: true,
          minerId: selectedMinerId,
          id: { not: BigInt(id) }
        }
      })

      if (existingActive) {
        return NextResponse.json(
          { 
            error: 'Já existe um agendamento ativo para esta mineradora',
            message: 'Desative o agendamento ativo desta mineradora antes de ativar este'
          },
          { status: 400 }
        )
      }
    }

    const miner = await prisma.miner.findUnique({
      where: { id: BigInt(validatedData.minerId) },
      select: { id: true, name: true }
    })

    if (!miner) {
      return NextResponse.json(
        { error: 'Mineradora não encontrada' },
        { status: 404 }
      )
    }

    // Converter scheduledAt de string para Date
    const scheduledAt = new Date(validatedData.scheduledAt)

    // Atualizar agendamento
    const schedule = await prisma.profitSchedule.update({
      where: { id: BigInt(id) },
      data: {
        totalProfit: new Decimal(validatedData.totalProfit),
        minerId: BigInt(validatedData.minerId),
        scheduledAt,
        isActive: validatedData.isActive
      },
      include: {
        miner: {
          select: {
            id: true,
            name: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: Number(schedule.id),
        totalProfit: Number(schedule.totalProfit),
        minerId: schedule.minerId ? Number(schedule.minerId) : null,
        miner: schedule.miner
          ? {
              id: Number(schedule.miner.id),
              name: schedule.miner.name
            }
          : null,
        scheduledAt: schedule.scheduledAt.toISOString(),
        isActive: schedule.isActive,
        createdBy: schedule.createdBy ? Number(schedule.createdBy) : null,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString(),
        createdByUser: schedule.createdByUser ? {
          id: Number(schedule.createdByUser.id),
          name: schedule.createdByUser.name,
          email: schedule.createdByUser.email
        } : null
      }
    })

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: error.issues 
        },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar agendamento:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível atualizar o agendamento' 
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    const hasAccess = await hasPermission(userId, 'financial.read') || 
                      await hasPermission(userId, 'packages.read')
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sem permissão para alterar status de agendamentos' }, { status: 403 })
    }

    const body = await request.json()
    const { id, isActive } = body

    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'ID do agendamento e status são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o agendamento existe
    const existingSchedule = await prisma.profitSchedule.findUnique({
      where: { id: BigInt(id) }
    })

    if (!existingSchedule) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Se ativando, verificar se já existe outro ativo
    if (isActive && !existingSchedule.isActive) {
      const existingActive = await prisma.profitSchedule.findFirst({
        where: { 
          isActive: true,
          minerId: existingSchedule.minerId,
          id: { not: BigInt(id) }
        }
      })

      if (existingActive) {
        return NextResponse.json(
          { 
            error: 'Já existe um agendamento ativo para esta mineradora',
            message: 'Desative o agendamento ativo desta mineradora antes de ativar este'
          },
          { status: 400 }
        )
      }
    }

    // Atualizar apenas o status
    const schedule = await prisma.profitSchedule.update({
      where: { id: BigInt(id) },
      data: { isActive },
      include: {
        miner: {
          select: {
            id: true,
            name: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: Number(schedule.id),
        totalProfit: Number(schedule.totalProfit),
        minerId: schedule.minerId ? Number(schedule.minerId) : null,
        miner: schedule.miner
          ? {
              id: Number(schedule.miner.id),
              name: schedule.miner.name
            }
          : null,
        scheduledAt: schedule.scheduledAt.toISOString(),
        isActive: schedule.isActive,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Erro ao alterar status do agendamento:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: 'Não foi possível alterar o status do agendamento' 
      },
      { status: 500 }
    )
  }
}

