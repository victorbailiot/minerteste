import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { getFirstZodErrorMessage, minerIdParamSchema, updateMinerSchema } from '@/lib/validations/miners'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(authUser.id)
    if (!await hasPermission(userId, 'miners.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar mineradoras' }, { status: 403 })
    }

    const routeParams = await params
    const parsedParams = minerIdParamSchema.parse(routeParams)
    const minerId = BigInt(parsedParams.id)

    const miner = await prisma.miner.findUnique({
      where: { id: minerId }
    })

    if (!miner) {
      return NextResponse.json({ error: 'Mineradora não encontrada' }, { status: 404 })
    }

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
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getFirstZodErrorMessage(error), details: error.flatten() },
        { status: 400 }
      )
    }
    console.error('Erro ao buscar mineradora:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar mineradora' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(authUser.id)
    if (!await hasPermission(userId, 'miners.update')) {
      return NextResponse.json({ error: 'Sem permissão para atualizar mineradoras' }, { status: 403 })
    }

    const routeParams = await params
    const parsedParams = minerIdParamSchema.parse(routeParams)
    const minerId = BigInt(parsedParams.id)

    const body = await request.json()
    const parsedData = updateMinerSchema.parse(body)

    const existingMiner = await prisma.miner.findUnique({
      where: { id: minerId }
    })

    if (!existingMiner) {
      return NextResponse.json({ error: 'Mineradora não encontrada' }, { status: 404 })
    }

    const updatedMiner = await prisma.miner.update({
      where: { id: minerId },
      data: {
        ...(parsedData.name !== undefined ? { name: parsedData.name } : {}),
        ...(parsedData.address !== undefined ? { address: parsedData.address } : {}),
        ...(parsedData.city !== undefined ? { city: parsedData.city } : {}),
        ...(parsedData.state !== undefined ? { state: parsedData.state } : {})
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedMiner.id.toString(),
        name: updatedMiner.name,
        address: updatedMiner.address,
        city: updatedMiner.city,
        state: updatedMiner.state,
        createdAt: updatedMiner.createdAt.toISOString(),
        updatedAt: updatedMiner.updatedAt.toISOString()
      }
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: getFirstZodErrorMessage(error), details: error.flatten() },
        { status: 400 }
      )
    }
    console.error('Erro ao atualizar mineradora:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar mineradora' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(authUser.id)
    if (!await hasPermission(userId, 'miners.delete')) {
      return NextResponse.json({ error: 'Sem permissão para excluir mineradoras' }, { status: 403 })
    }

    const routeParams = await params
    const parsedParams = minerIdParamSchema.parse(routeParams)
    const minerId = BigInt(parsedParams.id)

    const [existingMiner, packageLinksCount, userPackagesCount] = await Promise.all([
      prisma.miner.findUnique({
        where: { id: minerId }
      }),
      prisma.packageMiner.count({ where: { minerId } }),
      prisma.userPackage.count({ where: { minerId } })
    ])

    if (!existingMiner) {
      return NextResponse.json({ error: 'Mineradora não encontrada' }, { status: 404 })
    }

    if (packageLinksCount > 0 || userPackagesCount > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir mineradora vinculada a pacotes ou compras' },
        { status: 409 }
      )
    }

    await prisma.miner.delete({
      where: { id: minerId }
    })

    return NextResponse.json({
      success: true,
      message: 'Mineradora excluída com sucesso'
    })
  } catch (error) {
    console.error('Erro ao excluir mineradora:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao excluir mineradora' },
      { status: 500 }
    )
  }
}
