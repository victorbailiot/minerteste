/**
 * Webhook da PagarMe para processar notificações de pagamento
 * https://docs.pagar.me/reference/webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { confirmPagarMePayment } from '@/lib/payment-confirmation'
import { setupBigIntSerialization } from '@/lib/utils'
import { Decimal } from '@prisma/client/runtime/library'
import { PagarMeWebhookPayload, PagarMeWebhookData } from '../../../../lib/pagarme/PagarMeWebhookPayload'
import { Recipient } from '../../../../lib/pagarme/Recipient'
import { Transfer } from '../../../../lib/pagarme/Transfer'
import { Usage } from '../../../../lib/pagarme/Usage'
import { processPackagePurchaseUnilevel, processUnilevelActivationPIX } from '@/lib/business-logic-unilevel'
import { 
  processPackagePayment,
  createPackagePaymentData
} from '@/lib/package-payment-processor'
import { processOrderBonuses } from '@/lib/services/storeMLMService'
import { processStoreOrderCouponGeneration } from '@/lib/services/store-coupon-service'

// Configurar serialização BigInt para esta rota
setupBigIntSerialization()


// Função para verificar assinatura do webhook (opcional, mas recomendado)
function verifyWebhookSignature(payload: string, signature: string): boolean {
  // Implementar verificação de assinatura se necessário
  // Por enquanto, retorna true para desenvolvimento
  return true
}

// Função para processar pagamento PIX aprovado
export async function processPixPayment(orderData: PagarMeWebhookPayload['data']) {
  try {
    console.log('🔄 Processando pagamento PIX aprovado:', orderData)

    // Buscar transação no banco
    const transacao = await prisma.transaction.findFirst({
      where: {
        correlationID: orderData.id
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!transacao) {
      console.error('❌ Transação não encontrada para orderId:', orderData.id)
      return false
    }

    // Verificar se já foi processada
    if (transacao.status === 'COMPLETED') {
      console.log('✅ Transação já foi processada:', transacao.id)
      return true
    }

    // Extrair informações do metadata
    const userId = orderData.metadata?.user_id ? BigInt(orderData.metadata.user_id) : null
    const packageId = orderData.metadata?.package_id ? BigInt(orderData.metadata.package_id) : null
    const minerId = orderData.metadata?.miner_id ? BigInt(orderData.metadata.miner_id) : null
    const quantity = orderData.metadata?.quantity ? Number(orderData.metadata.quantity) : 1
    const tipoCompra = orderData.metadata?.tipo_compra || ''

    // Se o pagamento foi aprovado, confirmar pagamento e processar bonificações
    if (orderData.status === 'paid') {
      console.log('💰 Pagamento aprovado, confirmando pagamento...')

      try {
        // Confirmar pagamento usando função global
        const result = await confirmPagarMePayment(orderData)

        if (result.success) {
          console.log('✅ Pagamento confirmado com sucesso')

          // 🛍️ VERIFICAR SE É COMPRA DA LOJA
          if (tipoCompra === 'carrinho_integrado' || tipoCompra === 'loja') {
            console.log('🛍️ Detectado pedido da LOJA - Processando bônus MLM e pontos...')
            
            try {
              // Buscar pedido da loja pelo correlationID da transação
              const storePedido = await prisma.storeOrder.findFirst({
                where: {
                  transactionId: transacao.id
                },
                include: {
                  items: true,
                  user: true
                }
              })

              if (storePedido) {
                console.log(`🎁 Pedido #${storePedido.orderNumber} encontrado - Total: R$ ${storePedido.total}`)
                
                // Atualizar status do pedido para CONFIRMED (status do pedido) e PAID (status de pagamento)
                await prisma.storeOrder.update({
                  where: { id: storePedido.id },
                  data: {
                    status: 'CONFIRMED',
                    paymentStatus: 'PAID',
                    paidAt: new Date()
                  }
                })

                // 🎉 PROCESSAR BÔNUS MLM E PONTOS
                const bonusResult = await processOrderBonuses(storePedido.id)
                
                // 🎟️ GERAR CUPONS para produtos digitais que geram cupom
                try {
                  const couponResult = await processStoreOrderCouponGeneration(storePedido.id)
                  if (couponResult.generated > 0) {
                    console.log(`🎟️ Cupons gerados: ${couponResult.generated}`)
                  }
                  if (couponResult.errors.length > 0) {
                    console.warn('⚠️ Erros na geração de cupons:', couponResult.errors)
                  }
                } catch (couponError) {
                  console.error('⚠️ Erro ao gerar cupons do pedido (não impacta pagamento):', couponError)
                }
                
                console.log('🎉 Resultado do processamento MLM:')
                console.log(`   💰 Bônus direto: R$ ${bonusResult.directBonus.toFixed(2)}`)
                console.log(`   💸 Total bônus indiretos: R$ ${bonusResult.indirectBonuses.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}`)
                console.log(`   📊 Pontos gerados: ${bonusResult.pointsGenerated}`)
                console.log(`   🎁 Total distribuído: R$ ${bonusResult.totalBonuses.toFixed(2)}`)

                // Atualizar transação com informações do processamento
                await prisma.transaction.update({
                  where: { id: transacao.id },
                  data: {
                    status: 'COMPLETED',
                    paidAt: new Date(),
                    description: `${transacao.description} - Bônus: R$ ${bonusResult.totalBonuses.toFixed(2)}, Pontos: ${bonusResult.pointsGenerated}`
                  }
                })

                console.log('✅ Bônus MLM e pontos processados com sucesso!')
              } else {
                console.log('⚠️ Pedido da loja não encontrado para esta transação')
              }
            } catch (storeError) {
              console.error('❌ Erro ao processar pedido da loja:', storeError)
              // Não falhar o webhook por erro no processamento
            }
          } 
          // 📦 PROCESSAR PACOTE MLM NORMAL
          else if (userId && packageId && minerId) {
            console.log('📦 Processando pagamento de pacote MLM com funcionalidades integradas...')

            try {
              // Criar dados de pagamento
              const paymentData = await createPackagePaymentData(
                userId,
                packageId,
                orderData.id,
                quantity,
                minerId
              )
              
              if (paymentData) {
                // Processar pagamento com todas as funcionalidades integradas
                const result = await processPackagePayment(paymentData)
                
                if (result.success) {
                  
                  if (result.details.addedToClube300) {
                    console.log(`🏆 Usuário adicionado ao Clube dos 300 como membro #${result.details.clube300MemberNumber}`)
                  }
                  
                  if (result.errors.length > 0) {
                    console.log(`⚠️ Erros durante o processamento: ${result.errors.join(', ')}`)
                  }
                } else {
                  console.error('❌ Erro no processamento do pagamento:', result.message)
                  console.error('❌ Erros:', result.errors.join(', '))
                }
              } else {
                console.error('❌ Erro ao criar dados de pagamento')
              }
            } catch (bonusError) {
              console.error('❌ Erro ao executar processamento de pacote:', bonusError)
              // Não falhar o webhook por erro no processamento
              // O pagamento já foi confirmado
            }
          } else {
            console.log('⚠️ Dados do usuário, pacote ou mineradora não encontrados no metadata')
          }

          return true
        } else {
          console.error('❌ Erro ao confirmar pagamento:', result.error)
          return false
        }
      } catch (error) {
        console.error('❌ Erro ao processar confirmação do pagamento:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('❌ Erro ao processar pagamento PIX:', error)
    return false
  }
}

// Função para processar cancelamento de pagamento
async function processPaymentCancellation(orderData: PagarMeWebhookPayload['data']) {
  try {
    console.log('❌ Processando cancelamento de pagamento:', orderData.id)

    // Buscar transação no banco
    const transacao = await prisma.transaction.findFirst({
      where: {
        OR: [
          { correlationID: (orderData as any).code || orderData.id },
          { chargeId: orderData.id }
        ]
      }
    })

    if (!transacao) {
      console.error('❌ Transação não encontrada para cancelamento:', orderData.id)
      return false
    }

    // Atualizar status da transação
    await prisma.transaction.update({
      where: { id: transacao.id },
      data: {
        status: 'FAILED',
        updatedAt: new Date()
      }
    })

    console.log('✅ Cancelamento processado com sucesso')
    return true
  } catch (error) {
    console.error('❌ Erro ao processar cancelamento:', error)
    return false
  }
}

// Função para processar eventos de recebedor
async function processRecipientEvent(eventType: string, recipientData: Recipient) {
  try {
    console.log(`👤 Processando evento de recebedor: ${eventType}`, recipientData.id)
    

    // Buscar usuário pelo documento do recebedor
    const user = await prisma.user.findFirst({
      where: {
        id: recipientData.metadata?.userId
      }
    })
    
    if (!user) {
      console.log(`⚠️ Usuário não encontrado para o documento: ${recipientData.document}`)
      return true // Não é um erro, apenas não há usuário associado
    }

    console.log(`👤 Usuário encontrado: ${user.name} (ID: ${user.id})`)

    const bankAccount = await prisma.bankAccount.findUnique({
      where: {
        userId: user.id
      }
    })

    if (!bankAccount) {
      console.log(`⚠️ Conta bancária não encontrada para o usuário: ${user.id}`)
      return true // Não é um erro, apenas não há conta bancária
    }

    if (bankAccount.excludedAt) {
      console.log(`⚠️ Conta bancária removida pelo usuário; ignorando sync de status Pagar.me para: ${user.id}`)
      return true
    }

    // Atualizar o status do recebedor na conta bancária
    await prisma.bankAccount.update({
      where: {
        userId: user.id
      },
      data: {
        recipientStatus: recipientData.status
      }
    })

    console.log(`✅ Status do recebedor atualizado para: ${recipientData.status}`)

    return true
  } catch (error) {
    console.error('❌ Erro ao processar evento de recebedor:', error)
    return false
  }
}

// Função para processar eventos de transferência
async function processTransferEvent(eventType: string, transferData: Transfer) {
  try {
    console.log(`💸 Processando evento de transferência: ${eventType}`, transferData.id)

    // Buscar transação pelo transferId
    const transacao = await prisma.transaction.findFirst({
      where: {
        transferId: transferData.id
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!transacao) {
      console.log(`⚠️ Transação não encontrada para transferId: ${transferData.id}`)
      return true // Não é um erro, apenas não há transação associada
    }

    console.log(`💳 Transação encontrada: ${transacao.id} (Usuário: ${transacao.user?.name})`)

    // Mapear status da transferência para status da transação
    let newStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' = 'PENDING'

    switch (transferData.status) {
      case 'transferred':
        newStatus = 'COMPLETED'
        break
      case 'failed':
        newStatus = 'FAILED'
        break
      case 'canceled':
        newStatus = 'CANCELLED'
        break
      case 'pending_transfer':
      case 'processing':
        newStatus = 'PENDING'
        break
      default:
        console.log(`ℹ️ Status de transferência não mapeado: ${transferData.status}`)
        return true
    }

    // Atualizar status da transação
    await prisma.transaction.update({
      where: { id: transacao.id },
      data: {
        status: newStatus,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Status da transação atualizado para: ${newStatus}`)


    return true
  } catch (error) {
    console.error('❌ Erro ao processar evento de transferência:', error)
    return false
  }
}

// Função para processar eventos de uso
async function processUsageEvent(eventType: string, usageData: Usage) {
  try {
    console.log(`📊 Processando evento de uso: ${eventType}`, usageData.id)

    switch (eventType) {
      case 'usage.created':
        console.log('📈 Uso criado:', usageData.quantity, usageData.description)
        // Registrar uso se necessário
        break

      case 'usage.updated':
        console.log('🔄 Uso atualizado:', usageData.id)
        // Atualizar informações de uso
        break

      case 'usage.deleted':
        console.log('🗑️ Uso deletado:', usageData.id)
        // Remover ou marcar como inativo
        break

      default:
        console.log(`ℹ️ Evento de uso não processado: ${eventType}`)
    }

    return true
  } catch (error) {
    console.error('❌ Erro ao processar evento de uso:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📨 Webhook PagarMe recebido')

    // Obter payload do webhook
    const payload: PagarMeWebhookPayload = await request.json()
    console.log('📋 Payload do webhook:', JSON.stringify(payload, null, 2))

    // Verificar assinatura do webhook (opcional)
    const signature = request.headers.get('x-hub-signature-256')
    if (signature && !verifyWebhookSignature(JSON.stringify(payload), signature)) {
      console.error('❌ Assinatura do webhook inválida')
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
    }

    // Processar diferentes tipos de eventos
    switch (payload.type) {
      // Eventos de pedido/order
      case 'order.paid':
        console.log('💰 Evento: Pedido pago')

        // Verificar se é uma ativação baseado no metadata
        const transactionType = payload.data.metadata?.transaction_type
        if (transactionType === 'activation') {
          console.log('🔄 Processando ativação unilevel...')

          try {
            // Buscar transação no banco
            const transacao = await prisma.transaction.findFirst({
              where: {
                correlationID: payload.data.id
              }
            })

            if (transacao && payload.data.metadata?.user_id) {
              const userId = BigInt(payload.data.metadata.user_id)

              // Atualizar status da transação para PROCESSING
              await prisma.transaction.update({
                where: { id: transacao.id },
                data: { status: 'COMPLETED', paidAt: new Date() }
              })

              await processUnilevelActivationPIX(
                userId,
                transacao.id,
                payload.data.id
              )

              // Atualizar status da transação para COMPLETED
              await prisma.transaction.update({
                where: { id: transacao.id },
                data: { status: 'COMPLETED' }
              })

              console.log('✅ Ativação unilevel processada com sucesso')
            } else {
              console.error('❌ Transação ou usuário não encontrado para ativação')
            }
          } catch (activationError) {
            console.error('❌ Erro ao processar ativação unilevel:', activationError)
          }
        } else {
          // Processar como pagamento normal
          await processPixPayment(payload.data)
        }
        break

      case 'order.payment_failed':
        console.log('❌ Evento: Pagamento falhou')
        await processPaymentCancellation(payload.data)
        break

      case 'order.canceled':
        console.log('🚫 Evento: Pedido cancelado')
        await processPaymentCancellation(payload.data)
        break

      case 'order.processing':
        console.log('⏳ Evento: Pedido em processamento')
        break

      case 'order.authorized':
        console.log('✅ Evento: Pedido autorizado')
        break

      case 'order.refused':
        console.log('❌ Evento: Pedido recusado')
        await processPaymentCancellation(payload.data)
        break

      case 'order.refunded':
        console.log('🔄 Evento: Pedido reembolsado')
        break

      case 'order.chargedback':
        console.log('⚠️ Evento: Pedido com chargeback')
        break

      case 'order.analyzing':
        console.log('🔍 Evento: Pedido em análise')
        break

      case 'order.pending_review':
        console.log('⏸️ Evento: Pedido pendente de revisão')
        break

      // Eventos de cobrança/charge
      case 'charge.paid':
        console.log('💰 Evento: Cobrança paga')
        await processPixPayment(payload.data)
        break

      case 'charge.payment_failed':
        console.log('❌ Evento: Cobrança falhou')
        await processPaymentCancellation(payload.data)
        break

      case 'charge.canceled':
        console.log('🚫 Evento: Cobrança cancelada')
        await processPaymentCancellation(payload.data)
        break

      case 'charge.processing':
        console.log('⏳ Evento: Cobrança em processamento')
        break

      case 'charge.pending':
        console.log('⏸️ Evento: Cobrança pendente')
        break

      // Eventos de recebedor/recipient
      case 'recipient.created':
        console.log('👤 Evento: Recebedor criado')
        await processRecipientEvent(payload.type, payload.data as Recipient)
        break

      case 'recipient.updated':
        console.log('🔄 Evento: Recebedor atualizado')
        await processRecipientEvent(payload.type, payload.data as Recipient)
        break

      case 'recipient.deleted':
        console.log('🗑️ Evento: Recebedor deletado')
        await processRecipientEvent(payload.type, payload.data as Recipient)
        break

      // Eventos de transferência/transfer
      case 'transfer.created':
        console.log('📝 Evento: Transferência criada')
        await processTransferEvent(payload.type, payload.data as Transfer)
        break

      case 'transfer.processing':
        console.log('⏳ Evento: Transferência em processamento')
        await processTransferEvent(payload.type, payload.data as Transfer)
        break

      case 'transfer.pending':
        console.log('⏸️ Evento: Transferência pendente')
        await processTransferEvent(payload.type, payload.data as Transfer)
        break

      case 'transfer.paid':
        console.log('✅ Evento: Transferência paga')
        await processTransferEvent(payload.type, payload.data as Transfer)
        break

      case 'transfer.failed':
        console.log('❌ Evento: Transferência falhou')
        await processTransferEvent(payload.type, payload.data as Transfer)
        break

      case 'transfer.canceled':
        console.log('🚫 Evento: Transferência cancelada')
        await processTransferEvent(payload.type, payload.data as Transfer)
        break

      // Eventos de uso/usage
      case 'usage.created':
        console.log('📈 Evento: Uso criado')
        await processUsageEvent(payload.type, payload.data as Usage)
        break

      case 'usage.updated':
        console.log('🔄 Evento: Uso atualizado')
        await processUsageEvent(payload.type, payload.data as Usage)
        break

      case 'usage.deleted':
        console.log('🗑️ Evento: Uso deletado')
        await processUsageEvent(payload.type, payload.data as Usage)
        break

      default:
        console.log(`ℹ️ Evento não processado: ${payload.type}`)
        break
    }

    // Retornar sucesso
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Erro ao processar webhook PagarMe:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Método GET para verificar se o webhook está funcionando
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Webhook PagarMe está funcionando',
    timestamp: new Date().toISOString()
  })
} 