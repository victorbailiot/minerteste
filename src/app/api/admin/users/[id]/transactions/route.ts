import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission, isSuperAdmin } from '@/lib/authorization'
import { z } from 'zod'

const createTransactionSchema = z.object({
  type: z.enum([
    'DEPOSIT',
    'BONUS',
    'WITHDRAWAL',
    'PURCHASE',
    'BONUS_PAYMENT',
    'MINING_REWARD',
    'PIX_PAYMENT',
    'CREDIT_PAYMENT',
    'DIRECT_BONUS',
    'BOOSTED_BONUS',
    'INDIRECT_BONUS',
    'CYCLE_BONUS',
    'BINARY_BONUS',
    'PROFIT_SHARE',
    'ACTIVATION_PIX',
    'ACTIVATION_BONUS',
    'CASHBACK',
    'CAREER_BONUS',
    'CAREER_PRIZE',
    'SOLIDARITY_PAYMENT',
    'REACTIVATION_BONUS',
    'BONUS_ADJUSTMENT'
  ]),
  amount: z.number().positive(),
  description: z.string().min(1).max(255),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  userId: z.number(),
  sourceUserId: z.number().nullish()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const currentUserId = BigInt(user.id)
    const canCreateTransactions = await hasPermission(currentUserId, 'transactions.create')
    if (!canCreateTransactions) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para criar transações' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createTransactionSchema.parse(body)

    // Bônus de Ajuste: controle do saldo exclusivo do super admin, sem usuário de origem
    if (validatedData.type === 'BONUS_ADJUSTMENT') {
      if (!await isSuperAdmin(currentUserId)) {
        return NextResponse.json(
          { success: false, error: 'Apenas super admin pode lançar Bônus de Ajuste' },
          { status: 403 }
        )
      }
      validatedData.sourceUserId = null
    }

    // Verificar se o userId existe
    const targetUser = await prisma.user.findUnique({
      where: { id: BigInt(validatedData.userId) },
      select: { id: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o sourceUserId existe (se fornecido)
    let sourceUserIdBigInt: bigint | undefined = undefined
    if (validatedData.sourceUserId !== null && validatedData.sourceUserId !== undefined) {
      const sourceUser = await prisma.user.findUnique({
        where: { id: BigInt(validatedData.sourceUserId) },
        select: { id: true }
      })

      if (!sourceUser) {
        return NextResponse.json(
          { success: false, error: 'Usuário de origem não encontrado' },
          { status: 404 }
        )
      }

      sourceUserIdBigInt = BigInt(validatedData.sourceUserId)
    }

    // Criar a transação
    const transaction = await prisma.transaction.create({
      data: {
        user: {
          connect: { id: BigInt(validatedData.userId) }
        },
        type: validatedData.type,
        amount: validatedData.amount,
        description: validatedData.description,
        status: validatedData.status,
        ...(sourceUserIdBigInt && {
          sourceUser: {
            connect: { id: sourceUserIdBigInt }
          }
        })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        sourceUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Serializar BigInt
    const serializedTransaction = {
      id: Number(transaction.id),
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      status: transaction.status,
      userId: Number(transaction.userId),
      sourceUserId: transaction.sourceUserId ? Number(transaction.sourceUserId) : null,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      user: transaction.user ? {
        id: Number(transaction.user.id),
        name: transaction.user.name,
        email: transaction.user.email
      } : null,
      sourceUser: transaction.sourceUser ? {
        id: Number(transaction.sourceUser.id),
        name: transaction.sourceUser.name,
        email: transaction.sourceUser.email
      } : null
    }

    return NextResponse.json({
      success: true,
      data: serializedTransaction
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao criar transação:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

