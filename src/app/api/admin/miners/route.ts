import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { createMinerSchema, getFirstZodErrorMessage, minerListQuerySchema } from '@/lib/validations/miners'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(authUser.id)
    if (!await hasPermission(userId, 'miners.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar mineradoras' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const parsedQuery = minerListQuerySchema.parse(Object.fromEntries(searchParams.entries()))
    const { page, limit, search } = parsedQuery
    const skip = (page - 1) * limit

    const where = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const
          }
        }
      : undefined

    const [miners, total] = await Promise.all([
      prisma.miner.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.miner.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: miners.map((miner) => ({
        id: miner.id.toString(),
        name: miner.name,
        address: miner.address,
        city: miner.city,
        state: miner.state,
        createdAt: miner.createdAt.toISOString(),
        updatedAt: miner.updatedAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros de busca inválidos', details: error.flatten() },
        { status: 400 }
      )
    }
    console.error('Erro ao listar mineradoras:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao listar mineradoras' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(authUser.id)
    if (!await hasPermission(userId, 'miners.create')) {
      return NextResponse.json({ error: 'Sem permissão para criar mineradoras' }, { status: 403 })
    }

    const body = await request.json()
    const parsedData = createMinerSchema.parse(body)

    const miner = await prisma.miner.create({
      data: {
        name: parsedData.name,
        address: parsedData.address,
        city: parsedData.city,
        state: parsedData.state
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: miner.id.toString(),
        name: miner.name,
        address: miner.address,
        city: miner.city,
        state: miner.state,
        createdAt: miner.createdAt.toISOString(),
        updatedAt: miner.updatedAt.toISOString()
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getFirstZodErrorMessage(error), details: error.flatten() },
        { status: 400 }
      )
    }
    console.error('Erro ao criar mineradora:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar mineradora' },
      { status: 500 }
    )
  }
}
