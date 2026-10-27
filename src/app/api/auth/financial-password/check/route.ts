import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/financial-password/check
 * Verifica se o usuário já tem senha financeira cadastrada
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        financialPassword: true
      }
    })

    return NextResponse.json({
      success: true,
      hasFinancialPassword: !!user?.financialPassword
    })

  } catch (error) {
    console.error('Erro ao verificar senha financeira:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar senha financeira' },
      { status: 500 }
    )
  }
}



