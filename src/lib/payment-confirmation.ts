/**
 * Função global para confirmar pagamentos e ativar pacotes
 * Usada tanto pelo Stripe quanto pelo PagarMe
 */

import { prisma } from '@/lib/prisma'
import { getPaymentIntent } from '@/lib/stripe/stripe'
import { createPagarMeAPI } from '@/lib/pagarme/pagarme'
import { PagarMeWebhookPayload } from './pagarme/PagarMeWebhookPayload'
import { Order } from './pagarme/Order'
import { Package } from '@/generated/prisma'

// ===== TIPOS =====

export interface PaymentConfirmationResponse {
  success: boolean
  paymentId?: string
  error?: string
}

// ===== FUNÇÃO GLOBAL =====

/**
 * Confirmar pagamento e ativar pacote (Stripe)
 */
export async function confirmStripePayment(
  paymentIntentId: string
): Promise<PaymentConfirmationResponse> {
  try {
    // 1. Buscar Payment Intent no Stripe
    const paymentIntent = await getPaymentIntent(paymentIntentId)

    if (!paymentIntent) {
      return {
        success: false,
        error: 'Payment Intent não encontrado'
      }
    }

    // 2. Verificar se já foi processado
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        chargeId: paymentIntent.id,
        status: 'COMPLETED'
      }
    })

    if (existingTransaction) {
      return {
        success: true,
        paymentId: paymentIntent.id
      }
    }

    // 3. Extrair dados do metadata
    const userId = paymentIntent.metadata?.userId
    const packageId = paymentIntent.metadata?.packageId

    if (!userId || !packageId) {
      return {
        success: false,
        error: 'Dados do usuário ou pacote não encontrados'
      }
    }

    // 4. Buscar dados do usuário e pacote
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) }
    })

    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(packageId) }
    })

    if (!user || !packageData) {
      return {
        success: false,
        error: 'Usuário ou pacote não encontrado'
      }
    }

    // 5. Buscar e atualizar transação
    const transaction = await prisma.transaction.findFirst({
      where: { chargeId: paymentIntent.id }
    })

    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date()
        }
      })

      // IMPORTANTE: NÃO criar UserPackages aqui!
      // A criação é feita por processPackagePayment no webhook, que:
      // - Verifica se há upgrade
      // - Cria os pacotes corretos (upgrade ou normal)
      // - Processa bonificações e Clube 300
      // await userPackageCreate(BigInt(userId), packageData, transaction.id, transaction.quantity)
      
      console.log(`ℹ️  UserPackages serão criados por processPackagePayment (webhook)`)
    }

    // 7. Bônus de indicação será processado pela função processPackagePurchase
    // que é chamada no webhook após esta confirmação

    return {
      success: true,
      paymentId: paymentIntent.id
    }

  } catch (error) {
    console.error('Erro ao confirmar pagamento Stripe:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Confirmar pagamento e ativar pacote (PagarMe)
 */
export async function confirmPagarMePayment(
  orderData: Order
): Promise<PaymentConfirmationResponse> {
  try {
    if (!orderData) {
      return {
        success: false,
        error: 'Pedido não encontrado'
      }
    }

    // 2. Verificar se já foi processado
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        correlationID: orderData.id,
        status: 'COMPLETED'
      }
    })


    if (existingTransaction) {
      return {
        success: true,
        paymentId: orderData.id
      }
    }

    // Buscar transação primeiro
    const transaction = await prisma.transaction.findFirst({
      where: { correlationID: orderData.id }
    })

    if (!transaction) {
      return {
        success: false,
        error: 'Transação não encontrada'
      }
    }

    // Atualizar status da transação
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: orderData.status === 'paid' ? 'COMPLETED' : 'PENDING',
        updatedAt: new Date()
      }
    })

    // 3. Extrair dados do metadata
    const userId = orderData.metadata?.user_id
    const packageId = orderData.metadata?.package_id

    if (!userId || !packageId) {
      return {
        success: false,
        error: 'Dados do usuário ou pacote não encontrados'
      }
    }

    // 4. Buscar dados do usuário e pacote
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) }
    })

    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(packageId) }
    })

    if (!user || !packageData) {
      return {
        success: false,
        error: 'Usuário ou pacote não encontrado'
      }
    }

    // 5. Ativar pacote do usuário
    // IMPORTANTE: NÃO criar UserPackages aqui!
    // A criação é feita por processPackagePayment no webhook, que:
    // - Verifica se há upgrade
    // - Cria os pacotes corretos (upgrade ou normal)
    // - Processa bonificações e Clube 300
    // await userPackageCreate(BigInt(userId), packageData, transaction.id, transaction.quantity)
    
    console.log(`ℹ️  UserPackages serão criados por processPackagePayment (webhook)`)

    return {
      success: true,
      paymentId: orderData.id
    }

  } catch (error) {
    console.error('Erro ao confirmar pagamento PagarMe:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}
export async function userPackageCreate(
  userId: bigint,
  packageData: Package,
  transactionId: bigint,
  quantity: number,
  minerId?: bigint
) : Promise<any[]> {
  // Criar UserPackages para cada quantidade
  const userPackages: any[] = []

  for (let i = 0; i < quantity; i++) {
    // 6. Ativar pacote do usuário
    const userPackage = await prisma.userPackage.create({
      data: {
        userId: BigInt(userId),
        packageId: BigInt(packageData.id),
        ...(minerId ? { minerId } : {}),
        isActive: true,
        isUnilevel: true,
        activatedAt: new Date(),
        transactionId: transactionId,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
        directBonusSnapshot: packageData.directBonus,
        priceSnapshot: packageData.price
      }
    })

    userPackages.push(userPackage)

    // IMPORTANTE: Verificação de Clube 300 removida daqui!
    // Agora é feita em processPackagePayment de forma centralizada e controlada,
    // evitando duplicação e garantindo que seja verificado após upgrades
    // Ver: src/lib/package-payment-processor.ts - checkAndAddToClube300()
    
    // IMPORTANTE: Criação de cupom removida daqui!
    // Agora é feita em processPackagePayment verificando o pacote COMPRADO original,
    // garantindo que seja criado mesmo quando há upgrade
    // Ver: src/lib/package-payment-processor.ts - checkAndCreateCouponForPackage()
  }

  console.log(`✅ Criados ${userPackages.length} UserPackages para transação ${transactionId}`)
  return userPackages
}

