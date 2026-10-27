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
        message: 'Se o email estiver cadastrado, você receberá um novo link de confirmação.'
      })
    }

    // Verificar se o email já foi confirmado
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Este email já foi confirmado. Você pode fazer login normalmente.'
      })
    }

    // Gerar novo token de confirmação
    const emailVerificationToken = crypto.randomBytes(32).toString('hex')
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

    // Atualizar token no banco
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires
      }
    })

    // Enviar novo email de confirmação
    try {
      await EmailService.sendConfirmationEmail({
        userName: user.name,
        userEmail: user.email,
        confirmationToken: emailVerificationToken,
      })
    } catch (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError)
      return NextResponse.json(
        { error: 'Erro ao enviar email de confirmação' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Novo link de confirmação enviado para seu email.'
    })

  } catch (error) {
    console.error('Erro no reenvio de confirmação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 