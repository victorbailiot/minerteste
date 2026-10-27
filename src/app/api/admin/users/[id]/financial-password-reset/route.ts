import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const userId = Number(id)

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: 'ID de usuário inválido' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Gera o token de redefinição da senha financeira com expiração em 1 hora
    const financialPasswordResetToken = crypto.randomBytes(32).toString('hex')
    const financialPasswordResetExpires = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        financialPasswordResetToken,
        financialPasswordResetExpires,
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/auth/reset-financial-password?token=${financialPasswordResetToken}`

    return NextResponse.json({ success: true, resetUrl })
  } catch (error) {
    console.error('Erro ao gerar link de redefinição financeira (admin):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
