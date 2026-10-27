/**
 * Webhook Handler para eventos da OpenPix
 * Endpoint: POST /api/webhook/openpix
 */

import { NextRequest, NextResponse } from 'next/server'
import { OpenPixAPI, openPixAPI } from '@/lib/openpix'
import { prisma } from '@/lib/prisma'
import { createUserPackage, processPackagePurchase } from '@/lib/business-logic'
import { Decimal } from '@prisma/client/runtime/library'
import { DIRECT_INDIRECT_BONUS_TYPES } from '@/lib/transaction-types'

/**
 * Atualiza o expiresAt do userPackage para 365 dias a partir de agora
 */
async function atualizarExpiresAtUserPackage(userId: bigint, packageId: bigint) {
  try {
    await prisma.userPackage.updateMany({
      where: {
        userId,
        packageId,
        isActive: true
      },
      data: {
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    })
    console.log(`✅ expiresAt do userPackage atualizado para 365 dias - UserId: ${Number(userId)}, PackageId: ${Number(packageId)}`)
  } catch (error) {
    console.error(`❌ Erro ao atualizar expiresAt do userPackage - UserId: ${Number(userId)}, PackageId: ${Number(packageId)}:`, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Obter payload do webhook
    const payload = await request.json()

    // 2. Log para debug (remover em produção)
    //console.log('Webhook OpenPix recebido:', JSON.stringify(payload, null, 2))

    // 3. Validar se é um payload válido da OpenPix
    // Temporariamente removendo validação para debug
    //console.log('Payload recebido:', JSON.stringify(payload, null, 2))

    if (!payload.event) {
      console.error('Payload sem evento:', payload)
      return NextResponse.json(
        { error: 'Payload inválido - evento missing' },
        { status: 400 }
      )
    }

    // 4. Processar diferentes tipos de eventos
    switch (payload.event) {
      case 'OPENPIX:CHARGE_CREATED':
        await processarCobrancaCriada(payload.charge)
        break

      case 'OPENPIX:CHARGE_COMPLETED':
        await processarCobrancaCompletada(payload.charge)
        break

      case 'OPENPIX:CHARGE_EXPIRED':
        await processarCobrancaExpirada(payload.charge)
        break

      case 'OPENPIX:TRANSACTION_CREATED':
        await processarTransacaoCriada(payload.charge)
        break

      case 'OPENPIX:TRANSACTION_RECEIVED':
        await processarTransacaoRecebida(payload.charge)
        break

      case 'OPENPIX:MOVEMENT_CREATED':
        await processarMovimentoCriado(payload.movement)
        break

      case 'OPENPIX:MOVEMENT_CONFIRMED':
        await processarPagamentoSaque(payload)
        break

      default:
        console.log(`Evento não tratado: ${payload.event}`)
    }

    // 5. Sempre retornar 200 para confirmar o recebimento
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao processar webhook OpenPix:', error)

    // Retornar erro 500 fará a OpenPix tentar reenviar o webhook
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * Processar evento de cobrança criada
 */
async function processarCobrancaCriada(charge: any) {
  console.log(`💰 Nova cobrança criada: ${charge.correlationID}`)
  console.log(`Valor: R$ ${OpenPixAPI.centavosToReais(charge.value)}`)

  try {
    // Exemplo: Salvar no banco de dados
    // await salvarCobrancaNoBanco({
    //   correlationID: charge.correlationID,
    //   valor: charge.value,
    //   status: 'ACTIVE',
    //   qrCode: charge.qrCodeImage,
    //   pixCopiaCola: charge.brCode,
    //   cliente: charge.customer,
    //   expiresAt: charge.expiresAt,
    //   createdAt: charge.createdAt
    // })

    // Exemplo: Enviar notificação
    // await enviarNotificacao({
    //   tipo: 'COBRANCA_CRIADA',
    //   correlationID: charge.correlationID,
    //   valor: charge.value
    // })

  } catch (error) {
    console.error('Erro ao processar cobrança criada:', error)
    throw error
  }
}

/**
 * Processar evento de cobrança completada (paga)
 */
async function processarCobrancaCompletada(charge: any) {
  console.log(`✅ Pagamento confirmado: ${charge.correlationID}`)
  console.log(`Valor pago: R$ ${OpenPixAPI.centavosToReais(charge.value)}`)
  console.log(`Cliente: ${charge.customer?.name || 'Não informado'}`)

  try {
    // Validar dados da cobrança
    if (!charge.correlationID) {
      console.error('❌ Cobrança sem correlationID')
      return
    }

    // Buscar transação no banco pelo correlationID
    console.log(`🔍 Buscando transação com correlationID: ${charge.correlationID}`)
    const transacao = await prisma.transaction.findFirst({
      where: { correlationID: charge.correlationID },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!transacao) {
      console.log(`❌ Transação não encontrada no banco: ${charge.correlationID}`)
      return
    }

    // Formatar transação para log (similar ao endpoint de transações)
          const formattedTransaction = {
        id: Number(transacao.id),
        userId: transacao.userId ? Number(transacao.userId) : null,
        type: transacao.type,
        amount: Number(transacao.amount),
        description: transacao.description,
        correlationID: transacao.correlationID,
        chargeId: transacao.chargeId,
        status: transacao.status,
        customerName: transacao.customerName,
        customerEmail: transacao.customerEmail,
        customerPhone: transacao.customerPhone,
        customerCpfCnpj: transacao.customerCpfCnpj,
        expiresAt: transacao.expiresAt,
        paidAt: transacao.paidAt,
        createdAt: transacao.createdAt,
        updatedAt: transacao.updatedAt,
        user: transacao.user
      }

    console.log(`✅ Transação encontrada:`, formattedTransaction)

    // Verificar se a transação já está com status COMPLETED
    if (transacao.status === 'COMPLETED') {
      console.log(`⚠️ Transação ${transacao.id} já está com status COMPLETED - verificando se bonificações foram executadas`)

      // Mesmo que já esteja COMPLETED, verificar se as bonificações foram executadas
      await processarTransacaoUnica(charge, transacao)
      return
    } else {
      // Atualizar status da transação
      const transacaoAtualizada = await prisma.transaction.update({
        where: { id: transacao.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      console.log(`✅ Transação ${transacao.id} atualizada para COMPLETED`)

      // Agora que o status é COMPLETED, processar a transação única
      await processarTransacaoUnica(charge, transacaoAtualizada)
    }
  } catch (error) {
    console.error('Erro ao processar cobrança completada:', error)
    throw error
  }
}

/**
 * Processar transação única (sem carrinho)
 */
async function processarTransacaoUnica(charge: any, transacao: any) {
  console.log(`💳 Processando transação única para transação ${transacao.id}`)

  try {
    // Executar bonificações diretamente
    await executarBonificacoes(transacao)

  } catch (error) {
    console.error('Erro ao processar transação única:', error)
    throw error
  }
}



/**
 * Processar evento de cobrança expirada
 */
async function processarCobrancaExpirada(charge: any) {
  console.log(`⏰ Cobrança expirada: ${charge.correlationID}`)

  try {
    // Validar dados da cobrança
    if (!charge.correlationID) {
      console.error('❌ Cobrança sem correlationID')
      return
    }

    // Buscar transação no banco pelo correlationID
    const transacao = await prisma.transaction.findFirst({
      where: { correlationID: charge.correlationID },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!transacao) {
      console.log(`❌ Transação não encontrada no banco: ${charge.correlationID}`)
      return
    }

    // Formatar transação para log
            const formattedTransaction = {
          id: Number(transacao.id),
          userId: transacao.userId ? Number(transacao.userId) : null,
          type: transacao.type,
          amount: Number(transacao.amount),
          status: transacao.status,
          correlationID: transacao.correlationID,
          createdAt: transacao.createdAt
        }

    console.log(`✅ Transação encontrada:`, formattedTransaction)

    // Verificar se a transação já está com status CANCELLED
    if (transacao.status === 'CANCELLED') {
      console.log(`⚠️ Transação ${transacao.id} já está com status CANCELLED - evitando processamento duplicado`)
      return
    }

    // Atualizar status da transação para CANCELLED
    const transacaoAtualizada = await prisma.transaction.update({
      where: { id: transacao.id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    })

    console.log(`❌ Transação ${transacao.id} marcada como CANCELLED (expirada)`)

  } catch (error) {
    console.error('Erro ao processar cobrança expirada:', error)
    throw error
  }
}

/**
 * Processar evento de transação criada
 */
async function processarTransacaoCriada(transaction: any) {
  console.log(`💳 Nova transação: ${transaction.transactionID}`)
  console.log(`Valor: R$ ${OpenPixAPI.centavosToReais(transaction.value)}`)

  try {
    // Validar dados da transação
    if (!transaction.transactionID) {
      console.error('❌ Transação sem transactionID')
      return
    }

    // Verificar se existe uma cobrança associada
    if (transaction.charge?.correlationID) {
      console.log(`🔍 Verificando transação no banco com correlationID: ${transaction.charge.correlationID}`)

      const transacaoExistente = await prisma.transaction.findFirst({
        where: { correlationID: transaction.charge.correlationID }
      })

      if (transacaoExistente) {
        console.log(`✅ Transação já existe no banco com correlationID: ${transaction.charge.correlationID}`)

        // Atualizar com o transactionID se necessário
        if (!transacaoExistente.chargeId) {
          await prisma.transaction.update({
            where: { id: transacaoExistente.id },
            data: {
              chargeId: transaction.transactionID,
              updatedAt: new Date()
            }
          })
          console.log(`✅ Transação atualizada com transactionID: ${transaction.transactionID}`)
        }
      } else {
        console.log(`⚠️ Nenhuma transação encontrada com correlationID: ${transaction.charge.correlationID}`)
      }
    } else {
      console.log(`⚠️ Transação sem cobrança associada: ${transaction.transactionID}`)
    }

  } catch (error) {
    console.error('Erro ao processar transação criada:', error)
    throw error
  }
}

/**
 * Processar evento de transação recebida
 */
async function processarTransacaoRecebida(charge: any) {

  console.log(`📥 Charge recebida: ${JSON.stringify(charge, null, 2)}`)
  console.log(' -------------------')
  console.log(`Valor: R$ ${OpenPixAPI.centavosToReais(charge.value)}`)

  try {
    // Verificar se é um pagamento manual
    const isManualPayment = charge.additionalInfo?.find(info => info.key === 'manual_payment')?.value === 'true'
    
    if (isManualPayment) {
      console.log(`🔧 Pagamento manual detectado - buscando dados da cobrança na OpenPix`)
      
      // Buscar dados da cobrança na OpenPix usando o chargeId
      if (charge.transactionID) {
        try {
          if (!openPixAPI) {
            throw new Error('OpenPix API não configurada')
          }
          const openPixCharge = await openPixAPI.getCharge(charge.transactionID)
          console.log(`✅ Dados da cobrança obtidos da OpenPix:`, openPixCharge.charge)
          
          // Usar os dados reais da cobrança da OpenPix
          charge = {
            ...charge,
            ...openPixCharge.charge,
            additionalInfo: openPixCharge.charge.additionalInfo || charge.additionalInfo
          }
          
          console.log(`🔄 Charge atualizada com dados da OpenPix:`, charge)
        } catch (openPixError) {
          console.error(`❌ Erro ao buscar cobrança na OpenPix:`, openPixError)
          console.log(`⚠️ Continuando com dados do webhook manual`)
        }
      }
    }

    // Validar dados da transação
    if (!charge.transactionID) {
      console.error('❌ Transação sem transactionID')
      return
    }

    console.log('charge.correlationID: ', charge.correlationID)

    const transacaoExistente = await prisma.transaction.findFirst({
      where: { chargeId: charge.transactionID },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (transacaoExistente) {
      console.log(`✅ Transação encontrada com chargeId: ${charge.transactionID}`)

      // Se a transação não estiver completa, atualizá-la para COMPLETED
      if (transacaoExistente.status !== 'COMPLETED') {
        console.log(`🔄 Atualizando status da transação ${transacaoExistente.id} para COMPLETED`)

        await prisma.transaction.update({
          where: { id: transacaoExistente.id },
          data: {
            status: 'COMPLETED',
            paidAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`✅ Transação ${transacaoExistente.id} atualizada para COMPLETED`)

        console.log('charge.additionalInfo: ', charge.additionalInfo)
        
        const userIdInfo = charge.additionalInfo?.find(info => info.key === 'usuario_id')
        const packageIdInfo = charge.additionalInfo?.find(info => info.key === 'plan_id')

        console.log('userIdInfo: ', userIdInfo)
        console.log('packageIdInfo: ', packageIdInfo)

        if (userIdInfo && packageIdInfo) {
          const activatedAt = new Date()
          const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 ano
          await createUserPackage(BigInt(userIdInfo.value), BigInt(packageIdInfo.value), true, activatedAt, expiresAt, transacaoExistente.id)
        } else {
          console.log(`⚠️ Dados de usuário ou pacote não encontrados no additionalInfo`)
        }
        
        // Agora que o status é COMPLETED, processar a transação única
        await processarTransacaoUnica(charge, transacaoExistente)
      } else {
        console.log(`ℹ️ Transação já está com status COMPLETED`)

        // Mesmo que já esteja COMPLETED, verificar se as bonificações foram executadas
        await executarBonificacoes(transacaoExistente)
      }
    } else {
      console.log(`ℹ️ Transação não encontrada com chargeId: ${charge.transactionID}`)
    }

  } catch (error) {
    console.error('Erro ao processar transação recebida:', error)
    throw error
  }
}

/**
 * Executar bonificações para uma transação completada
 */
async function executarBonificacoes(transacao: any) {
  console.log(`🎯 Verificando se bonificações devem ser executadas para transação ${transacao.id}`)

  // Verificar se a transação tem userId
  if (!transacao.userId) {
    console.log(`⚠️ Transação ${transacao.id} não tem userId - pulando bonificações`)
    return
  }

  // Buscar UserPackages relacionados a esta transação
  const userPackages = await prisma.userPackage.findMany({
    where: { transactionId: transacao.id },
    include: {
      package: {
        select: { id: true, name: true, price: true }
      }
    }
  })

  if (userPackages.length === 0) {
    console.log(`⚠️ Transação ${transacao.id} não tem UserPackages - pulando bonificações`)
    return
  }

  // Verificar se bônus já foram distribuídos para esta transação
  const bonusJaDistribuidos = await prisma.transaction.findMany({
    where: {
      type: { in: [...DIRECT_INDIRECT_BONUS_TYPES] },
      description: { contains: transacao.correlationID || 'NO_CORRELATION' }
    }
  })

  console.log(`📊 Bônus já distribuídos para esta transação: ${bonusJaDistribuidos.length}`)

  if (bonusJaDistribuidos.length === 0) {
    console.log(`🚀 Executando bonificações para usuário ${Number(transacao.userId)}`)
    console.log(`📦 UserPackages encontrados: ${userPackages.length}`)
    console.log(`💰 Valor da transação: R$ ${transacao.amount}`)
    console.log(`🆔 CorrelationID: ${transacao.correlationID}`)

    try {
      // Processar cada UserPackage individualmente
      for (const userPackage of userPackages) {
        console.log(`🔄 Processando UserPackage ${userPackage.id} - Pacote: ${userPackage.package.name}`)
        
        // Executar lógica de negócio para cada pacote
        await processPackagePurchase(
          transacao.userId,
          userPackage.packageId,
          userPackage.package.price, // Usar o preço do pacote (já é Decimal)
          undefined, // sponsorId
          `${transacao.correlationID}-userpackage-${userPackage.id}` // correlationID único para cada UserPackage
        )

        console.log(`✅ UserPackage ${userPackage.id} processado com sucesso`)
      }

      console.log(`🎉 Bonificações executadas com sucesso para usuário ${Number(transacao.userId)}`)

      // Verificar se bônus foram realmente criados
      const bonusCheck = await prisma.transaction.findMany({
        where: {
          type: { in: [...DIRECT_INDIRECT_BONUS_TYPES] },
          createdAt: { gte: new Date(Date.now() - 60000) } // últimos 60 segundos
        }
      })

      console.log(`📊 Verificação: ${bonusCheck.length} transações de bônus criadas nos últimos 60s`)
      if (bonusCheck.length === 0) {
        console.log(`❌ ALERTA: Nenhum bônus foi criado! Pode haver erro na lógica de negócio.`)
      }

    } catch (processError) {
      console.error(`❌ ERRO DETALHADO na execução das bonificações:`)
      if (processError instanceof Error) {
        console.error(`   Erro: ${processError.message}`)
        console.error(`   Nome: ${processError.name}`)
        console.error(`   Stack: ${processError.stack}`)
      } else {
        console.error(`   Erro: ${String(processError)}`)
      }
      console.error(`   UserId: ${transacao.userId}`)
      console.error(`   UserPackages: ${userPackages.length}`)
      console.error(`   Amount: ${transacao.amount}`)
      console.error(`   CorrelationID: ${transacao.correlationID}`)
      // NÃO fazer re-throw para evitar 500
      console.log(`🔄 Continuando processamento apesar do erro...`)
    }
  } else {
    console.log(`✅ Bônus já foram distribuídos para esta transação - pulando execução`)
    bonusJaDistribuidos.forEach(bonus => {
      console.log(`   💰 ${bonus.type}: R$ ${bonus.amount} (${bonus.createdAt})`)
    })
  }
}

/**
 * Processar evento de movimento criado
 */
async function processarMovimentoCriado(movement: any) {
  console.log(`📊 Novo movimento: ${movement.id}`)
  console.log(`Tipo: ${movement.type} | Valor: R$ ${OpenPixAPI.centavosToReais(movement.value)}`)

  try {
    // Validar dados do movimento
    if (!movement.id) {
      console.error('❌ Movimento sem ID')
      return
    }

    // Verificar se o movimento está associado a uma transação
    if (movement.transactionID) {
      console.log(`🔍 Movimento associado à transação: ${movement.transactionID}`)

      // Verificar se existe uma transação com este transactionID
      const transacaoExistente = await prisma.transaction.findFirst({
        where: { chargeId: movement.transactionID }
      })

      if (transacaoExistente) {
        console.log(`✅ Transação encontrada com chargeId: ${movement.transactionID}`)

        // Formatar transação para log
        const formattedTransaction = {
          id: Number(transacaoExistente.id),
          status: transacaoExistente.status,
          amount: Number(transacaoExistente.amount),
          type: transacaoExistente.type
        }

        console.log(`📝 Detalhes da transação:`, formattedTransaction)

        // Se for um movimento de crédito e a transação não estiver completa, atualizá-la
        if (movement.type === 'CREDIT' && transacaoExistente.status !== 'COMPLETED') {
          await prisma.transaction.update({
            where: { id: transacaoExistente.id },
            data: {
              status: 'COMPLETED',
              paidAt: new Date(movement.createdAt) || new Date(),
              updatedAt: new Date()
            }
          })
          console.log(`✅ Transação ${transacaoExistente.id} atualizada para COMPLETED baseado no movimento`)

        }
      } else {
        console.log(`ℹ️ Nenhuma transação encontrada com chargeId: ${movement.transactionID}`)
      }
    } else {
      console.log(`ℹ️ Movimento não associado a nenhuma transação`)
    }

    // Registrar o movimento no histórico (opcional)
    console.log(`📊 Movimento ${movement.id} processado: ${movement.type} - R$ ${OpenPixAPI.centavosToReais(movement.value)}`)

  } catch (error) {
    console.error('Erro ao processar movimento criado:', error)
    throw error
  }
}

/**
 * Processar evento de pagamento de saque atualizado
 */
async function processarPagamentoSaque(payload: any) {
  console.log(`💸 Pagamento de saque atualizado: ${payload.payment?.correlationID}`)
  console.log(`Status: ${payload.payment?.status}`)
  console.log(`Valor: R$ ${OpenPixAPI.centavosToReais(payload.payment?.value || 0)}`)

  try {
    // Validar dados do pagamento
    if (!payload.payment?.correlationID) {
      console.error('❌ Pagamento sem correlationID')
      return
    }

    // Extrair o ID do withdrawal do correlationID
    // Formato esperado: "withdrawal:5" onde 5 é o ID do withdrawal
    const correlationID = payload.payment.correlationID
    const withdrawalIdMatch = correlationID.match(/withdrawal:(\d+)/)

    if (!withdrawalIdMatch) {
      console.error(`❌ CorrelationID inválido para withdrawal: ${correlationID}`)
      return
    }

    const withdrawalId = parseInt(withdrawalIdMatch[1])
    console.log(`🔍 Buscando withdrawal com ID: ${withdrawalId}`)

    // Buscar o withdrawal no banco
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: BigInt(withdrawalId) },
      include: {
        user: true
      }
    })

    if (!withdrawal) {
      console.error(`❌ Withdrawal não encontrado com ID: ${withdrawalId}`)
      return
    }

    console.log(`✅ Withdrawal encontrado: ${withdrawal.id}`)
    console.log(`Status atual: ${withdrawal.status}`)
    console.log(`Usuário: ${withdrawal.user.name}`)

    // Mapear status da OpenPix para status do sistema
    let newWithdrawalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CONFIRMED'
    let newTransactionStatus: 'PENDING' | 'COMPLETED' | 'FAILED'
    let message: string

    switch (payload.payment.status) {
      case 'PENDING':
        newWithdrawalStatus = 'PENDING'
        newTransactionStatus = 'PENDING'
        message = 'Pagamento pendente na OpenPix'
        break

      case 'APPROVED':
        newWithdrawalStatus = 'APPROVED'
        newTransactionStatus = 'PENDING'
        message = 'Pagamento aprovado na OpenPix'
        break

      case 'COMPLETED':
        newWithdrawalStatus = 'COMPLETED'
        newTransactionStatus = 'COMPLETED'
        message = 'Pagamento finalizado na OpenPix'
        break
      case 'CONFIRMED':
        newWithdrawalStatus = 'CONFIRMED'
        newTransactionStatus = 'COMPLETED'
        message = 'Pagamento confirmado na OpenPix'
        break
      case 'FAILED':
      case 'REJECTED':
        newWithdrawalStatus = 'REJECTED'
        newTransactionStatus = 'FAILED'
        message = 'Pagamento falhou na OpenPix'
        break

      default:
        console.log(`ℹ️ Status não mapeado: ${payload.payment.status}`)
        return
    }

    // Atualizar o withdrawal
    await prisma.withdrawal.update({
      where: { id: BigInt(withdrawalId) },
      data: {
        status: newWithdrawalStatus,
        processedAt: new Date(),
        // Adicionar informações da transação se disponível
        ...(payload.transaction && {
          // Aqui você pode adicionar campos adicionais se necessário
        })
      }
    })

    console.log(`✅ Withdrawal ${withdrawalId} atualizado para status: ${newWithdrawalStatus}`)

    // Atualizar a transação correspondente
    const updatedTransaction = await prisma.transaction.updateMany({
      where: {
        userId: withdrawal.userId,
        type: 'WITHDRAWAL',
        referenceId: withdrawalId.toString()
      },
      data: {
        status: newTransactionStatus,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Transação atualizada: ${updatedTransaction.count} registros afetados`)

    // Log das informações da transação se disponível
    if (payload.transaction) {
      console.log(`📊 Transação OpenPix:`, {
        endToEndId: payload.transaction.endToEndId,
        time: payload.transaction.time,
        value: OpenPixAPI.centavosToReais(payload.transaction.value)
      })
    }

    // Log das informações do destinatário se disponível
    if (payload.destination) {
      console.log(`👤 Destinatário:`, {
        name: payload.destination.name,
        pixKey: payload.destination.pixKey,
        bank: payload.destination.bank
      })
    }

    console.log(`✅ Pagamento de saque processado com sucesso: ${message}`)

  } catch (error) {
    console.error('❌ Erro ao processar pagamento de saque:', error)
    throw error
  }
}

// Método GET para verificar se o webhook está funcionando
export async function GET() {
  return NextResponse.json({
    message: 'Webhook OpenPix está funcionando',
    timestamp: new Date().toISOString()
  })
}

// Exemplo de funções auxiliares (implementar conforme sua necessidade)

// async function salvarCobrancaNoBanco(dados: any) {
//   // Implementar salvamento no banco de dados
//   // Exemplo com Prisma:
//   // return await prisma.cobranca.create({ data: dados })
// }

// async function atualizarStatusCobranca(correlationID: string, status: string) {
//   // Implementar atualização no banco
//   // Exemplo com Prisma:
//   // return await prisma.cobranca.update({
//   //   where: { correlationID },
//   //   data: { status }
//   // })
// }

// async function enviarEmailConfirmacao(dados: any) {
//   // Implementar envio de email
//   // Exemplo com Nodemailer, SendGrid, etc.
// }

// async function processarPedido(correlationID: string) {
//   // Implementar processamento do pedido
//   // Exemplo: liberar produtos, gerar nota fiscal, etc.
// }

// async function notificarPagamentoConfirmado(dados: any) {
//   // Implementar notificação interna
//   // Exemplo: WebSocket, Server-Sent Events, etc.
// } 