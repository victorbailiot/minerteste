import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createOrder, type PaymentMethod, type OrderItem, type CreateOrderOptions, PagarMeAPI } from '@/lib/pagarme/pagarme'
import { reaisToCentavos } from '@/lib/pagarme/pagarme'
import { validatePurchaseLimit } from '@/lib/purchase-limit-validator'
import { calculateTotalWithInterest } from '@/lib/pagarme/pagarme-config'
import { formatPhoneForPagarMe } from '@/lib/utils'
import { validatePackageForMinerPurchase } from '@/lib/package-purchase-validator'

// ===== SCHEMAS DE VALIDAÇÃO =====

const cardDataSchema = z.object({
  number: z.string().min(13).max(19),
  holderName: z.string().min(3),
  holderDocument: z.string().optional(),
  expMonth: z.string().length(2),
  expYear: z.string().length(4),
  cvv: z.string().min(3).max(4),
  brand: z.string().min(3)
})

const billingAddressSchema = z.object({
  zipCode: z.string().length(8),
  street: z.string().min(3),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(2).optional(),
  city: z.string().min(3),
  state: z.string().length(2)
})

const chargeCardSchema = z.object({
  packageId: z.string(),
  minerId: z.string().regex(/^\d+$/, 'Mineradora inválida'),
  quantity: z.number().int().positive().default(1),
  currency: z.string().default('brl'),
  installments: z.number().int().min(1).max(12).default(1),
  cardData: cardDataSchema,
  billingAddress: billingAddressSchema,
  customerData: z.object({
    name: z.string(),
    email: z.string().email(),
    document: z.string(),
    phone: z.string().optional()
  })
})

// ===== HANDLER POST =====

/**
 * POST /api/pagarme/charge-card
 * Criar cobrança com cartão de crédito via Pagar.me
 */
export async function POST(request: NextRequest) {
  try {
    console.log('💳 Criando cobrança com cartão via Pagar.me')

    // 1. Obter usuário logado
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuário não autenticado'
        },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 2. Validar request
    const body = await request.json()
    const validation = chargeCardSchema.safeParse(body)

    if (!validation.success) {
      console.error('❌ Validação falhou:', validation.error)
      return NextResponse.json(
        {
          success: false,
          error: 'Dados inválidos',
          details: validation.error
        },
        { status: 400 }
      )
    }

    const { packageId, minerId, quantity, currency, installments, cardData, billingAddress, customerData } = validation.data

    // 3. Validar moeda (apenas BRL)
    if (currency.toLowerCase() !== 'brl') {
      return NextResponse.json(
        {
          success: false,
          error: 'Pagamento com cartão via Pagar.me só está disponível para BRL'
        },
        { status: 400 }
      )
    }

    // 4. Buscar pacote
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(packageId) }
    })

    if (!packageData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pacote não encontrado'
        },
        { status: 404 }
      )
    }

    if (!packageData.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pacote não está ativo'
        },
        { status: 400 }
      )
    }

    const packageValidation = await validatePackageForMinerPurchase({
      userId: BigInt(userId),
      packageId: BigInt(packageId),
      minerId: BigInt(minerId)
    })

    if (!packageValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: packageValidation.error || 'Pacote indisponível para a mineradora selecionada'
        },
        { status: 400 }
      )
    }

    // 5. Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        documentNumber: true,
        country: true
      }
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuário não encontrado'
        },
        { status: 404 }
      )
    }

    // 6. Calcular valor total com juros usando pagarme-config.ts
    const unitPrice = Number(packageData.price)
    const baseAmount = unitPrice * quantity
    const totalAmount = calculateTotalWithInterest(baseAmount, installments)

    console.log(`📊 Valor base: R$ ${baseAmount} | Parcelas: ${installments}x | Total: R$ ${totalAmount}`)

    // 7. Validar limite de compra
    console.log('🔒 Validando limite de compra...')
    const limitValidation = await validatePurchaseLimit(BigInt(userId), totalAmount)

    if (!limitValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: limitValidation.message || 'Limite de compra excedido'
        },
        { status: 400 }
      )
    }

    // 8. Preparar dados de telefone e CPF com fallbacks
    console.log('📦 Preparando pedido na Pagar.me...')

    // Usar CPF fornecido ou do banco
    const finalCpf = customerData.document || user.cpf || user.documentNumber || '00000000000'
    
    // Usar telefone fornecido no customerData (para usuários internacionais) ou do banco
    const finalPhone = customerData.phone || user.phone
    
    const phoneData = formatPhoneForPagarMe(finalPhone)
    console.log('📞 Telefone formatado para PagarMe:', phoneData)
    console.log('📄 CPF final:', finalCpf)
    console.log('🌍 País do usuário:', user.country || 'BR')

    // 9. Inicializar cliente Pagar.me
    const pagarMeAPI = new PagarMeAPI({
      apiKey: process.env.PAGARME_API_KEY || '',
      env: process.env.PAGARME_ENV as 'sandbox' | 'production' || 'sandbox'
    })

    // 10. Criar ou obter customer na Pagar.me
    // TODO: Verificar customer existente quando migration for executada
    // let pagarmeCustomerId = user.pagarmeCustomerId
    let pagarmeCustomerId: string | null = null

    if (!pagarmeCustomerId) {
      console.log('👤 Criando customer na Pagar.me...')
      try {
        const customer = await pagarMeAPI.createCustomer({
          name: customerData.name,
          email: customerData.email,
          document: finalCpf,
          document_type: 'cpf',
          type: 'individual',
          phones: {
            home_phone: {
              country_code: '55',
              area_code: phoneData.area_code,
              number: phoneData.number
            }
          }
        })

        pagarmeCustomerId = customer.id
        console.log('✅ Customer criado:', pagarmeCustomerId)

        // TODO: Salvar customer ID no banco quando migration for executada
        // await prisma.user.update({
        //   where: { id: BigInt(userId) },
        //   data: { pagarmeCustomerId: pagarmeCustomerId }
        // })
        console.log('💾 Customer ID será salvo após migration:', pagarmeCustomerId)
      } catch (error: any) {
        console.error('❌ Erro ao criar customer:', error)
        return NextResponse.json(
          {
            success: false,
            error: 'Erro ao criar cliente na Pagar.me'
          },
          { status: 500 }
        )
      }
    } else {
      console.log('👤 Usando customer existente:', pagarmeCustomerId)
    }

    // 11. Criar cartão na Pagar.me
    console.log('💳 Criando cartão na Pagar.me...')
    let cardId: string

    try {
      const card = await pagarMeAPI.createCard(pagarmeCustomerId, {
        number: cardData.number,
        holder_name: cardData.holderName,
        holder_document: cardData.holderDocument || finalCpf,
        exp_month: parseInt(cardData.expMonth),
        exp_year: parseInt(cardData.expYear),
        cvv: cardData.cvv,
        brand: cardData.brand,
        billing_address: {
          line_1: `${billingAddress.street}, ${billingAddress.number}`,
          line_2: billingAddress.complement,
          zip_code: billingAddress.zipCode,
          city: billingAddress.city,
          state: billingAddress.state.toUpperCase(),
          country: 'BR'
        },
        options: {
          verify_card: true
        }
      })

      cardId = card.id
      console.log('✅ Cartão criado:', cardId)
    } catch (error: any) {
      console.error('❌ Erro ao criar cartão:', error)
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Erro ao criar cartão'
        },
        { status: 400 }
      )
    }

    const metadataPayload = {
      user_id: userId,
      package_id: packageData.id.toString(),
      miner_id: minerId,
      quantity: quantity.toString(),
      installments: installments.toString(),
      currency: currency
    }

    // 12. Criar pedido na Pagar.me usando card_id
    console.log('📦 Criando pedido na Pagar.me...')

    const orderOptions: CreateOrderOptions = {
      amount: reaisToCentavos(totalAmount),
      customer: {
        name: customerData.name,
        email: customerData.email,
        document: finalCpf,
        document_type: 'cpf',
        type: 'individual',
        phones: {
          home_phone: {
            country_code: '55',
            area_code: phoneData.area_code,
            number: phoneData.number
          }
        }
      },
      items: [
        {
          amount: reaisToCentavos(totalAmount),
          description: `${packageData.name} - Quantidade: ${quantity}`,
          quantity: 1,
          code: packageData.id.toString()
        } as OrderItem
      ],
      payment: [{
        type: 'credit_card',
        credit_card: {
          installments: installments,
          statement_descriptor: 'MINERSTONE',
          card_id: cardId
        }
      }] as PaymentMethod[],
      metadata: {
        ...Object.fromEntries(Object.entries(metadataPayload).map(([k, v]) => [k, String(v)]))
      }
    }

    const pagarmeOrder = await createOrder(orderOptions)

    console.log('✅ Pedido criado na Pagar.me:', pagarmeOrder.id)
    try { console.log('📦 Order metadata:', (pagarmeOrder as any).metadata) } catch { }

    // 13. Verificar status do pagamento
    const charge = pagarmeOrder.charges?.[0]
    if (!charge) {
      throw new Error('Nenhuma cobrança encontrada no pedido')
    }

    console.log(`📊 Status da cobrança: ${charge.status}`)

    // Status da Pagar.me: 'paid', 'pending', 'failed', 'canceled'
    if (charge.status !== 'paid' && charge.status !== 'pending') {
      const errorMessage = charge.last_transaction?.gateway_response?.errors?.[0]?.message ||
        'Pagamento recusado'

      return NextResponse.json(
        {
          success: false,
          error: errorMessage
        },
        { status: 400 }
      )
    }

    // 14. Salvar transação no banco
    console.log('💾 Salvando transação no banco...')

    const transaction = await prisma.transaction.create({
      data: {
        user: {
          connect: { id: BigInt(userId) }
        },
        type: 'CREDIT_PAYMENT',
        amount: totalAmount,
        quantity: quantity,
        status: 'PENDING',
        description: `Compra de ${quantity} pacote(s) ${packageData.name} via Pagar.me Cartão (${installments}x) - Order: ${pagarmeOrder.id}`,
        chargeId: charge.id,
        correlationID: pagarmeOrder.id
      }
    })

    console.log(`✅ Transação salva: ID ${transaction.id}`)

    // Status 'pending' - aguardando confirmação via webhook
    console.log('⏳ Pagamento pendente de confirmação via webhook')

    return NextResponse.json({
      success: true,
      data: {
        paymentId: charge.id,
        orderId: pagarmeOrder.id,
        transactionId: transaction.id.toString(),
        status: 'pending',
        amount: totalAmount,
        installments: installments,
        message: 'Pagamento em processamento. Você será notificado quando for aprovado.'
      }
    })

  } catch (error: any) {
    console.error('❌ Erro ao processar pagamento com cartão:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao processar pagamento'
      },
      { status: 500 }
    )
  }
}

