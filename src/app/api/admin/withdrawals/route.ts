import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/middleware/check-permission'
import { hasPermission } from '@/lib/authorization'
import { createTransfer } from '@/lib/pagarme/pagarme'
import { z } from 'zod'
import { logAdminAction } from '@/lib/admin-audit'
import { getActiveBankAndPix } from '@/lib/bradesco/transfer-utils'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'withdrawals.read')) {
      return NextResponse.json({ error: 'Sem permissão para visualizar saques' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    // Buscar saques (transações do tipo WITHDRAWAL) com dados do usuário
    const [withdrawals, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          ...where,
          type: 'WITHDRAWAL'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              bankAccount: {
                select: {
                  id: true,
                  recipientId: true,
                  bankName: true,
                  accountNumber: true,
                  excludedAt: true,
                }
              },
              pixKey: {
                select: {
                  pixKey: true,
                  pixKeyType: true,
                  accountHolderName: true,
                  bankName: true,
                  excludedAt: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.transaction.count({ 
        where: {
          ...where,
          type: 'WITHDRAWAL'
        }
      })
    ])

    // Formatar resposta
    const formattedWithdrawals = withdrawals.map(withdrawal => {
      const isApproved = withdrawal.description.includes(' - Aprovado em:')
      const isCompleted = withdrawal.status === 'COMPLETED'
      const isRejected = withdrawal.status === 'FAILED'
      
      // Determinar status visual para o frontend
      let displayStatus: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'FAILED'
      if (isCompleted) {
        displayStatus = 'COMPLETED'
      } else if (isRejected) {
        displayStatus = 'FAILED'
      } else if (isApproved) {
        displayStatus = 'APPROVED'
      } else {
        displayStatus = 'PENDING'
      }

      const { bankAccount: activeBank, pixKey: activePix } = getActiveBankAndPix(
        withdrawal.user?.bankAccount ?? null,
        withdrawal.user?.pixKey ?? null
      )

      return {
        id: Number(withdrawal.id),
        amount: Number(withdrawal.amount),
        taxa: withdrawal.taxa ? Number(withdrawal.taxa) : null,
        status: displayStatus,
        bankAccount: withdrawal.description || 'N/A', // Usar description como bankAccount temporariamente
        pix: withdrawal.pixBrCode || null,
        requestedAt: withdrawal.createdAt,
        processedAt: withdrawal.paidAt || null,
        rejectedReason: isRejected ? 'Saque rejeitado' : null,
        processedBy: null, // Não temos esse campo na Transaction
        transferId: withdrawal.transferId,
        transferStatus: withdrawal.transferId ? 'pending_transfer' : null, // Status padrão para transferências
        description: withdrawal.description,
        user: {
          id: Number(withdrawal.user?.id),
          name: withdrawal.user?.name,
          email: withdrawal.user?.email,
          phone: withdrawal.user?.phone,
          bankAccount: activeBank
            ? {
                id: activeBank.id.toString(),
                recipientId: activeBank.recipientId,
                bankName: activeBank.bankName || 'Banco não informado',
                accountNumber: activeBank.accountNumber,
              }
            : null,
          pixKey: activePix
            ? {
                pixKey: activePix.pixKey,
                pixKeyType: activePix.pixKeyType,
                accountHolderName: activePix.accountHolderName,
                bankName: activePix.bankName,
              }
            : null,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedWithdrawals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar saques:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// Schema para processar transferência
const processTransferSchema = z.object({
  transactionId: z.string().min(1, 'ID da transação é obrigatório'),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'withdrawals.approve')) {
      return NextResponse.json({ error: 'Sem permissão para aprovar saques' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = processTransferSchema.parse(body)

    // Buscar transação de saque
    const transaction = await prisma.transaction.findUnique({
      where: { id: BigInt(validatedData.transactionId) },
      include: {
        user: {
          include: {
            bankAccount: true
          }
        }
      }
    })

    if (!transaction) {
      return NextResponse.json({ 
        error: 'Transação não encontrada' 
      }, { status: 404 })
    }

    if (transaction.type !== 'WITHDRAWAL') {
      return NextResponse.json({ 
        error: 'Transação não é um saque' 
      }, { status: 400 })
    }

    if (transaction.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Transação já foi processada' 
      }, { status: 400 })
    }

    if (!transaction.user?.bankAccount) {
      return NextResponse.json({ 
        error: 'Usuário não possui conta bancária cadastrada' 
      }, { status: 400 })
    }

    if (validatedData.action === 'reject') {
      // Rejeitar saque
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          description: transaction.description + ` - Rejeitado: ${validatedData.reason || 'Sem motivo especificado'}`
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Saque rejeitado com sucesso'
      })
    }

    // Aprovar e processar transferência
    try {
      const transferResponse = await createTransfer({
        amount: Number(transaction.amount),
        recipientId: transaction.user.bankAccount.recipientId,
        metadata: {
          transaction_id: transaction.id.toString(),
          user_id: transaction.user.id.toString(),
          user_name: transaction.user.name,
          admin_id: user.id
        }
      })

      // Atualizar transação com ID da transferência
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          transferId: transferResponse.id,
          description: transaction.description + ` - Transferência: ${transferResponse.id}`
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Transferência processada com sucesso',
        data: {
          transactionId: Number(transaction.id),
          transferId: transferResponse.id,
          transferStatus: transferResponse.status
        }
      })

    } catch (transferError) {
      console.error('Erro ao processar transferência:', transferError)
      
      // Atualizar transação como falhada
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          description: transaction.description + ` - Erro na transferência: ${transferError instanceof Error ? transferError.message : 'Erro desconhecido'}`
        }
      })

      return NextResponse.json({
        success: false,
        error: 'Erro ao processar transferência. Tente novamente.'
      }, { status: 500 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Dados inválidos', 
        details: error.issues 
      }, { status: 400 })
    }

    console.error('Erro ao processar saque:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// PUT para aprovar/rejeitar/desfazer/finalizar saques
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação e permissões
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = BigInt(user.id)
    if (!await hasPermission(userId, 'withdrawals.approve')) {
      return NextResponse.json({ error: 'Sem permissão para aprovar saques' }, { status: 403 })
    }

    const body = await request.json()
    const { withdrawalId, action, rejectedReason } = body

    if (!withdrawalId || !action) {
      return NextResponse.json({
        error: 'ID do saque e ação são obrigatórios'
      }, { status: 400 })
    }

    if (!['approve', 'reject', 'undo_approval', 'complete', 'confirm'].includes(action)) {
      return NextResponse.json({
        error: 'Ação deve ser "approve", "reject", "undo_approval", "confirm" ou "complete"'
      }, { status: 400 })
    }

    if (action === 'reject' && !rejectedReason) {
      return NextResponse.json({
        error: 'Motivo da rejeição é obrigatório'
      }, { status: 400 })
    }

    // Buscar a transação de saque
    const transaction = await prisma.transaction.findUnique({
      where: { id: BigInt(withdrawalId) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            pixKey: true,
            bankAccount: true
          }
        }
      }
    })

    if (!transaction) {
      return NextResponse.json({
        error: 'Transação de saque não encontrada'
      }, { status: 404 })
    }

    if (transaction.type !== 'WITHDRAWAL') {
      return NextResponse.json({
        error: 'Transação não é um saque'
      }, { status: 400 })
    }

    // Verificar se a transação já foi aprovada (através da descrição)
    const isApproved = transaction.description.includes(' - Aprovado em:')
    const isRejected = transaction.status === 'FAILED'

    // Validar status atual para a ação
    let newStatus: 'PENDING' | 'COMPLETED' | 'FAILED'
    let newDescription: string
    let message: string
    const updateData: any = {
      updatedAt: new Date()
    }

    switch (action) {
      case 'approve':
        if (transaction.status !== 'PENDING' || isApproved) {
          return NextResponse.json({
            error: 'Só é possível aprovar saques pendentes que ainda não foram aprovados'
          }, { status: 400 })
        }
        {
          const { bankAccount: b, pixKey: p } = getActiveBankAndPix(
            transaction.user?.bankAccount ?? null,
            transaction.user?.pixKey ?? null
          )
          if (!b && !p) {
            return NextResponse.json(
              {
                error:
                  'Usuário não possui chave PIX nem conta bancária ativas no perfil. Peça que cadastre novamente antes de aprovar.',
              },
              { status: 400 }
            )
          }
        }
        newStatus = 'PENDING' // Mantém PENDING até ser finalizado
        newDescription = transaction.description + ` - Aprovado em: ${new Date().toISOString()}`
        message = 'Solicitação de saque aprovada com sucesso'
        updateData.status = newStatus
        updateData.description = newDescription
        break

      case 'reject':
        if (transaction.status !== 'PENDING') {
          return NextResponse.json({
            error: 'Só é possível rejeitar saques pendentes'
          }, { status: 400 })
        }
        newStatus = 'FAILED'
        newDescription = transaction.description + ` - Rejeitado em: ${new Date().toISOString()}`
        message = 'Solicitação de saque rejeitada com sucesso'
        updateData.status = newStatus
        updateData.description = newDescription
        break

      case 'complete':
        if (transaction.status !== 'PENDING' || !isApproved) {
          return NextResponse.json({
            error: 'Só é possível finalizar saques que foram aprovados'
          }, { status: 400 })
        }

        // Finalizar saque alterando status para COMPLETED
        newStatus = 'COMPLETED'
        newDescription = transaction.description + ` - Finalizado em: ${new Date().toISOString()}`
        message = 'Solicitação de saque finalizada com sucesso'
        
        updateData.status = newStatus
        updateData.description = newDescription
        updateData.paidAt = new Date()
        break

      case 'undo_approval':
        if (transaction.status !== 'PENDING' || !isApproved || isRejected) {
          return NextResponse.json({
            error: 'Só é possível reverter aprovação de saques aprovados que ainda não foram concluídos ou rejeitados'
          }, { status: 400 })
        }
        {
          const marker = ' - Aprovado em:'
          const cut = transaction.description.indexOf(marker)
          if (cut === -1) {
            return NextResponse.json({
              error: 'Saque não possui registro de aprovação para reverter'
            }, { status: 400 })
          }
          newStatus = 'PENDING'
          newDescription = transaction.description.slice(0, cut)
          message = 'Aprovação revertida. O saque voltou para pendente.'
          updateData.status = newStatus
          updateData.description = newDescription
        }
        break

      default:
        return NextResponse.json({
          error: 'Ação inválida'
        }, { status: 400 })
    }

    // Processar a ação - atualizar a transação
    // updateData já foi configurado no switch acima

    // Atualizar a transação
    const updatedTransaction = await prisma.transaction.update({
      where: { id: BigInt(withdrawalId) },
      data: updateData
    })

    console.log(`✅ Transação atualizada: ID ${withdrawalId}, Status: ${updateData.status}`)

    // Registrar auditoria administrativa
    try {
      await logAdminAction({
        actionType:
          action === 'approve'
            ? 'WITHDRAWAL_APPROVED'
            : action === 'reject'
              ? 'WITHDRAWAL_REJECTED'
              : action === 'complete'
                ? 'WITHDRAWAL_COMPLETED'
                : 'OTHER',
        performedBy: BigInt(user.id),
        targetUserId: updatedTransaction.userId ?? undefined,
        resourceType: 'WITHDRAWAL',
        resourceId: updatedTransaction.id,
        oldValue: { status: transaction.status, description: transaction.description },
        newValue: { status: updateData.status, description: updateData.description },
        description:
          action === 'undo_approval'
            ? `Saque: aprovação revertida por admin ${user.id}`
            : `Saque ${action} por admin ${user.id}`,
        metadata: {
          rejectedReason: action === 'reject' ? rejectedReason ?? null : null,
          ...(action === 'undo_approval' ? { undoApproval: true } : {}),
        },
      })
    } catch (e) {
      console.error('Falha ao auditar ação de saque:', e)
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        id: Number(transaction.id),
        status: updateData.status,
        updatedAt: updateData.updatedAt,
        transferId: updateData.transferId || null,
        transferStatus: updateData.transferId ? 'pending' : null
      }
    })

  } catch (error) {
    console.error('Erro ao processar saque:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}