import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { logAdminAction } from '@/lib/admin-audit'

const updatePackageMinerSchema = z.object({
  minerId: z.number().int().positive().nullable()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const currentUserId = BigInt(user.id)
    if (!await hasPermission(currentUserId, 'packages.change_miner')) {
      return NextResponse.json({ error: 'Sem permissão para trocar mineradora do pacote' }, { status: 403 })
    }

    const { id, packageId } = await params
    const userId = BigInt(id)
    const userPackageId = BigInt(packageId)

    const body = await request.json()
    const parsedBody = updatePackageMinerSchema.parse(body)

    const userPackage = await prisma.userPackage.findFirst({
      where: {
        id: userPackageId,
        userId
      },
      include: {
        package: {
          select: {
            name: true
          }
        },
        miner: {
          select: {
            name: true
          }
        }
      }
    })

    if (!userPackage) {
      return NextResponse.json({
        success: false,
        error: 'Pacote não encontrado ou não pertence ao usuário'
      }, { status: 404 })
    }

    if (!userPackage.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Não é possível alterar a mineradora de pacotes inativos'
      }, { status: 400 })
    }

    if (parsedBody.minerId !== null) {
      const miner = await prisma.miner.findUnique({
        where: { id: BigInt(parsedBody.minerId) },
        select: { id: true, name: true }
      })

      if (!miner) {
        return NextResponse.json({
          success: false,
          error: 'Mineradora não encontrada'
        }, { status: 404 })
      }
    }

    const updatedPackage = await prisma.userPackage.update({
      where: { id: userPackageId },
      data: {
        minerId: parsedBody.minerId !== null ? BigInt(parsedBody.minerId) : null,
        updatedAt: new Date()
      },
      include: {
        miner: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const previousMinerName = userPackage.miner?.name ?? 'Não vinculada'
    const newMinerName = updatedPackage.miner?.name ?? 'Não vinculada'

    try {
      await logAdminAction({
        actionType: 'PACKAGE_UPDATED',
        performedBy: currentUserId,
        targetUserId: userId,
        resourceType: 'USER_PACKAGE',
        resourceId: userPackageId,
        oldValue: {
          userPackageId: Number(userPackageId),
          minerId: userPackage.minerId ? Number(userPackage.minerId) : null,
          minerName: previousMinerName,
        },
        newValue: {
          userPackageId: Number(userPackageId),
          minerId: updatedPackage.minerId ? Number(updatedPackage.minerId) : null,
          minerName: newMinerName,
        },
        description: `Mineradora do pacote #${userPackageId} (${userPackage.package.name}) alterada de "${previousMinerName}" para "${newMinerName}" por admin ${user.id} no usuário ${userId}`,
        metadata: {
          userPackageId: Number(userPackageId),
          packageName: userPackage.package.name,
          oldMinerId: userPackage.minerId ? Number(userPackage.minerId) : null,
          newMinerId: updatedPackage.minerId ? Number(updatedPackage.minerId) : null,
          performedByAdminId: Number(user.id),
          targetUserId: Number(userId),
        },
      })
    } catch (auditErr) {
      console.error('Falha ao auditar alteração de mineradora do pacote:', auditErr)
    }

    return NextResponse.json({
      success: true,
      message: `Mineradora do pacote ${userPackage.package.name} alterada de "${previousMinerName}" para "${newMinerName}"`,
      data: {
        packageId: Number(updatedPackage.id),
        minerId: updatedPackage.minerId ? Number(updatedPackage.minerId) : null,
        minerName: updatedPackage.miner?.name ?? null
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dados inválidos',
        details: error.flatten()
      }, { status: 400 })
    }

    console.error('Erro ao alterar mineradora do pacote:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
