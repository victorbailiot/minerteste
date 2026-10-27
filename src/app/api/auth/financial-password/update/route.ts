import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hash, compare } from 'bcryptjs'

const updateFinancialPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  password: z.string().min(4, 'Senha financeira deve ter pelo menos 4 caracteres').max(20, 'Senha financeira deve ter no máximo 20 caracteres')
})

/**
 * PUT /api/auth/financial-password/update
 * Atualiza senha financeira do usuário
 */
export async function PUT(request: NextRequest) {
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
    const validatedData = updateFinancialPasswordSchema.parse(body)

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        financialPassword: true
      }
    })

    if (!user?.financialPassword) {
      return NextResponse.json(
        { error: 'Você ainda não possui uma senha financeira. Use a opção de criar.' },
        { status: 400 }
      )
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await compare(validatedData.currentPassword, user.financialPassword)
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Senha financeira atual incorreta' },
        { status: 400 }
      )
    }

    // Hash da nova senha financeira
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
      message: 'Senha financeira atualizada com sucesso'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao atualizar senha financeira:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar senha financeira' },
      { status: 500 }
    )
  }
}



