import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token de confirmação não fornecido' },
        { status: 400 }
      )
    }

    // Buscar usuário com o token de confirmação
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date()
        }
      }
    })

    if (!user) {
      // Verificar se existe um token expirado para este email
      const expiredTokenUser = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            lt: new Date()
          }
        }
      })

      if (expiredTokenUser) {
        return NextResponse.json(
          { error: 'Token de confirmação expirado. Solicite um novo link.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Token de confirmação inválido' },
        { status: 400 }
      )
    }

    // Confirmar email do usuário
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Email confirmado com sucesso!'
    })

  } catch (error) {
    console.error('Erro na confirmação de email:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 