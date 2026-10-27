import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Código de indicação é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar usuário pelo código de indicação
    const user = await prisma.user.findUnique({
      where: { referralCode: code.toUpperCase() },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Código de indicação inválido' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: Number(user.id),
        name: user.name,
        referralCode: user.referralCode
      }
    })

  } catch (error) {
    console.error('Erro ao verificar código de indicação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 