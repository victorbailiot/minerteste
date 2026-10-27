import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { compare } from 'bcryptjs'

const verifyFinancialPasswordSchema = z.object({
  password: z.string().min(1, 'Senha financeira é obrigatória')
})

/**
 * POST /api/auth/financial-password/verify
 * Verifica se a senha financeira está correta
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    const body = await request.json()

    // Validar dados
    const validatedData = verifyFinancialPasswordSchema.parse(body)

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        financialPassword: true
      }
    })

    if (!user?.financialPassword) {
      return NextResponse.json(
        { error: 'Você ainda não possui uma senha financeira cadastrada', valid: false },
        { status: 400 }
      )
    }

    // Verificar senha
    const isValid = await compare(validatedData.password, user.financialPassword)

    return NextResponse.json({
      success: true,
      valid: isValid
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues, valid: false },
        { status: 400 }
      )
    }

    console.error('Erro ao verificar senha financeira:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar senha financeira', valid: false },
      { status: 500 }
    )
  }
}



