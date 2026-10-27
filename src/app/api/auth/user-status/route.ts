import { NextRequest, NextResponse } from 'next/server'
import { isUserActive } from '@/lib/business-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId é obrigatório' },
        { status: 400 }
      )
    }

    const userIdBigInt = BigInt(userId)
    const isActive = await isUserActive(userIdBigInt)

    return NextResponse.json({
      success: true,
      data: {
        isActive,
        userId: userId
      }
    })

  } catch (error) {
    console.error('❌ Erro ao verificar status do usuário:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}