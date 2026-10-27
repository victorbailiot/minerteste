import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const pixKeySchema = z.object({
  pixKeyType: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']),
  pixKey: z.string().min(1, 'Chave PIX é obrigatória'),
  accountHolderName: z.string().min(2, 'Nome do titular deve ter pelo menos 2 caracteres'),
  bankName: z.string().min(2, 'Nome do banco é obrigatório')
})

// GET - Buscar chave PIX ativa do usuário
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const pixKey = await prisma.pixKey.findFirst({
      where: {
        userId: BigInt(session.user.id),
        excludedAt: null
      }
    })

    return NextResponse.json({ pixKey })
  } catch (error) {
    console.error('Erro ao buscar chave PIX:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova chave PIX
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    const body = await request.json()
    const validatedData = pixKeySchema.parse(body)

    const existingPixKey = await prisma.pixKey.findUnique({
      where: { userId }
    })

    if (existingPixKey && !existingPixKey.excludedAt) {
      return NextResponse.json(
        { message: 'Usuário já possui uma chave PIX cadastrada' },
        { status: 400 }
      )
    }

    if (existingPixKey?.excludedAt) {
      const pixKey = await prisma.pixKey.update({
        where: { userId },
        data: {
          pixKeyType: validatedData.pixKeyType,
          pixKey: validatedData.pixKey,
          accountHolderName: validatedData.accountHolderName,
          bankName: validatedData.bankName,
          excludedAt: null
        }
      })
      return NextResponse.json({
        message: 'Chave PIX cadastrada com sucesso',
        pixKey
      })
    }

    const pixKey = await prisma.pixKey.create({
      data: {
        userId,
        pixKeyType: validatedData.pixKeyType,
        pixKey: validatedData.pixKey,
        accountHolderName: validatedData.accountHolderName,
        bankName: validatedData.bankName
      }
    })

    return NextResponse.json({
      message: 'Chave PIX cadastrada com sucesso',
      pixKey
    })
  } catch (error) {
    console.error('Erro ao criar chave PIX:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar chave PIX existente
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    const body = await request.json()
    const validatedData = pixKeySchema.parse(body)

    const existingPixKey = await prisma.pixKey.findUnique({
      where: { userId }
    })

    if (!existingPixKey || existingPixKey.excludedAt) {
      return NextResponse.json(
        { message: 'Nenhuma chave PIX encontrada para atualizar' },
        { status: 404 }
      )
    }

    const pixKey = await prisma.pixKey.update({
      where: { userId },
      data: {
        pixKeyType: validatedData.pixKeyType,
        pixKey: validatedData.pixKey,
        accountHolderName: validatedData.accountHolderName,
        bankName: validatedData.bankName
      }
    })

    return NextResponse.json({
      message: 'Chave PIX atualizada com sucesso',
      pixKey
    })
  } catch (error) {
    console.error('Erro ao atualizar chave PIX:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Dados inválidos', errors: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a chave do perfil (soft delete)
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    const existingPixKey = await prisma.pixKey.findUnique({
      where: { userId }
    })

    if (!existingPixKey) {
      return NextResponse.json(
        { message: 'Nenhuma chave PIX encontrada para excluir' },
        { status: 404 }
      )
    }

    if (existingPixKey.excludedAt) {
      return NextResponse.json({
        message: 'Chave PIX já estava removida do perfil'
      })
    }

    await prisma.pixKey.update({
      where: { userId },
      data: { excludedAt: new Date() }
    })

    return NextResponse.json({
      message: 'Chave PIX removida do seu perfil. O histórico foi mantido nos registros do sistema.'
    })
  } catch (error) {
    console.error('Erro ao excluir chave PIX do perfil:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
