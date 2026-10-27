import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hash } from 'bcryptjs'

const resetFinancialPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  password: z.string().min(4, 'Senha financeira deve ter pelo menos 4 caracteres').max(20, 'Senha financeira deve ter no máximo 20 caracteres')
})

/**
 * POST /api/auth/financial-password/reset
 * Reseta senha financeira usando token de recuperação
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    // Validar dados
    const validatedData = resetFinancialPasswordSchema.parse({ token, password })

    // Buscar usuário com o token de reset
    const user = await prisma.user.findFirst({
      where: {
        financialPasswordResetToken: validatedData.token,
        financialPasswordResetExpires: {
          gt: new Date()
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Token de recuperação inválido ou expirado' },
        { status: 400 }
      )
    }

    // Hash da nova senha financeira
    const hashedPassword = await hash(validatedData.password, 10)

    // Atualizar senha financeira e limpar tokens
    await prisma.user.update({
      where: { id: user.id },
      data: {
        financialPassword: hashedPassword,
        financialPasswordResetToken: null,
        financialPasswordResetExpires: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Senha financeira alterada com sucesso!'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro no reset de senha financeira:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

