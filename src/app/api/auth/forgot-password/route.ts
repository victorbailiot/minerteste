import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email-service'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Normalizar email (converter para minúsculas e remover espaços)
    const normalizedEmail = email.toLowerCase().trim()

    // Buscar usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      // Por segurança, não revelar se o email existe ou não
      return NextResponse.json({
        success: true,
        message: 'Se o email estiver cadastrado, você receberá um link de recuperação.'
      })
    }

    // Gerar token de reset de senha
    const passwordResetToken = crypto.randomBytes(32).toString('hex')
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Salvar token no banco
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires
      }
    })

    // Enviar email de recuperação
    try {
      await EmailService.sendPasswordResetEmail({
        userName: user.name,
        userEmail: user.email,
        resetToken: passwordResetToken,
      })
    } catch (emailError) {
      console.error('Erro ao enviar email de recuperação:', emailError)
      return NextResponse.json(
        { error: 'Erro ao enviar email de recuperação' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá um link de recuperação.'
    })

  } catch (error) {
    console.error('Erro na solicitação de recuperação de senha:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 