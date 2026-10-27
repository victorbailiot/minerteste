/**
 * API Route para Pagamentos Stripe
 * Processa pagamentos de pacotes via Stripe
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { purchasePackageWithStripe, createPackageCheckoutSession } from '@/lib/stripe/stripe-integration'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateCorrelationID } from '@/lib/openpix'
import { validatePurchaseLimit } from '@/lib/purchase-limit-validator'
import { prisma } from '@/lib/prisma'
import { validatePackageForMinerPurchase } from '@/lib/package-purchase-validator'

// ===== SCHEMAS DE VALIDAÇÃO =====

const createPaymentIntentSchema = z.object({
  packageId: z.string().min(1, 'ID do pacote é obrigatório'),
  minerId: z.string().min(1, 'ID da mineradora é obrigatório'),
  quantity: z.number().int().min(1).max(50).optional().default(1),
  currency: z.string().optional().default('usd'),
  paymentMethod: z.enum(['card', 'pix', 'boleto']).optional().default('card'),
  customerData: z.object({
    email: z.string().email('Email inválido'),
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    phone: z.string().optional()
  }).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
})

const createCheckoutSessionSchema = z.object({
  packageId: z.string().min(1, 'ID do pacote é obrigatório'),
  minerId: z.string().min(1, 'ID da mineradora é obrigatório'),
  quantity: z.number().int().min(1).max(50).optional().default(1),
  currency: z.string().optional().default('usd'),
  customerData: z.object({
    email: z.string().email('Email inválido'),
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    phone: z.string().optional()
  }).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
})

// ===== HANDLERS =====

/**
 * POST /api/stripe/charge
 * Criar Payment Intent para pagamento
 */
export async function POST(request: NextRequest) {
  try {
    console.log('💰 Criando Payment Intent Stripe')

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
    const validation = createPaymentIntentSchema.safeParse(body)

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

    const { packageId, minerId, quantity, currency, customerData, metadata, returnUrl, cancelUrl, paymentMethod } = validation.data

    // 3. Buscar dados do pacote para validação de limite
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(packageId) },
      select: { id: true, isActive: true, name: true, price: true }
    })

    if (!packageData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pacote não encontrado'
        },
        { status: 400 }
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

    // 4. Validar limite de compra do usuário
    const totalPurchaseAmount = Number(packageData.price) * quantity
    console.log('🔒 Validando limite de compra do usuário...')
    const limitValidation = await validatePurchaseLimit(BigInt(userId), totalPurchaseAmount)
    
    if (!limitValidation.isValid) {
      console.log('❌ Limite de compra excedido')
      return NextResponse.json(
        {
          success: false,
          error: 'Limite de compra excedido',
          message: limitValidation.message,
          details: {
            currentTotal: limitValidation.currentTotal,
            newTotal: limitValidation.newTotal,
            limit: limitValidation.limit,
            remainingAmount: limitValidation.remainingAmount
          }
        },
        { status: 400 }
      )
    }

    console.log('✅ Limite de compra validado com sucesso')

    // 5. Criar metadata com userId do usuário logado
    const metadataObj = {
      ...metadata,
      packageId,
      minerId,
      userId: userId,
      correlationID: generateCorrelationID()
    }

    // 6. Processar pagamento
    const result = await purchasePackageWithStripe({
      packageId,
      quantity,
      currency,
      paymentMethod,
      customerData,
      metadata: metadataObj,
      returnUrl,
      cancelUrl
    })

    console.log('🔄 Resultado do pagamento:', result)

    if (!result.success) {
      //console.error('❌ Erro ao processar pagamento:', result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // 5. Retornar resposta de sucesso
    return NextResponse.json({
      success: true,
      data: {
        paymentIntentId: result.paymentIntentId,
        clientSecret: result.clientSecret,
        customerId: result.customerId,
        pixData: result.pixData,
        boletoData: result.boletoData
      }
    })

  } catch (error) {
    console.error('❌ Erro interno:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/stripe/charge
 * Criar Checkout Session para pagamento
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('🛒 Criando Checkout Session Stripe')

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
    const validation = createCheckoutSessionSchema.safeParse(body)

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

    const { packageId, minerId, currency, customerData, metadata, returnUrl, cancelUrl } = validation.data

    // 3. Buscar dados do pacote para validação de limite
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(packageId) },
      select: { id: true, isActive: true, name: true, price: true }
    })

    if (!packageData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pacote não encontrado'
        },
        { status: 400 }
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

    // 4. Validar limite de compra do usuário
    const totalPurchaseAmount = Number(packageData.price)
    console.log('🔒 Validando limite de compra do usuário...')
    const limitValidation = await validatePurchaseLimit(BigInt(userId), totalPurchaseAmount)
    
    if (!limitValidation.isValid) {
      console.log('❌ Limite de compra excedido')
      return NextResponse.json(
        {
          success: false,
          error: 'Limite de compra excedido',
          message: limitValidation.message,
          details: {
            currentTotal: limitValidation.currentTotal,
            newTotal: limitValidation.newTotal,
            limit: limitValidation.limit,
            remainingAmount: limitValidation.remainingAmount
          }
        },
        { status: 400 }
      )
    }

    console.log('✅ Limite de compra validado com sucesso')

    // 5. Criar metadata com userId do usuário logado
    const metadataObj = {
      ...metadata,
      packageId,
      minerId,
      userId: userId
    }

    // 6. Criar Checkout Session
    const result = await createPackageCheckoutSession({
      packageId,
      currency,
      customerData,
      metadata: metadataObj,
      returnUrl,
      cancelUrl
    })

    if (!result.success) {
      console.error('❌ Erro ao criar Checkout Session:', result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    console.log('✅ Checkout Session criada com sucesso:', result.checkoutUrl)

    // 5. Retornar resposta
    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: result.checkoutUrl,
        customerId: result.customerId
      }
    })

  } catch (error) {
    console.error('❌ Erro interno:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stripe/charge
 * Verificar status do pagamento
 */
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('payment_intent_id')

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'ID do Payment Intent é obrigatório' },
        { status: 400 }
      )
    }

    console.log('🔍 Verificando status do pagamento:', paymentIntentId)

    // Importar função dinamicamente para evitar problemas de build
    const { getPaymentInfo } = await import('@/lib/stripe/stripe-integration')

    const result = await getPaymentInfo(paymentIntentId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: result.payment,
        customer: result.customer
      }
    })

  } catch (error) {
    console.error('❌ Erro ao verificar pagamento:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
