import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { getUserBalance } from '@/lib/business-logic'
import { compare } from 'bcryptjs'
import { isBlacklisted } from '@/lib/blacklist'

const transferSchema = z.object({
  recipientId: z.number().int().positive(),
  amount: z.number().positive().min(0.01),
  financialPassword: z.string().min(1, 'Senha financeira é obrigatória')
})

/**
 * POST /api/transfers
 * Realiza transferência de saldo entre usuários
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

    const senderId = BigInt(session.user.id)
    const body = await request.json()

    // Usuário na blacklist para "Transferência de bônus" não pode transferir
    const blacklistCheck = await isBlacklisted(senderId, 'bonus', 'transfer')
    if (blacklistCheck.blocked) {
      return NextResponse.json(
        { error: blacklistCheck.reason || 'Você não está autorizado a realizar transferências de bônus.' },
        { status: 403 }
      )
    }

    // Validar dados
    const validatedData = transferSchema.parse(body)
    const recipientId = BigInt(validatedData.recipientId)
    const amount = new Decimal(validatedData.amount)

    // Verificar e validar senha financeira
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: {
        financialPassword: true
      }
    })

    if (!sender?.financialPassword) {
      return NextResponse.json(
        { error: 'Você precisa criar uma senha financeira antes de realizar transferências' },
        { status: 400 }
      )
    }

    const isPasswordValid = await compare(validatedData.financialPassword, sender.financialPassword)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Senha financeira incorreta' },
        { status: 400 }
      )
    }

    // Verificar se não está tentando transferir para si mesmo
    if (senderId === recipientId) {
      return NextResponse.json(
        { error: 'Você não pode transferir para si mesmo' },
        { status: 400 }
      )
    }

    // Verificar se o destinatário existe e está ativo
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        id: true,
        name: true,
        isActive: true
      }
    })

    if (!recipient) {
      return NextResponse.json(
        { error: 'Usuário destinatário não encontrado' },
        { status: 404 }
      )
    }

    if (!recipient.isActive) {
      return NextResponse.json(
        { error: 'Usuário destinatário não está ativo' },
        { status: 400 }
      )
    }

    // Verificar saldo do remetente
    const senderBalance = await getUserBalance(senderId)
    
    if (senderBalance.lessThan(amount)) {
      return NextResponse.json(
        { error: 'Saldo insuficiente para realizar a transferência' },
        { status: 400 }
      )
    }

    // Gerar ID único para a transferência
    const transferId = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Criar apenas uma transação - a lógica de débito/crédito é determinada pelo sourceUserId
    // Remetente: userId = senderId, sourceUserId = recipientId → débito (subtrai do saldo)
    // Para o destinatário receber, precisamos buscar transações onde sourceUserId = recipientId
    const transaction = await prisma.transaction.create({
      data: {
        userId: senderId,
        type: 'TRANSFER',
        amount: amount,
        description: `Transferência enviada para ${recipient.name}`,
        status: 'COMPLETED',
        sourceUserId: recipientId,
        transferId: transferId
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Transferência realizada com sucesso',
      data: {
        transferId: transferId,
        amount: Number(amount),
        recipient: {
          id: Number(recipientId),
          name: recipient.name
        }
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Erro ao realizar transferência:', error)
    return NextResponse.json(
      { error: 'Erro ao realizar transferência' },
      { status: 500 }
    )
  }
}

