import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserActivePackage } from '@/lib/business-logic'

export async function GET(request: NextRequest) { 
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    const userIdBigInt = BigInt(userId)

    // Buscar apenas o código de indicação do usuário
    const user = await prisma.user.findUnique({
      where: { id: userIdBigInt },
      select: {
        id: true,
        referralCode: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const activePackage = await getUserActivePackage(userIdBigInt)

    if (!activePackage) {
      return NextResponse.json({ error: 'Usuário não possui pacote ativo' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        referralCode: user.referralCode
      }
    })

  } catch (error) {
    console.error('Erro ao buscar código de indicação:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 