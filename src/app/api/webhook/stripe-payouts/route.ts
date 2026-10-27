/**
 * Webhook Stripe Payouts
 * Monitora eventos de payouts para atualizar status das transações
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

interface StripePayoutEvent {
  id: string
  object: string
  type: string
  data: {
    object: Stripe.Payout
  }
  created: number
  livemode: boolean
}

/**
 * Processar evento de payout criado
 */
async function processPayoutCreated(event: StripePayoutEvent) {
  const payout = event.data.object
  
  console.log('💰 Payout criado:', {
    payoutId: payout.id,
    amount: payout.amount,
    currency: payout.currency,
    status: payout.status,
    metadata: payout.metadata
  })

  // Buscar transação relacionada pelo metadata
  if (payout.metadata?.transaction_id) {
    try {
      await prisma.transaction.update({
        where: { id: BigInt(payout.metadata.transaction_id) },
        data: {
          transferId: payout.id,
          description: `Payout Stripe criado: ${payout.id} - Status: ${payout.status}`
        }
      })

      console.log('✅ Transação atualizada com ID do payout:', payout.metadata.transaction_id)
    } catch (error) {
      console.error('❌ Erro ao atualizar transação:', error)
    }
  }
}

/**
 * Processar evento de payout atualizado
 */
async function processPayoutUpdated(event: StripePayoutEvent) {
  const payout = event.data.object
  
  console.log('🔄 Payout atualizado:', {
    payoutId: payout.id,
    status: payout.status,
    failureCode: payout.failure_code,
    failureMessage: payout.failure_message
  })

  // Buscar transação relacionada pelo metadata
  if (payout.metadata?.transaction_id) {
    try {
      let newStatus = 'COMPLETED'
      let description = `Payout Stripe: ${payout.id} - Status: ${payout.status}`

      // Se o payout falhou, marcar transação como falhada
      if (payout.status === 'failed') {
        newStatus = 'FAILED'
        description += ` - Erro: ${payout.failure_message || 'Falha desconhecida'}`
      }

      await prisma.transaction.update({
        where: { id: BigInt(payout.metadata.transaction_id) },
        data: {
          status: newStatus as 'PENDING' | 'COMPLETED' | 'FAILED',
          description: description,
          paidAt: payout.status === 'paid' ? new Date() : null
        }
      })

      console.log('✅ Transação atualizada:', {
        transactionId: payout.metadata.transaction_id,
        status: newStatus
      })
    } catch (error) {
      console.error('❌ Erro ao atualizar transação:', error)
    }
  }
}

/**
 * Processar evento de payout pago
 */
async function processPayoutPaid(event: StripePayoutEvent) {
  const payout = event.data.object
  
  console.log('✅ Payout pago:', {
    payoutId: payout.id,
    amount: payout.amount,
    currency: payout.currency,
    arrivalDate: new Date(payout.arrival_date * 1000)
  })

  // Buscar transação relacionada pelo metadata
  if (payout.metadata?.transaction_id) {
    try {
      await prisma.transaction.update({
        where: { id: BigInt(payout.metadata.transaction_id) },
        data: {
          status: 'COMPLETED',
          description: `Payout Stripe pago: ${payout.id} - Data de chegada: ${new Date(payout.arrival_date * 1000).toISOString()}`,
          paidAt: new Date()
        }
      })

      console.log('✅ Transação marcada como concluída:', payout.metadata.transaction_id)
    } catch (error) {
      console.error('❌ Erro ao atualizar transação:', error)
    }
  }
}

/**
 * Processar evento de payout falhado
 */
async function processPayoutFailed(event: StripePayoutEvent) {
  const payout = event.data.object
  
  console.log('❌ Payout falhado:', {
    payoutId: payout.id,
    failureCode: payout.failure_code,
    failureMessage: payout.failure_message
  })

  // Buscar transação relacionada pelo metadata
  if (payout.metadata?.transaction_id) {
    try {
      await prisma.transaction.update({
        where: { id: BigInt(payout.metadata.transaction_id) },
        data: {
          status: 'FAILED',
          description: `Payout Stripe falhado: ${payout.id} - Erro: ${payout.failure_message || 'Falha desconhecida'}`
        }
      })

      console.log('❌ Transação marcada como falhada:', payout.metadata.transaction_id)
    } catch (error) {
      console.error('❌ Erro ao atualizar transação:', error)
    }
  }
}

/**
 * Processar evento de payout cancelado
 */
async function processPayoutCanceled(event: StripePayoutEvent) {
  const payout = event.data.object
  
  console.log('🚫 Payout cancelado:', {
    payoutId: payout.id
  })

  // Buscar transação relacionada pelo metadata
  if (payout.metadata?.transaction_id) {
    try {
      await prisma.transaction.update({
        where: { id: BigInt(payout.metadata.transaction_id) },
        data: {
          status: 'FAILED',
          description: `Payout Stripe cancelado: ${payout.id}`
        }
      })

      console.log('🚫 Transação marcada como cancelada:', payout.metadata.transaction_id)
    } catch (error) {
      console.error('❌ Erro ao atualizar transação:', error)
    }
  }
}

/**
 * POST /api/webhook/stripe-payouts
 * Processar webhooks de payouts do Stripe
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📨 Webhook Stripe Payouts recebido')

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ Assinatura Stripe não encontrada')
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_PAYOUTS || process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET não configurado')
      return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 })
    }

    let event: StripePayoutEvent

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as StripePayoutEvent
    } catch (err) {
      console.error('❌ Erro ao verificar assinatura do webhook:', err)
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
    }

    console.log('✅ Evento Stripe verificado:', event.type)

    // Processar evento baseado no tipo
    switch (event.type) {
      case 'payout.created':
        await processPayoutCreated(event)
        break

      case 'payout.updated':
        await processPayoutUpdated(event)
        break

      case 'payout.paid':
        await processPayoutPaid(event)
        break

      case 'payout.failed':
        await processPayoutFailed(event)
        break

      case 'payout.canceled':
        await processPayoutCanceled(event)
        break

      default:
        console.log('ℹ️ Evento não processado:', event.type)
    }

    return NextResponse.json({
      success: true,
      message: `Webhook Stripe Payouts: ${event.type} processado`
    })

  } catch (error) {
    console.error('❌ Erro ao processar webhook Stripe Payouts:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}

/**
 * GET /api/webhook/stripe-payouts
 * Verificar se o webhook está funcionando
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Webhook Stripe Payouts está funcionando',
    timestamp: new Date().toISOString()
  })
}
