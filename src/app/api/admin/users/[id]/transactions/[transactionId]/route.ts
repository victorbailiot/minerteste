import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, transactionId: string }> }
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
    const canDeleteTransactions = await hasPermission(currentUserId, 'transactions.delete')
    if (!canDeleteTransactions) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para deletar transações' },
        { status: 403 }
      )
    }

    const { transactionId } = await params
    const transactionIdBigInt = BigInt(parseInt(transactionId))

    if (isNaN(Number(transactionId))) {
      return NextResponse.json(
        { success: false, error: 'ID de transação inválido' },
        { status: 400 }
      )
    }

    // Buscar a transação
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionIdBigInt },
      select: {
        id: true,
        createdAt: true
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transação não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a transação foi criada há menos de 24 horas
    const now = new Date()
    const transactionDate = new Date(transaction.createdAt)
    const hoursDiff = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 24) {
      return NextResponse.json(
        { success: false, error: 'Transação só pode ser deletada dentro de 24 horas após criação' },
        { status: 400 }
      )
    }

    // Deletar a transação
    await prisma.transaction.delete({
      where: { id: transactionIdBigInt }
    })

    return NextResponse.json({
      success: true,
      message: 'Transação deletada com sucesso'
    })

  } catch (error) {
    console.error('Erro ao deletar transação:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

