import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'ID de usuário inválido' },
        { status: 400 }
      )
    }

    const pixKey = await prisma.pixKey.findUnique({
      where: { userId: userId },
      select: {
        id: true,
        pixKeyType: true,
        pixKey: true,
        accountHolderName: true,
        bankName: true,
        excludedAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!pixKey) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    const formattedPixKey = {
      ...pixKey,
      id: Number(pixKey.id),
      excludedAt: pixKey.excludedAt?.toISOString() ?? null,
      createdAt: pixKey.createdAt.toISOString(),
      updatedAt: pixKey.updatedAt.toISOString()
    }

    return NextResponse.json({
      success: true,
      data: formattedPixKey
    })

  } catch (error) {
    console.error('Erro ao buscar chave PIX:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 