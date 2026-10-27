import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hash } from 'bcryptjs'

const createFinancialPasswordSchema = z.object({
  password: z.string().min(4, 'Senha financeira deve ter pelo menos 4 caracteres').max(20, 'Senha financeira deve ter no máximo 20 caracteres')
})

/**
 * POST /api/auth/financial-password/create
 * Cria senha financeira para o usuário
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
    const validatedData = createFinancialPasswordSchema.parse(body)

    // Verificar se já tem senha financeira
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        financialPassword: true
      }
    })

    if (user?.financialPassword) {
      return NextResponse.json(
        { error: 'Você já possui uma senha financeira. Use a opção de atualizar.' },
        { status: 400 }
      )
    }

    // Hash da senha financeira
    const hashedPassword = await hash(validatedData.password, 10)

    // Atualizar usuário
    await prisma.user.update({
      where: { id: userId },
      data: {
        financialPassword: hashedPassword
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Senha financeira criada com sucesso'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao criar senha financeira:', error)
    return NextResponse.json(
      { error: 'Erro ao criar senha financeira' },
      { status: 500 }
    )
  }
}



