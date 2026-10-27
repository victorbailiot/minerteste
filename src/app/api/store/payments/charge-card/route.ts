import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createOrder, type PaymentMethod, type OrderItem, type CreateOrderOptions } from '@/lib/pagarme/pagarme'
import { reaisToCentavos } from '@/lib/pagarme/pagarme'
import { calculateTotalWithInterest } from '@/lib/pagarme/pagarme-config'
import { formatPhoneForPagarMe } from '@/lib/utils'
import { processOrderBonuses } from '@/lib/services/storeMLMService'
import { processStoreOrderCouponGeneration } from '@/lib/services/store-coupon-service'

// ===== VALIDAÇÃO MANUAL (evita bug Zod 4 "reading '_zod' of undefined") =====

function validateChargeCardBody(body: unknown): { success: true; data: ParsedChargeCardBody } | { success: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { success: false, error: 'Body inválido' }
  }

  const b = body as Record<string, unknown>

  const orderId = b.orderId
  const orderNumber = b.orderNumber
  const amount = b.amount
  const installments = b.installments ?? 1
  const cardData = b.cardData
  const billingAddress = b.billingAddress
  const customerData = b.customerData
  const metadata = b.metadata

  if (typeof orderId !== 'string' || !orderId) return { success: false, error: 'orderId inválido' }
  if (typeof orderNumber !== 'string' || !orderNumber) return { success: false, error: 'orderNumber inválido' }

  const amountNum = typeof amount === 'number' ? amount : typeof amount === 'string' ? parseFloat(amount) : NaN
  if (Number.isNaN(amountNum) || amountNum <= 0) return { success: false, error: 'amount inválido' }

  const installmentsNum = typeof installments === 'number' ? installments : typeof installments === 'string' ? parseInt(installments, 10) : NaN
  if (Number.isNaN(installmentsNum) || installmentsNum < 1 || installmentsNum > 12) {
    return { success: false, error: 'installments deve ser entre 1 e 12' }
  }

  if (!cardData || typeof cardData !== 'object' || Array.isArray(cardData)) {
    return { success: false, error: 'cardData inválido' }
  }
  const cd = cardData as Record<string, unknown>
  if (typeof cd.number !== 'string' || cd.number.replace(/\s/g, '').length < 13) return { success: false, error: 'Número do cartão inválido' }
  if (typeof cd.holderName !== 'string' || cd.holderName.length < 3) return { success: false, error: 'Nome do titular inválido' }
  if (typeof cd.expMonth !== 'string' || cd.expMonth.length !== 2) return { success: false, error: 'Mês de validade inválido' }
  if (typeof cd.expYear !== 'string' || cd.expYear.length !== 4) return { success: false, error: 'Ano de validade inválido' }
  if (typeof cd.cvv !== 'string' || cd.cvv.length < 3) return { success: false, error: 'CVV inválido' }
  if (typeof cd.brand !== 'string' || cd.brand.length < 3) return { success: false, error: 'Bandeira inválida' }

  if (!billingAddress || typeof billingAddress !== 'object' || Array.isArray(billingAddress)) {
    return { success: false, error: 'billingAddress inválido' }
  }
  const ba = billingAddress as Record<string, unknown>
  if (typeof ba.zipCode !== 'string' || ba.zipCode.replace(/\D/g, '').length !== 8) return { success: false, error: 'CEP inválido' }
  if (typeof ba.street !== 'string' || ba.street.length < 3) return { success: false, error: 'Rua inválida' }
  if (typeof ba.number !== 'string' || !ba.number) return { success: false, error: 'Número do endereço inválido' }
  if (typeof ba.city !== 'string' || ba.city.length < 3) return { success: false, error: 'Cidade inválida' }
  if (typeof ba.state !== 'string' || ba.state.length !== 2) return { success: false, error: 'Estado inválido' }

  if (!customerData || typeof customerData !== 'object' || Array.isArray(customerData)) {
    return { success: false, error: 'customerData inválido' }
  }
  const cu = customerData as Record<string, unknown>
  if (typeof cu.name !== 'string' || !cu.name) return { success: false, error: 'Nome do cliente inválido' }
  if (typeof cu.email !== 'string' || !cu.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cu.email)) return { success: false, error: 'Email inválido' }
  if (typeof cu.document !== 'string' || !cu.document) return { success: false, error: 'Documento inválido' }

  return {
    success: true,
    data: {
      orderId: String(orderId),
      orderNumber: String(orderNumber),
      amount: amountNum,
      installments: installmentsNum,
      cardData: {
        number: String(cd.number).replace(/\s/g, ''),
        holderName: String(cd.holderName),
        holderDocument: cd.holderDocument != null ? String(cd.holderDocument) : undefined,
        expMonth: String(cd.expMonth),
        expYear: String(cd.expYear),
        cvv: String(cd.cvv),
        brand: String(cd.brand)
      },
      billingAddress: {
        zipCode: String(ba.zipCode).replace(/\D/g, ''),
        street: String(ba.street),
        number: String(ba.number),
        complement: ba.complement != null ? String(ba.complement) : undefined,
        neighborhood: ba.neighborhood != null ? String(ba.neighborhood) : undefined,
        city: String(ba.city),
        state: String(ba.state).toUpperCase()
      },
      customerData: {
        name: String(cu.name),
        email: String(cu.email),
        document: String(cu.document),
        phone: cu.phone != null ? String(cu.phone) : undefined
      },
      metadata: metadata != null && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : undefined
    }
  }
}

interface ParsedChargeCardBody {
  orderId: string
  orderNumber: string
  amount: number
  installments: number
  cardData: {
    number: string
    holderName: string
    holderDocument?: string
    expMonth: string
    expYear: string
    cvv: string
    brand: string
  }
  billingAddress: {
    zipCode: string
    street: string
    number: string
    complement?: string
    neighborhood?: string
    city: string
    state: string
  }
  customerData: {
    name: string
    email: string
    document: string
    phone?: string
  }
  metadata?: Record<string, unknown>
}

// ===== HANDLER POST =====

/**
 * POST /api/store/payments/charge-card
 * Criar cobrança com cartão de crédito para pedido da loja via Pagar.me
 */
export async function POST(request: NextRequest) {
  try {
    console.log('💳 Criando cobrança com cartão para pedido da loja via Pagar.me')

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

    const userId = BigInt(session.user.id)

    // 2. Validar request (validação manual para evitar bug Zod 4 com _zod)
    const body = await request.json()
    const bodyWithDefaults = typeof body === 'object' && body && !Array.isArray(body)
      ? { ...body, installments: body.installments >= 1 ? body.installments : 1 }
      : body

    const validation = validateChargeCardBody(bodyWithDefaults)

    if (!validation.success) {
      console.error('❌ Validação falhou:', validation.error)
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const { orderId, orderNumber, amount, installments, cardData, billingAddress, customerData, metadata } = validation.data

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
        {
          success: false,
          error: 'Pedido não encontrado'
        },
        { status: 404 }
      )
    }

    // Verificar se o pedido pertence ao usuário logado
    if (order.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pedido não pertence ao usuário logado'
        },
        { status: 403 }
      )
    }

    // Verificar se o pedido ainda está pendente
    if (order.paymentStatus !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          error: 'Pedido já foi processado'
        },
        { status: 400 }
      )
    }

    // 4. Buscar dados do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        documentNumber: true,
        phone: true
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

    // 5. Preparar dados (CPF, telefone, API)
    const finalCpf = customerData.document || user.cpf || user.documentNumber || '00000000000'
    const finalPhone = customerData.phone || user.phone || '11999999999'

    const phoneData = formatPhoneForPagarMe(finalPhone)

    const { createPagarMeAPI } = await import('@/lib/pagarme/pagarme')
    const api = createPagarMeAPI({
      apiKey: process.env.PAGARME_API_KEY!,
      env: (process.env.PAGARME_ENV as 'sandbox' | 'production') || 'sandbox'
    })

    if (!api) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuração PagarMe não encontrada'
        },
        { status: 500 }
      )
    }

    // 6. Criar customer na Pagar.me (mesmo fluxo que /api/pagarme/charge-card)
    let pagarmeCustomerId: string | null = null
    try {
      console.log('👤 Criando customer na Pagar.me...')
      const customer = await api.createCustomer({
        name: customerData.name || user.name,
        email: customerData.email || user.email,
        document: finalCpf.replace(/\D/g, ''),
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
    } catch (error) {
      console.error('❌ Erro ao criar customer:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao criar cliente na Pagar.me'
        },
        { status: 500 }
      )
    }

    // 7. Criar cartão associado ao customer (endpoint /customers/:id/cards — evita 404 do /cards)
    let cardId: string
    try {
      console.log('💳 Criando cartão na Pagar.me...')
      const card = await api.createCard(pagarmeCustomerId, {
        number: cardData.number.replace(/\s/g, ''),
        holder_name: cardData.holderName,
        holder_document: finalCpf.replace(/\D/g, ''),
        exp_month: parseInt(cardData.expMonth),
        exp_year: parseInt(cardData.expYear),
        cvv: cardData.cvv,
        brand: cardData.brand,
        billing_address: {
          line_1: `${billingAddress.street}, ${billingAddress.number}`,
          line_2: billingAddress.complement || undefined,
          zip_code: billingAddress.zipCode.replace(/\D/g, ''),
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
    } catch (error) {
      console.error('❌ Erro ao criar cartão:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Erro ao processar dados do cartão'
        },
        { status: 400 }
      )
    }

    // 8. Calcular valor total com juros (se parcelado)
    const totalAmount = installments > 1 
      ? calculateTotalWithInterest(amount, installments)
      : amount

    // 9. Preparar metadados
    const metadataPayload = {
      tipo_compra: 'loja',
      order_id: orderId,
      order_number: orderNumber,
      user_id: userId.toString(),
      transaction_id: order.transactionId?.toString() || '',
      ...metadata
    }

    // 10. Criar pedido na Pagar.me
    console.log('📦 Criando pedido na Pagar.me...')

    const orderDescription = `Pedido #${orderNumber} - ${order.items.length} item(ns)`

    const orderOptions: CreateOrderOptions = {
      amount: reaisToCentavos(totalAmount),
      customer: {
        name: customerData.name || user.name,
        email: customerData.email || user.email,
        document: finalCpf.replace(/\D/g, ''),
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
          description: orderDescription,
          quantity: 1,
          code: orderId
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

    // 11. Verificar status do pagamento
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

    // 12. Atualizar ou criar transação do pedido
    let transactionId = order.transactionId

    if (order.transactionId) {
      await prisma.transaction.update({
        where: { id: order.transactionId },
        data: {
          type: 'CREDIT_PAYMENT',
          amount: totalAmount,
          status: charge.status === 'paid' ? 'COMPLETED' : 'PENDING',
          description: `Pagamento do pedido #${orderNumber} via Pagar.me Cartão (${installments}x)`,
          chargeId: charge.id,
          correlationID: pagarmeOrder.id
        }
      })
    } else {
      // Criar nova transação se não existir
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          type: 'CREDIT_PAYMENT',
          amount: totalAmount,
          status: charge.status === 'paid' ? 'COMPLETED' : 'PENDING',
          description: `Pagamento do pedido #${orderNumber} via Pagar.me Cartão (${installments}x)`,
          chargeId: charge.id,
          correlationID: pagarmeOrder.id
        }
      })

      transactionId = transaction.id

      // Vincular transação ao pedido
      await prisma.storeOrder.update({
        where: { id: order.id },
        data: { transactionId: transaction.id }
      })
    }

    // 13. Se pagamento foi aprovado imediatamente, atualizar pedido e processar bônus
    if (charge.status === 'paid') {
      await prisma.storeOrder.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paidAt: new Date()
        }
      })

      // Processar bônus MLM
      try {
        await processOrderBonuses(order.id)
        console.log('✅ Bônus MLM processados com sucesso')
      } catch (bonusError) {
        console.error('⚠️ Erro ao processar bônus MLM:', bonusError)
        // Não falhar o pagamento por erro no bônus
      }

      // Gerar cupons para produtos digitais que geram cupom
      try {
        const couponResult = await processStoreOrderCouponGeneration(order.id)
        if (couponResult.generated > 0) {
          console.log(`🎟️ Cupons gerados: ${couponResult.generated}`)
        }
      } catch (couponError) {
        console.error('⚠️ Erro ao gerar cupons do pedido (não impacta pagamento):', couponError)
      }
    }

    console.log(`✅ Transação ${order.transactionId ? 'atualizada' : 'criada'}: ${transactionId}`)

    if (charge.status === 'pending') {
      console.log('⏳ Pagamento pendente de confirmação via webhook')
    } else {
      console.log('✅ Pagamento aprovado imediatamente')
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: charge.id,
        orderId: pagarmeOrder.id,
        transactionId: transactionId?.toString() || '',
        status: charge.status === 'paid' ? 'completed' : 'pending',
        amount: totalAmount,
        installments: installments,
        message: charge.status === 'paid' 
          ? 'Pagamento aprovado com sucesso!'
          : 'Pagamento em processamento. Você será notificado quando for aprovado.'
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