/**
 * Integração Pagar.me com Sistema de Pacotes
 * Conecta a API da Pagar.me com o sistema de pacotes existente
 */

import { createOrder, createCreditCardPayment, createPixPayment, createBoletoPayment, reaisToCentavos, generateOrderCode } from './pagarme/pagarme'
import { prisma } from './prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userPackageCreate } from './payment-confirmation'

// ===== TIPOS PARA INTEGRAÇÃO =====

export interface PackagePurchaseRequest {
  packageId: string
  paymentMethod: 'credit_card' | 'pix' | 'boleto'
  customerData: {
    name: string
    email: string
    document: string
    documentType: 'cpf' | 'cnpj'
    phone?: string
  }
  cardData?: {
    number: string
    holderName: string
    expMonth: number
    expYear: number
    cvv: string
    installments?: number
  }
  boletoData?: {
    dueAt?: string
    instructions?: string[]
  }
  pixData?: {
    expiresIn?: number
    additionalInfo?: Array<{ name: string; value: string }>
  }
}

export interface PackagePurchaseResponse {
  success: boolean
  orderId?: string
  chargeId?: string
  qrCode?: string
  boletoUrl?: string
  boletoBarcode?: string
  message?: string
  error?: string
}

// ===== FUNÇÕES DE INTEGRAÇÃO =====

/**
 * Comprar pacote usando Pagar.me
 */
export async function purchasePackageWithPagarMe(
  request: PackagePurchaseRequest
): Promise<PackagePurchaseResponse> {
  try {
    // 1. Buscar dados do pacote
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(request.packageId) }
    })

    if (!packageData) {
      return {
        success: false,
        error: 'Pacote não encontrado'
      }
    }

    // 2. Buscar dados do usuário logado
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) }
    })

    if (!user) {
      return {
        success: false,
        error: 'Usuário não encontrado'
      }
    }

    // 3. Criar dados do cliente
    const customer = {
      name: request.customerData.name,
      email: request.customerData.email,
      type: request.customerData.documentType === 'cpf' ? 'individual' as const : 'company' as const,
      document: request.customerData.document.replace(/\D/g, ''),
      document_type: request.customerData.documentType,
      phones: request.customerData.phone ? {
        mobile_phone: {
          country_code: '55',
          area_code: request.customerData.phone.substring(0, 2),
          number: request.customerData.phone.substring(2)
        }
      } : undefined
    }

    // Converter preço do pacote para número
    const packagePrice = Number(packageData.price)

    // 4. Criar método de pagamento baseado na escolha
    let paymentMethod: any

    switch (request.paymentMethod) {
      case 'credit_card':
        if (!request.cardData) {
          return {
            success: false,
            error: 'Dados do cartão são obrigatórios'
          }
        }
        paymentMethod = createCreditCardPayment({
          amount: reaisToCentavos(packagePrice),
          cardNumber: request.cardData.number,
          holderName: request.cardData.holderName,
          expMonth: request.cardData.expMonth,
          expYear: request.cardData.expYear,
          cvv: request.cardData.cvv,
          installments: request.cardData.installments || 1
        })
        break

      case 'pix':
        paymentMethod = createPixPayment({
          amount: reaisToCentavos(packagePrice),
          expiresIn: request.pixData?.expiresIn || 3600,
          additionalInformation: request.pixData?.additionalInfo || [
            { name: 'Pacote', value: packageData.name },
            { name: 'Usuário', value: user.name }
          ]
        })
        break

      case 'boleto':
        paymentMethod = createBoletoPayment({
          amount: reaisToCentavos(packagePrice),
          documentNumber: request.customerData.document.replace(/\D/g, ''),
          dueAt: request.boletoData?.dueAt || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          instructions: request.boletoData?.instructions || [
            'Pagar até a data de vencimento',
            'Após vencimento pagar apenas no banco'
          ],
          interest: {
            days: 1,
            type: 'percentage' as const,
            amount: 2
          },
          fine: {
            days: 1,
            type: 'percentage' as const,
            amount: 2
          }
        })
        break

      default:
        return {
          success: false,
          error: 'Método de pagamento não suportado'
        }
    }

    // 5. Criar pedido na Pagar.me
    const orderCode = generateOrderCode('PACOTE')
    
    const orderOptions = {
      amount: reaisToCentavos(packagePrice),
      customer,
      payment: [paymentMethod],
      items: [
        {
          amount: reaisToCentavos(packagePrice),
          description: packageData.name,
          quantity: 1,
          code: packageData.id.toString(),
          type: 'digital' as const
        }
      ],
      metadata: {
        userId: user.id.toString(),
        packageId: packageData.id.toString(),
        packageName: packageData.name,
        orderCode
      },
      onSuccess: (order: any) => {
        console.log('Pedido criado com sucesso:', order.id)
      },
      onError: (error: any) => {
        console.error('Erro ao criar pedido:', error)
      }
    }

    const order = await createOrder(orderOptions)

    // 6. Verificar se há dados de pagamento na resposta
    if (!order.payments || !Array.isArray(order.payments) || order.payments.length === 0) {
      throw new Error('Dados de pagamento não encontrados na resposta da PagarMe')
    }

    const paymentData = order.payments[0]

    const userPackages = await userPackageCreate(user.id, packageData, paymentData.id ? BigInt(paymentData.id) : BigInt(0), 1)

    // Determinar tipo de transação baseado no método de pagamento
    const transactionType = request.paymentMethod === 'credit_card' ? 'CREDIT_PAYMENT' : 'DEPOSIT'
    
    // Criar transação relacionada
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: transactionType,
        amount: packagePrice,
        description: `Compra do pacote ${packageData.name} via ${request.paymentMethod}`,
        correlationID: orderCode,
        chargeId: paymentData.id,
        status: 'PENDING',
        quantity: 1,
        userPackages: {
          connect: { id: userPackages[0].id }
        }
      }
    })

    // 8. Preparar resposta baseada no método de pagamento
    const response: PackagePurchaseResponse = {
      success: true,
      orderId: order.id,
      chargeId: paymentData.id
    }

    if (request.paymentMethod === 'pix' && paymentData.payment_method?.pix) {
      response.qrCode = paymentData.payment_method.pix.qr_code
    }

    if (request.paymentMethod === 'boleto' && paymentData.payment_method?.boleto) {
      response.boletoUrl = paymentData.payment_method.boleto.url
      response.boletoBarcode = paymentData.payment_method.boleto.barcode
    }

    return response

  } catch (error) {
    console.error('Erro na compra do pacote:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

// ===== FUNÇÕES UTILITÁRIAS =====

/**
 * Validar dados do cartão antes do envio
 */
export function validateCardData(cardData: any): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!cardData.number || cardData.number.length < 13) {
    errors.push('Número do cartão inválido')
  }

  if (!cardData.holderName || cardData.holderName.length < 3) {
    errors.push('Nome do titular é obrigatório')
  }

  if (!cardData.expMonth || cardData.expMonth < 1 || cardData.expMonth > 12) {
    errors.push('Mês de expiração inválido')
  }

  if (!cardData.expYear || cardData.expYear < new Date().getFullYear()) {
    errors.push('Ano de expiração inválido')
  }

  if (!cardData.cvv || cardData.cvv.length < 3) {
    errors.push('CVV inválido')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validar dados do cliente
 */
export function validateCustomerData(customerData: any): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!customerData.name || customerData.name.length < 3) {
    errors.push('Nome é obrigatório')
  }

  if (!customerData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
    errors.push('Email inválido')
  }

  if (!customerData.document || customerData.document.replace(/\D/g, '').length < 11) {
    errors.push('Documento inválido')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
} 