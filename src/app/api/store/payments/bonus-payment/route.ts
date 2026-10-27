import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserBalance } from '@/lib/business-logic'
import { processOrderBonuses } from '@/lib/services/storeMLMService'
import { processStoreOrderCouponGeneration } from '@/lib/services/store-coupon-service'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'

// Schema de validação para GET (verificar saldo)
const checkBalanceSchema = z.object({
  orderId: z.string().optional(),
  total: z.string().optional()
})

// Schema de validação para POST (processar pagamento)
const bonusPaymentStoreSchema = z.object({
  orderId: z.string().min(1, 'ID do pedido é obrigatório'),
  orderNumber: z.string().optional(),
  total: z.coerce.number().positive('Valor total deve ser positivo')
})

/**
 * GET /api/store/payments/bonus-payment
 * Verifica se o usuário pode pagar o pedido com saldo de bônus
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    // 2. Validar query params
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const total = searchParams.get('total')

    if (!orderId || !total) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'orderId e total são obrigatórios' 
        },
        { status: 400 }
      )
    }

    const validation = checkBalanceSchema.safeParse({
      orderId,
      total
    })

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos',
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    // 3. Buscar pedido
    const order = await prisma.storeOrder.findUnique({
      where: { id: BigInt(orderId) },
      select: { id: true, total: true, userId: true, paymentStatus: true }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o pedido pertence ao usuário
    if (order.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Pedido não pertence ao usuário logado' },
        { status: 403 }
      )
    }

    // 4. Verificar saldo disponível
    const requiredAmount = new Decimal(total)
    const availableBalance = await getUserBalance(userId)

    const canPayWithBonus = availableBalance.greaterThanOrEqualTo(requiredAmount)
    const missingAmount = canPayWithBonus 
      ? new Decimal(0)
      : requiredAmount.sub(availableBalance)

    return NextResponse.json({
      success: true,
      data: {
        canPayWithBonus,
        availableBalance: availableBalance.toNumber(),
        requiredAmount: requiredAmount.toNumber(),
        missingAmount: missingAmount.toNumber()
      }
    })

  } catch (error: any) {
    console.error('Erro ao verificar saldo:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao verificar saldo' 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/store/payments/bonus-payment
 * Processa pagamento de pedido da loja usando saldo de bônus
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    // 2. Validar body da requisição
    const body = await request.json()
    const validation = bonusPaymentStoreSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos',
          details: validation.error.issues 
        },
        { status: 400 }
      )
    }

    const { orderId, orderNumber, total } = validation.data

    // 3. Buscar pedido da loja
    const order = await prisma.storeOrder.findUnique({
      where: { id: BigInt(orderId) },
      include: {
        user: true,
        items: {
          include: {
            product: true,
            variant: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o pedido pertence ao usuário logado
    if (order.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Pedido não pertence ao usuário logado' },
        { status: 403 }
      )
    }

    // Verificar se o pedido ainda está pendente
    if (order.paymentStatus !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Pedido já foi processado' },
        { status: 400 }
      )
    }

    // 4. Calcular valor total do pedido
    const orderTotal = new Decimal(order.total)
    const requestedTotal = new Decimal(total)

    // Validar se o valor solicitado corresponde ao valor do pedido
    if (!orderTotal.equals(requestedTotal)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Valor do pagamento não corresponde ao valor do pedido' 
        },
        { status: 400 }
      )
    }

    // 5. Verificar saldo disponível
    const availableBalance = await getUserBalance(userId)

    if (availableBalance.lessThan(orderTotal)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Saldo insuficiente',
          data: {
            required: orderTotal.toNumber(),
            available: availableBalance.toNumber(),
            missing: orderTotal.sub(availableBalance).toNumber()
          }
        },
        { status: 400 }
      )
    }

    // 6. Gerar ID de correlação único
    const correlationID = `STORE_BONUS_${Date.now()}_${userId}`

    // 7. Criar transação de BONUS_PAYMENT (débito do saldo)
    const purchaseTransaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'BONUS_PAYMENT',
        amount: orderTotal, // Valor positivo (será subtraído em getUserBalance)
        description: `Pagamento do pedido #${order.orderNumber} usando saldo de bônus`,
        status: 'COMPLETED',
        correlationID,
        chargeId: correlationID
      }
    })

    console.log('✅ Transação de débito criada:', purchaseTransaction.id)

    // 8. Atualizar pedido para pago
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paidAt: new Date(),
        transactionId: purchaseTransaction.id
      }
    })

    console.log('✅ Pedido atualizado para PAID:', order.id)

    // 9. Processar bônus MLM
    let bonusResult
    try {
      bonusResult = await processOrderBonuses(order.id)
      console.log('✅ Bônus MLM processados com sucesso')

      // 9.1 Gerar cupons para produtos digitais que geram cupom
      try {
        const couponResult = await processStoreOrderCouponGeneration(order.id)
        if (couponResult.generated > 0) {
          console.log(`🎟️ Cupons gerados: ${couponResult.generated}`)
        }
      } catch (couponError) {
        console.error('⚠️ Erro ao gerar cupons do pedido (não impacta pagamento):', couponError)
      }
      console.log(`   💰 Bônus direto: R$ ${bonusResult.directBonus.toFixed(2)}`)
      console.log(`   💸 Total bônus indiretos: R$ ${bonusResult.indirectBonuses.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}`)
      console.log(`   📊 Pontos gerados: ${bonusResult.pointsGenerated}`)
    } catch (bonusError) {
      console.error('⚠️ Erro ao processar bônus MLM:', bonusError)
      // Não falhar o pagamento por erro no bônus
      bonusResult = {
        directBonus: 0,
        indirectBonuses: [],
        pointsGenerated: 0,
        totalBonuses: 0
      }
    }

    // 10. Atualizar descrição da transação com informações do processamento
    await prisma.transaction.update({
      where: { id: purchaseTransaction.id },
      data: {
        description: `${purchaseTransaction.description} - Bônus: R$ ${bonusResult.totalBonuses.toFixed(2)}, Pontos: ${bonusResult.pointsGenerated}`
      }
    })

    console.log('🎉 Pagamento com bônus processado com sucesso')
    console.log(`   Pedido: #${order.orderNumber}`)
    console.log(`   Valor: R$ ${orderTotal.toFixed(2)}`)
    console.log(`   Saldo anterior: R$ ${availableBalance.toFixed(2)}`)
    console.log(`   Saldo após: R$ ${availableBalance.sub(orderTotal).toFixed(2)}`)

    return NextResponse.json({
      success: true,
      message: 'Pagamento realizado com sucesso',
      data: {
        transactionId: purchaseTransaction.id.toString(),
        orderId: order.id.toString(),
        orderNumber: order.orderNumber,
        totalAmount: orderTotal.toNumber(),
        bonusProcessed: {
          directBonus: bonusResult.directBonus,
          indirectBonuses: bonusResult.indirectBonuses,
          pointsGenerated: bonusResult.pointsGenerated,
          totalBonuses: bonusResult.totalBonuses
        }
      }
    })

  } catch (error: any) {
    console.error('Erro ao processar pagamento com bônus:', error)

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao processar pagamento' 
      },
      { status: 500 }
    )
  }
}