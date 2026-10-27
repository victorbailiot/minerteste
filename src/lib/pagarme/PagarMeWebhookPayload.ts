import { Order } from "./Order"
import { Recipient } from "./Recipient"
import { Transfer } from "./Transfer"
import { Usage } from "./Usage"

// Tipos de eventos suportados pelo webhook
export type PagarMeWebhookEventType = 
  // Eventos de pedido/order
  | 'order.paid'
  | 'order.payment_failed'
  | 'order.canceled'
  | 'order.processing'
  | 'order.authorized'
  | 'order.refused'
  | 'order.refunded'
  | 'order.chargedback'
  | 'order.analyzing'
  | 'order.pending_review'
  // Eventos de cobrança/charge
  | 'charge.paid'
  | 'charge.payment_failed'
  | 'charge.canceled'
  | 'charge.processing'
  | 'charge.pending'
  // Eventos de recebedor/recipient
  | 'recipient.created'
  | 'recipient.deleted'
  | 'recipient.updated'
  // Eventos de transferência/transfer
  | 'transfer.canceled'
  | 'transfer.created'
  | 'transfer.failed'
  | 'transfer.paid'
  | 'transfer.pending'
  | 'transfer.processing'
  // Eventos de uso/usage
  | 'usage.created'
  | 'usage.updated'
  | 'usage.deleted'

// Union type para os dados do webhook baseado no tipo de evento
export type PagarMeWebhookData = Order | Recipient | Transfer | Usage

export interface PagarMeWebhookPayload {
    id: string
    account: {
      id: string
      name: string
    }
    type: PagarMeWebhookEventType
    created_at: string
    data: PagarMeWebhookData
  }