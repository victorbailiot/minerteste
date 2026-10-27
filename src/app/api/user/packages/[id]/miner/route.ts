import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const linkMinerSchema = z.object({
  minerId: z.number().int().positive()
})

// PATCH - Vincular mineradora a uma cota que ainda não possui (vínculo permanente)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    const { id } = await params
    const userPackageId = BigInt(id)
    const { minerId } = linkMinerSchema.parse(await request.json())

    const userPackage = await prisma.userPackage.findFirst({
      where: { id: userPackageId, userId },
      include: { package: { select: { name: true } } }
    })

    if (!userPackage) {
      return NextResponse.json({ success: false, error: 'Cota não encontrada' }, { status: 404 })
    }

    if (!userPackage.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Não é possível vincular mineradora a uma cota inativa'
      }, { status: 400 })
    }

    if (userPackage.minerId != null) {
      return NextResponse.json({
        success: false,
        error: 'Esta cota já possui mineradora vinculada'
      }, { status: 400 })
    }

    // A mineradora precisa estar disponível para o pacote da cota
    const miner = await prisma.miner.findFirst({
      where: {
        id: BigInt(minerId),
        packageMiners: { some: { packageId: userPackage.packageId } }
      },
      select: { id: true, name: true, city: true, state: true }
    })

    if (!miner) {
      return NextResponse.json({
        success: false,
        error: 'Mineradora não disponível para esta cota'
      }, { status: 400 })
    }

    // minerId: null no where garante que o vínculo só acontece uma vez
    const updated = await prisma.userPackage.updateMany({
      where: { id: userPackageId, userId, minerId: null },
      data: { minerId: miner.id }
    })

    if (updated.count === 0) {
      return NextResponse.json({
        success: false,
        error: 'Esta cota já possui mineradora vinculada'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Cota ${userPackage.package.name} vinculada à mineradora ${miner.name}.`,
      data: {
        id: Number(userPackage.id),
        miner: {
          id: Number(miner.id),
          name: miner.name,
          city: miner.city,
          state: miner.state
        }
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Selecione uma mineradora válida' }, { status: 400 })
    }

    console.error('Erro ao vincular mineradora:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
