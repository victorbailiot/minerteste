import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email-service'
import crypto from 'crypto'

/**
 * POST /api/auth/financial-password/forgot
 * Solicita recuperação de senha financeira
 * Requer usuário autenticado
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      }
    })

    if (!user) {
      // Por segurança, não revelar se o email existe ou não
      return NextResponse.json({
        success: true,
        message: 'Se você tiver uma senha financeira cadastrada, você receberá um link de recuperação no seu email.'
      })
    }

    // Gerar token de reset de senha financeira
    const financialPasswordResetToken = crypto.randomBytes(32).toString('hex')
    const financialPasswordResetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Salvar token no banco
    await prisma.user.update({
      where: { id: userId },
      data: {
        financialPasswordResetToken,
        financialPasswordResetExpires
      }
    })

    // Enviar email de recuperação
    try {
      await EmailService.sendFinancialPasswordResetEmail({
        userName: user.name,
        userEmail: user.email,
        resetToken: financialPasswordResetToken,
      })
    } catch (emailError) {
      console.error('Erro ao enviar email de recuperação de senha financeira:', emailError)
      return NextResponse.json(
        { error: 'Erro ao enviar email de recuperação' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Se você tiver uma senha financeira cadastrada, você receberá um link de recuperação no seu email.'
    })

  } catch (error) {
    console.error('Erro ao solicitar recuperação de senha financeira:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

