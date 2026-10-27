import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT - Definir endereço como padrão
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    const addressId = BigInt(params.id)

    // Verificar se o endereço pertence ao usuário
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
        isActive: true,
      },
    })

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Endereço não encontrado' },
        { status: 404 }
      )
    }

    // Se já é o endereço padrão, não fazer nada
    if (existingAddress.isDefault) {
      return NextResponse.json({
        success: true,
        message: 'Este endereço já é o padrão',
      })
    }

    // Desmarcar outros endereços como padrão
    await prisma.address.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: { isDefault: false },
    })

    // Marcar este endereço como padrão
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    })

    // Serializar BigInt
    const serializedAddress = {
      ...updatedAddress,
      id: Number(updatedAddress.id),
      userId: Number(updatedAddress.userId),
    }

    return NextResponse.json({
      success: true,
      message: 'Endereço definido como padrão',
      address: serializedAddress,
    })
  } catch (error) {
    console.error('Erro ao definir endereço como padrão:', error)
    return NextResponse.json(
      { error: 'Erro ao definir endereço como padrão' },
      { status: 500 }
    )
  }
}









