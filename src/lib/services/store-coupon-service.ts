/**
 * Serviço para geração de cupons de sorteio quando o usuário compra produtos digitais
 * que estão configurados para gerar cupons.
 */

import { prisma } from '@/lib/prisma'
import { createCouponForUser } from '@/lib/promotion-service'

export interface StoreOrderCouponResult {
  generated: number
  errors: string[]
}

/**
 * Processa a geração de cupons para um pedido da loja pago.
 * Para cada item do pedido que seja produto digital com geração de cupom habilitada,
 * gera a quantidade de cupons correspondente à quantidade comprada.
 *
 * @param orderId - ID do pedido da loja
 * @returns Resumo da geração (quantidade gerada e erros)
 */
export async function processStoreOrderCouponGeneration(
  orderId: bigint
): Promise<StoreOrderCouponResult> {
  const result: StoreOrderCouponResult = {
    generated: 0,
    errors: []
  }

  try {
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                type: true,
                generatesCoupon: true,
                promotionId: true
              }
            }
          }
        },
        user: {
          select: { id: true }
        }
      }
    })

    if (!order) {
      result.errors.push('Pedido não encontrado')
      return result
    }

    const userId = order.userId

    for (const item of order.items) {
      const product = item.product

      if (
        product.type !== 'DIGITAL' ||
        !product.generatesCoupon ||
        !product.promotionId
      ) {
        continue
      }

      const promotionId = product.promotionId
      const quantity = item.quantity

      for (let i = 0; i < quantity; i++) {
        try {
          const coupon = await createCouponForUser(userId, promotionId, true)
          if (coupon) {
            result.generated++
          } else {
            result.errors.push(
              `Não foi possível criar cupom ${i + 1}/${quantity} para ${product.name} (limite ou duplicado)`
            )
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido'
          result.errors.push(
            `Erro ao criar cupom ${i + 1}/${quantity} para ${product.name}: ${message}`
          )
          console.error(`Erro ao criar cupom para pedido ${orderId}:`, error)
        }
      }
    }

    if (result.generated > 0) {
      console.log(
        `🎟️ Gerados ${result.generated} cupom(ns) para pedido #${order.orderNumber} (usuário ${userId})`
      )
    }
  } catch (error) {
    console.error('Erro ao processar geração de cupons do pedido:', error)
    result.errors.push(
      error instanceof Error ? error.message : 'Erro ao processar geração de cupons'
    )
  }

  return result
}
