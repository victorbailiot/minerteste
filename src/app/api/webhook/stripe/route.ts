/**
 * Webhook Stripe
 * Processa eventos de pagamento da Stripe
 */

import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent, verifyWebhookSignature } from '@/lib/stripe/stripe'
import { confirmStripePayment } from '@/lib/payment-confirmation'
import { processPackagePurchase } from '@/lib/business-logic'
import { prisma } from '@/lib/prisma'
import { processPackagePurchaseUnilevel } from '@/lib/business-logic-unilevel'
import { 
  processPackagePayment,
  createPackagePaymentData
} from '@/lib/package-payment-processor'

// ===== TIPOS =====

interface StripeWebhookPayload {
  id: string
  type: string
  data: {
    object: any
  }
  created: number
}

// ===== FUNÇÕES DE PROCESSAMENTO =====

/**
 * Processar pagamento aprovado
 */
async function processPaymentSucceeded(event: StripeWebhookPayload) {
  try {
    const paymentIntent = event.data.object
    
    console.log('💰 Processando pagamento aprovado:', paymentIntent.id)
    
    // Verificar se já foi processado
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        chargeId: paymentIntent.id,
        status: 'COMPLETED'
      }
    })

    if (existingTransaction) {
      console.log('⚠️ Pagamento já foi processado anteriormente')
      return true
    }

    // Confirmar pagamento
    const result = await confirmStripePayment(paymentIntent.id)
    
    if (result.success) {
      console.log('✅ Pagamento confirmado com sucesso')
      
      // Buscar dados do usuário e pacote para executar bonificações
      const userId = paymentIntent.metadata?.userId
      const packageId = paymentIntent.metadata?.packageId
      const minerId = paymentIntent.metadata?.minerId
      const correlationID = paymentIntent.metadata?.correlationID
      const quantity = paymentIntent.metadata?.quantity ? parseInt(paymentIntent.metadata.quantity) : 1

      if (userId && packageId && minerId) {
        console.log('🎁 Processando pagamento de pacote com funcionalidades integradas...')
        
        try {
          const userIdBigInt = BigInt(userId)
          const packageIdBigInt = BigInt(packageId)
          
          // Criar dados de pagamento
          const paymentData = await createPackagePaymentData(
            userIdBigInt,
            packageIdBigInt,
            correlationID || paymentIntent.id,
            quantity,
            BigInt(minerId)
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
    console.error('❌ Erro ao processar pagamento aprovado:', error)
    return false
  }
}

/**
 * Processar pagamento falhado
 */
async function processPaymentFailed(event: StripeWebhookPayload) {
  try {
    const paymentIntent = event.data.object
    
    console.log('❌ Processando pagamento falhado:', paymentIntent.id)
    
    // Buscar transação no banco
    const transaction = await prisma.transaction.findFirst({
      where: {
        chargeId: paymentIntent.id
      }
    })

    if (transaction) {
      // Atualizar status para FAILED
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED'
        }
      })

      console.log('✅ Status da transação atualizado para FAILED')
    }

    return true

  } catch (error) {
    console.error('❌ Erro ao processar pagamento falhado:', error)
    return false
  }
}

/**
 * Processar Checkout Session completada
 */
async function processCheckoutSessionCompleted(event: StripeWebhookPayload) {
  try {
    const session = event.data.object
    
    console.log('🛒 Processando Checkout Session completada:', session.id)
    
    // Extrair Payment Intent ID da sessão
    const paymentIntentId = session.payment_intent
    
    if (paymentIntentId) {
      // Processar como pagamento normal
      return await processPaymentSucceeded({
        id: event.id,
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            // Outros dados serão buscados do Stripe
          }
        },
        created: event.created
      })
    }

    return true

  } catch (error) {
    console.error('❌ Erro ao processar Checkout Session:', error)
    return false
  }
}

/**
 * Processar Payment Intent criado
 */
async function processPaymentIntentCreated(event: StripeWebhookPayload) {
  try {
    const paymentIntent = event.data.object
    
    console.log('🆕 Processando Payment Intent criado:', paymentIntent.id)
    console.log('📋 Status:', paymentIntent.status)
    console.log('💳 Método de pagamento:', paymentIntent.payment_method_types)
    
    // Para boleto, o next_action só aparece quando o Payment Intent é confirmado
    if (paymentIntent.payment_method_types?.includes('boleto')) {
      console.log('📄 Payment Intent de boleto criado')
      console.log('📋 Next Action:', paymentIntent.next_action)
      
      // Se já temos next_action, significa que o boleto foi gerado
      if (paymentIntent.next_action) {
        console.log('✅ Boleto já foi gerado com next_action')
        return await processPaymentIntentRequiresAction(event)
      } else {
        console.log('⏳ Aguardando confirmação do boleto...')
        // Aguardar evento requires_action ou async_payment_succeeded
      }
    }

    return true

  } catch (error) {
    console.error('❌ Erro ao processar Payment Intent criado:', error)
    return false
  }
}

/**
 * Processar Payment Intent que requer ação
 */
async function processPaymentIntentRequiresAction(event: StripeWebhookPayload) {
  try {
    const paymentIntent = event.data.object
    
    console.log('⚡ Processando Payment Intent que requer ação:', paymentIntent.id)
    console.log('📋 Next Action:', JSON.stringify(paymentIntent.next_action, null, 2))
    
    // Para boleto, extrair dados do boleto
    if (paymentIntent.payment_method_types?.includes('boleto')) {
      const boletoAction = paymentIntent.next_action?.boleto_display_details
      
      if (boletoAction) {
        console.log('📄 Dados do boleto encontrados:')
        console.log('- URL:', boletoAction.hosted_voucher_url)
        console.log('- PDF:', boletoAction.pdf)
        console.log('- Expira em:', boletoAction.expires_at)
        
        // Atualizar transação com dados do boleto
        const transaction = await prisma.transaction.findFirst({
          where: {
            chargeId: paymentIntent.id
          }
        })

        if (transaction) {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              description: `Boleto gerado - URL: ${boletoAction.hosted_voucher_url} - PDF: ${boletoAction.pdf} - Expira: ${boletoAction.expires_at}`
            }
          })

          console.log('✅ Transação atualizada com dados do boleto')
        }

        // Enviar email com dados do boleto (opcional)
        console.log('📧 Dados do boleto disponíveis para envio de email:')
        console.log('- hosted_voucher_url:', boletoAction.hosted_voucher_url)
        console.log('- pdf:', boletoAction.pdf)
        console.log('- expires_at:', boletoAction.expires_at)
      } else {
        console.log('⚠️ Dados do boleto não encontrados no next_action')
      }
    }

    return true

  } catch (error) {
    console.error('❌ Erro ao processar Payment Intent que requer ação:', error)
    return false
  }
}

/**
 * Processar pagamento assíncrono aprovado (Boleto/PIX)
 */
async function processAsyncPaymentSucceeded(event: StripeWebhookPayload) {
  try {
    const session = event.data.object
    
    console.log('✅ Processando pagamento assíncrono aprovado:', session.id)
    
    // Extrair Payment Intent ID da sessão
    const paymentIntentId = session.payment_intent
    
    if (paymentIntentId) {
      // Processar como pagamento normal
      return await processPaymentSucceeded({
        id: event.id,
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            // Outros dados serão buscados do Stripe
          }
        },
        created: event.created
      })
    }

    return true

  } catch (error) {
    console.error('❌ Erro ao processar pagamento assíncrono aprovado:', error)
    return false
  }
}

/**
 * Processar pagamento assíncrono falhou (Boleto/PIX)
 */
async function processAsyncPaymentFailed(event: StripeWebhookPayload) {
  try {
    const session = event.data.object
    
    console.log('❌ Processando pagamento assíncrono falhou:', session.id)
    
    // Extrair Payment Intent ID da sessão
    const paymentIntentId = session.payment_intent
    
    if (paymentIntentId) {
      // Processar como pagamento falhado
      return await processPaymentFailed({
        id: event.id,
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: paymentIntentId,
            // Outros dados serão buscados do Stripe
          }
        },
        created: event.created
      })
    }

    return true

  } catch (error) {
    console.error('❌ Erro ao processar pagamento assíncrono falhou:', error)
    return false
  }
}

/**
 * Processar Checkout Session expirada
 */
async function processCheckoutSessionExpired(event: StripeWebhookPayload) {
  try {
    const session = event.data.object
    
    console.log('⏰ Processando Checkout Session expirada:', session.id)
    
    // Buscar transação por correlationID da sessão
    const transaction = await prisma.transaction.findFirst({
      where: {
        correlationID: session.id
      }
    })

    if (transaction) {
      // Atualizar status para FAILED
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED'
        }
      })

      console.log('✅ Status da transação atualizado para FAILED (expirada)')
    }

    return true

  } catch (error) {
    console.error('❌ Erro ao processar Checkout Session expirada:', error)
    return false
  }
}

// ===== HANDLER PRINCIPAL =====

/**
 * POST /api/webhook/stripe
 * Processar webhooks da Stripe
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📨 Webhook Stripe recebido')

    // 1. Obter payload do webhook
    const payload = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ Assinatura do webhook não encontrada')
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 400 }
      )
    }

    // 2. Verificar assinatura do webhook
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET não configurado')
      return NextResponse.json(
        { error: 'Webhook secret não configurado' },
        { status: 500 }
      )
    }

    let event: StripeWebhookPayload

    try {
      event = constructWebhookEvent(payload, signature, webhookSecret)
    } catch (error) {
      console.error('❌ Assinatura do webhook inválida:', error)
      return NextResponse.json(
        { error: 'Assinatura inválida' },
        { status: 400 }
      )
    }

    console.log('📋 Evento recebido:', event.type)

    // 3. Processar diferentes tipos de eventos
    let success = false

    switch (event.type) {
      case 'payment_intent.succeeded':
        //COMANDO PARA USAR WEBHOOK PELO cmd
        //stripe listen --forward-to 192.168.28.110:3000/api/webhook/stripe
        console.log('💰 Evento: Payment Intent aprovado')
        console.log(JSON.stringify(event, null, 2))
        success = await processPaymentSucceeded(event)
        break

      case 'payment_intent.payment_failed':
        console.log('❌ Evento: Payment Intent falhou')
        success = await processPaymentFailed(event)
        break

      case 'payment_intent.created':
        console.log('🆕 Evento: Payment Intent criado')
        success = await processPaymentIntentCreated(event)
        break

      case 'payment_intent.requires_action':
        console.log('⚡ Evento: Payment Intent requer ação')
        success = await processPaymentIntentRequiresAction(event)
        break

      case 'checkout.session.completed':
        console.log('🛒 Evento: Checkout Session completada')
        success = await processCheckoutSessionCompleted(event)
        break

      case 'checkout.session.async_payment_succeeded':
        console.log('✅ Evento: Pagamento assíncrono aprovado (Boleto/PIX)')
        success = await processAsyncPaymentSucceeded(event)
        break

      case 'checkout.session.async_payment_failed':
        console.log('❌ Evento: Pagamento assíncrono falhou (Boleto/PIX)')
        success = await processAsyncPaymentFailed(event)
        break

      case 'checkout.session.expired':
        console.log('⏰ Evento: Checkout Session expirada')
        success = await processCheckoutSessionExpired(event)
        break

      case 'invoice.payment_succeeded':
        console.log('📄 Evento: Fatura paga (assinatura)')
        // Implementar lógica para assinaturas se necessário
        success = true
        break

      case 'invoice.payment_failed':
        console.log('📄 Evento: Fatura falhou (assinatura)')
        // Implementar lógica para assinaturas se necessário
        success = true
        break

      default:
        console.log(`ℹ️ Evento não processado: ${event.type}`)
        success = true // Não processar, mas não é erro
        break
    }

    // 4. Registrar log do webhook
    await prisma.systemLog.create({
      data: {
        level: success ? 'INFO' : 'ERROR',
        category: 'INTEGRATION',
        message: `Webhook Stripe: ${event.type}`,
        details: JSON.stringify({
          eventId: event.id,
          eventType: event.type,
          success: success,
          timestamp: new Date().toISOString()
        })
      }
    })

    // 5. Retornar resposta
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Erro ao processar evento' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Erro ao processar webhook Stripe:', error)
    
    // Registrar erro no log
    try {
      await prisma.systemLog.create({
        data: {
          level: 'ERROR',
          category: 'INTEGRATION',
          message: 'Erro ao processar webhook Stripe',
          details: JSON.stringify({
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            timestamp: new Date().toISOString()
          })
        }
      })
    } catch (logError) {
      console.error('❌ Erro ao registrar log:', logError)
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhook/stripe
 * Verificar se o webhook está funcionando
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Webhook Stripe está funcionando',
    timestamp: new Date().toISOString()
  })
}
