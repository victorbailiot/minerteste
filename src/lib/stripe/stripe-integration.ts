/**
 * Integração com Stripe para Sistema de Pacotes
 * Gerencia pagamentos, produtos e preços no Stripe
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  createCustomer, 
  createPaymentIntent, 
  createProduct, 
  createPrice, 
  createCheckoutSession,
  getPaymentIntent,
  getCustomer,
  toCents,
  fromCents,
  isSupportedCurrency,
  findProductByMetadata,
  findPriceByProductAndCurrency,
  listProductPrices,
  createOrUpdatePrice
} from '@/lib/stripe/stripe'
import { convertCurrency } from '@/lib/currency-utils'
import { generateCorrelationID } from '../openpix'

// ===== TIPOS =====

export interface StripePackagePurchaseRequest {
  packageId: string
  quantity?: number
  currency?: string
  paymentMethod?: 'card' | 'pix' | 'boleto'
  customerData?: {
    email: string
    name: string
    phone?: string
  }
  metadata?: Record<string, string>
  returnUrl?: string
  cancelUrl?: string
}

export interface StripePackagePurchaseResponse {
  success: boolean
  paymentIntentId?: string
  clientSecret?: string
  customerId?: string
  checkoutUrl?: string
  error?: string
  pixData?: {
    pixQrCode?: string
    pixCopiaCola?: string
  }
  boletoData?: {
    boletoUrl?: string
    boletoBarcode?: string
    dueDate?: string
  }
}

// ===== FUNÇÕES PRINCIPAIS =====

/**
 * Comprar pacote via Payment Intent
 */
export async function purchasePackageWithStripe(
  request: StripePackagePurchaseRequest
): Promise<StripePackagePurchaseResponse> {
  try {
    // 1. Validar sessão do usuário
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // 2. Buscar dados do pacote
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(request.packageId) }
    })

    if (!packageData) {
      return {
        success: false,
        error: 'Pacote não encontrado'
      }
    }

    if (!packageData.isActive) {
      return {
        success: false,
        error: 'Pacote não está ativo'
      }
    }

    // 3. Definir moeda (padrão: USD)
    const currency = request.currency || (request.paymentMethod === 'pix' || request.paymentMethod === 'boleto' ? 'brl' : 'usd')
    if (!isSupportedCurrency(currency)) {
      return {
        success: false,
        error: `Moeda não suportada: ${currency}`
      }
    }

    // Para PIX e Boleto, forçar moeda BRL
    if ((request.paymentMethod === 'pix' || request.paymentMethod === 'boleto') && currency !== 'brl') {
      return {
        success: false,
        error: `${request.paymentMethod === 'pix' ? 'PIX' : 'Boleto'} só é suportado com moeda BRL`
      }
    }

    // 4. Buscar ou criar produto no Stripe
    const productResult = await findOrCreateProduct(
      request.packageId,
      packageData.name,
      packageData.description || `Pacote ${packageData.name}`,
      Number(packageData.points),
      Number(packageData.cycleBonus)
    )
    
    const stripeProductId = productResult.productId

    // 5. Converter preço e aplicar taxa de 6,1% SOMENTE para Stripe (card/pix/boleto)
    const conversionResult = await convertCurrency(Number(packageData.price), 'brl', currency)
    const baseConverted = conversionResult.convertedAmount
    const priceInCurrency = Math.round(baseConverted * 1.061 * 100) / 100
    
    console.log(`💰 Stripe - Valor base: ${Number(packageData.price)} | Moeda ${currency}: ${priceInCurrency}`)

    // 6. Criar ou atualizar preço no Stripe
    const priceResult = await createOrUpdatePrice({
      productId: stripeProductId,
      unitAmount: toCents(priceInCurrency),
      currency: currency,
      metadata: {
        packageId: request.packageId,
        packageName: packageData.name,
        originalPriceBRL: packageData.price.toString(),
        exchangeRate: currency === 'brl' ? '1' : (priceInCurrency / Number(packageData.price)).toString(),
        conversionSource: 'API'
      }
    })
    
    const stripePriceId = priceResult.price.id

    // 7. Buscar ou criar cliente no Stripe
    
    // Buscar dados do usuário logado
    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: { id: true, name: true, email: true, phone: true }
    })

    if (!user) {
      return {
        success: false,
        error: 'Usuário não encontrado'
      }
    }

    // Usar dados do usuário logado ou dados fornecidos
    const customerEmail = request.customerData?.email || user.email
    const customerName = request.customerData?.name || user.name
    const customerPhone = request.customerData?.phone || user.phone

    // Criar cliente no Stripe com dados do usuário logado
    const customer = await createCustomer({
      email: customerEmail,
      name: customerName,
      phone: customerPhone,
      metadata: {
        userId: session.user.id,
        packageId: request.packageId
      }
    })
    const customerId = customer.id

    // 8. Criar Payment Intent
    const quantity = request.quantity || 1
    const amountInCents = toCents(priceInCurrency * quantity)
    
    // Definir métodos de pagamento baseado no tipo
    let paymentMethodTypes: string[] | undefined
    let paymentMethodOptions: any = undefined
    
    if (request.paymentMethod === 'pix') {
      paymentMethodTypes = ['pix']
      // Configuração específica para PIX conforme documentação do Stripe
      // IOF (Imposto sobre Operações Financeiras) de 3.5% para transações internacionais
      paymentMethodOptions = {
        pix: {
          // 'never' = cliente paga o IOF (valor será acrescido 3.5% no app do banco)
          // 'always' = merchant absorve o IOF (valor é deduzido do settlement)
          // Por padrão, usamos 'always' para que o valor no checkout seja o valor final
          expires_after_seconds: 3600 // PIX expira em 1 hora (3600 segundos)
        }
      }
    } else if (request.paymentMethod === 'boleto') {
      paymentMethodTypes = ['boleto']
      // Configuração específica para boleto conforme documentação do Stripe
      paymentMethodOptions = {
        boleto: {
          expires_after_days: 7 // Boleto vence em 7 dias
        }
      }
    }
    
    const paymentIntent = await createPaymentIntent({
      amount: amountInCents,
      currency: currency,
      customerId: customerId,
      paymentMethodTypes: paymentMethodTypes,
      paymentMethodOptions: paymentMethodOptions,
      metadata: {
        userId: session.user.id,
        packageId: request.packageId,
        packageName: packageData.name,
        quantity: quantity.toString(),
        paymentMethod: request.paymentMethod || 'card',
        ...request.metadata
      }
    })

    // 9. Salvar transação no banco
    const paymentMethodUsed = request.paymentMethod || 'card'
    const transactionType = paymentMethodUsed === 'card' ? 'CREDIT_PAYMENT' : 'DEPOSIT'
    
    const transaction = await prisma.transaction.create({
      data: {
        user: {
          connect: { id: BigInt(session.user.id) }
        },
        type: transactionType,
        amount: Number(packageData.price) * quantity,
        quantity: quantity,
        status: 'PENDING',
        description: `Compra de ${quantity} pacote(s) ${packageData.name} via Stripe ${paymentMethodUsed}`,
        chargeId: paymentIntent.id, 
        correlationID: request?.metadata?.correlationID
      }
    })

    
    // 10. Se for PIX ou Boleto, buscar dados específicos
    let pixData: any = null
    let boletoData: any = null
    
    if (request.paymentMethod === 'pix') {
      try {
        // Buscar dados do PIX do Payment Intent
        const paymentIntentDetails = await getPaymentIntent(paymentIntent.id)
        if (paymentIntentDetails) {
          // O Stripe retorna dados do PIX no next_action
          pixData = {
            pixQrCode: (paymentIntentDetails as any).next_action?.pix_display_qr_code?.image_url_png,
            pixCopiaCola: (paymentIntentDetails as any).next_action?.pix_display_qr_code?.data
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados do PIX:', error)
      }
    } else if (request.paymentMethod === 'boleto') {
      try {
        // Buscar dados do Boleto do Payment Intent
        const paymentIntentDetails = await getPaymentIntent(paymentIntent.id)
        console.log('Payment Intent Details para Boleto:', JSON.stringify(paymentIntentDetails, null, 2))
        
        if (paymentIntentDetails) {
          // O Stripe retorna dados do Boleto no next_action.boleto_display_details
          const boletoAction = (paymentIntentDetails as any).next_action?.boleto_display_details
          console.log('Boleto Action:', JSON.stringify(boletoAction, null, 2))
          
          if (boletoAction) {
            boletoData = {
              boletoUrl: boletoAction.hosted_voucher_url,
              boletoBarcode: boletoAction.pdf, // URL do PDF do boleto
              dueDate: boletoAction.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
            console.log('Dados do boleto extraídos:', boletoData)
          } else {
            console.log('Boleto action não encontrado, verificando estrutura completa...')
            console.log('next_action:', (paymentIntentDetails as any).next_action)
            
            // Fallback: tentar outras estruturas possíveis
            const nextAction = (paymentIntentDetails as any).next_action
            if (nextAction) {
              // Tentar diferentes estruturas possíveis
              const possibleBoletoData = nextAction.boleto_display_details || 
                                       nextAction.boleto || 
                                       nextAction.display_details
              
              if (possibleBoletoData) {
                boletoData = {
                  boletoUrl: possibleBoletoData.hosted_voucher_url || possibleBoletoData.url,
                  boletoBarcode: possibleBoletoData.pdf || possibleBoletoData.barcode,
                  dueDate: possibleBoletoData.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }
                console.log('Dados do boleto encontrados via fallback:', boletoData)
              } else {
                console.log('Nenhum dado de boleto encontrado na estrutura next_action')
              }
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados do Boleto:', error)
      }
    }

    const response: StripePackagePurchaseResponse = {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      customerId: customerId
    }

    if (pixData) {
      response.pixData = pixData
    }
    
    if (boletoData) {
      response.boletoData = boletoData
    }

    return response

  } catch (error) {
    console.error('Erro ao processar compra com Stripe:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Criar Checkout Session para pacote
 */
export async function createPackageCheckoutSession(
  request: StripePackagePurchaseRequest
): Promise<StripePackagePurchaseResponse> {
  try {
    // 1. Validar sessão do usuário
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      }
    }

    // 2. Buscar dados do pacote
    const packageData = await prisma.package.findUnique({
      where: { id: BigInt(request.packageId) }
    })

    if (!packageData) {
      return {
        success: false,
        error: 'Pacote não encontrado'
      }
    }

    if (!packageData.isActive) {
      return {
        success: false,
        error: 'Pacote não está ativo'
      }
    }

    // 3. Definir moeda (padrão: USD)
    const currency = request.currency || 'brl'
    if (!isSupportedCurrency(currency)) {
      return {
        success: false,
        error: `Moeda não suportada: ${currency}`
      }
    }

    // 4. Buscar ou criar produto no Stripe
    const productResult = await findOrCreateProduct(
      request.packageId,
      packageData.name,
      packageData.description || `Pacote ${packageData.name}`,
      Number(packageData.points),
      Number(packageData.cycleBonus)
    )
    
    const stripeProductId = productResult.productId

    // 5. Converter preço e aplicar taxa de 6,1% SOMENTE para Stripe Checkout
    const conversionResult = await convertCurrency(Number(packageData.price), 'brl', currency)
    const baseConverted = conversionResult.convertedAmount
    const priceInCurrency = Math.round(baseConverted * 1.061 * 100) / 100
    
    console.log(`💰 Stripe - Valor base: ${Number(packageData.price)} | Moeda ${currency}: ${priceInCurrency}`)

    // 6. Criar ou atualizar preço no Stripe
    const priceResult = await createOrUpdatePrice({
      productId: stripeProductId,
      unitAmount: toCents(priceInCurrency),
      currency: currency,
      metadata: {
        packageId: request.packageId,
        packageName: packageData.name,
        originalPriceBRL: packageData.price.toString(),
        exchangeRate: currency === 'brl' ? '1' : (priceInCurrency / Number(packageData.price)).toString(),
        conversionSource: 'API'
      }
    })
    
    const stripePriceId = priceResult.price.id

    // 7. Buscar ou criar cliente no Stripe
    
    // Buscar dados do usuário logado
    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: { id: true, name: true, email: true, phone: true }
    })

    if (!user) {
      return {
        success: false,
        error: 'Usuário não encontrado'
      }
    }

    // Usar dados do usuário logado ou dados fornecidos
    const customerEmail = request.customerData?.email || user.email
    const customerName = request.customerData?.name || user.name
    const customerPhone = request.customerData?.phone || user.phone

    // Criar cliente no Stripe com dados do usuário logado
    const customer = await createCustomer({
      email: customerEmail,
      name: customerName,
      phone: customerPhone,
      metadata: {
        userId: session.user.id,
        packageId: request.packageId
      }
    })
    const customerId = customer.id

    // 8. Criar Checkout Session
    const quantity = request.quantity || 1
    const successUrl = request.returnUrl || `${process.env.NEXTAUTH_URL}/dashboard/planos?success=true&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = request.cancelUrl || `${process.env.NEXTAUTH_URL}/dashboard/planos?canceled=true`

    const sessionData = await createCheckoutSession({
      lineItems: [{
        price: stripePriceId,
        quantity: quantity
      }],
      mode: 'payment',
      successUrl: successUrl,
      cancelUrl: cancelUrl,
      customerId: customerId,
      metadata: {
        userId: session.user.id,
        packageId: request.packageId,
        packageName: packageData.name,
        quantity: quantity.toString()
      },
      currency: currency,
      locale: 'auto'
    })

    return {
      success: true,
      checkoutUrl: sessionData.url
    }

  } catch (error) {
    console.error('Erro ao criar Checkout Session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}



/**
 * Buscar ou criar produto no Stripe
 */
async function findOrCreateProduct(
  packageId: string,
  packageName: string,
  packageDescription: string,
  points: number,
  cycleBonus: number
): Promise<{ productId: string; isNew: boolean }> {
  try {
    // Buscar produto existente por packageId
    const existingProduct = await findProductByMetadata({
      packageId: packageId
    })

    if (existingProduct) {
      console.log(`✅ Produto existente encontrado: ${existingProduct.id}`)
      return {
        productId: existingProduct.id,
        isNew: false
      }
    }

    // Criar novo produto se não existir
    console.log(`🆕 Criando novo produto para: ${packageName}`)
    const newProduct = await createProduct({
      name: packageName,
      metadata: {
        packageId: packageId
      }
    })

    return {
      productId: newProduct.id,
      isNew: true
    }
  } catch (error) {
    console.error('Erro ao buscar/criar produto:', error)
    throw error
  }
}

/**
 * Criar preços para moedas que não existem ou atualizar valores
 */
async function createMissingPrices(
  productId: string,
  basePriceBRL: number,
  packageId: string,
  packageName: string
): Promise<{
  success: boolean
  created: number
  updated: number
  skipped: number
  errors: string[]
}> {
  const currencies = [
    'usd', 'eur', 'brl', 'cad', 'aud', 'gbp', 'jpy', 'chf', 'sek', 'nok',
    'dkk', 'pln', 'czk', 'huf', 'ron', 'hrk', 'rub', 'try', 'inr', 'sgd',
    'hkd', 'nzd', 'mxn', 'ars', 'clp', 'cop', 'pen', 'uyu', 'pyg', 'bob'
  ]

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const currency of currencies) {
    try {
      let priceInCurrency: number

      if (currency === 'brl') {
        priceInCurrency = basePriceBRL
      } else {
        const conversionResult = await convertCurrency(basePriceBRL, 'brl', currency)
        priceInCurrency = conversionResult.convertedAmount
      }

      const result = await createOrUpdatePrice({
        productId: productId,
        unitAmount: toCents(priceInCurrency),
        currency: currency,
        metadata: {
          packageId: packageId,
          packageName: packageName,
          originalPriceBRL: basePriceBRL.toString(),
          exchangeRate: currency === 'brl' ? '1' : (priceInCurrency / basePriceBRL).toString(),
          conversionSource: 'API'
        }
      })

      if (result.action === 'created') {
        created++
      } else if (result.action === 'updated') {
        if (result.oldPriceId) {
          updated++
        } else {
          skipped++
        }
      }

    } catch (error) {
      const errorMessage = `Erro ao criar/atualizar preço para ${currency}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      errors.push(errorMessage)
      console.error(`❌ ${errorMessage}`)
    }
  }

  return {
    success: created > 0 || updated > 0 || skipped > 0,
    created,
    updated,
    skipped,
    errors
  }
}

/**
 * Sincronizar produtos e preços com Stripe
 */
export async function syncPackagesWithStripe(): Promise<{
  success: boolean
  synced: number
  errors: string[]
}> {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true }
    })

    let synced = 0
    const errors: string[] = []

    for (const packageData of packages) {
      try {
        console.log(`🔄 Sincronizando pacote: ${packageData.name}`)

        // Buscar ou criar produto
        const productResult = await findOrCreateProduct(
          packageData.id.toString(),
          packageData.name,
          packageData.description || `Pacote ${packageData.name}`,
          Number(packageData.points),
          Number(packageData.cycleBonus)
        )

        if (productResult.isNew) {
          console.log(`✅ Novo produto criado: ${productResult.productId}`)
        } else {
          console.log(`✅ Produto existente encontrado: ${productResult.productId}`)
        }

        // Criar preços para moedas que não existem
        const priceResult = await createMissingPrices(
          productResult.productId,
          Number(packageData.price), // Preço em BRL do banco
          packageData.id.toString(),
          packageData.name
        )

        if (priceResult.success) {
          console.log(`✅ ${packageData.name}: ${priceResult.created} criados, ${priceResult.updated} atualizados, ${priceResult.skipped} mantidos`)
          synced++
        } else {
          errors.push(`Falha ao criar/atualizar preços para ${packageData.name}: ${priceResult.errors.join(', ')}`)
        }

      } catch (error) {
        const errorMessage = `Erro ao sincronizar pacote ${packageData.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        errors.push(errorMessage)
        console.error(`❌ ${errorMessage}`)
      }
    }

    console.log(`🎉 Sincronização concluída: ${synced} pacotes sincronizados`)

    return {
      success: synced > 0,
      synced,
      errors
    }

  } catch (error) {
    console.error('Erro ao sincronizar pacotes:', error)
    return {
      success: false,
      synced: 0,
      errors: [error instanceof Error ? error.message : 'Erro desconhecido']
    }
  }
}

/**
 * Obter informações do pagamento
 */
export async function getPaymentInfo(paymentIntentId: string): Promise<{
  success: boolean
  payment?: any
  customer?: any
  error?: string
}> {
  try {
    const payment = await getPaymentIntent(paymentIntentId)
    
    if (!payment) {
      return {
        success: false,
        error: 'Pagamento não encontrado'
      }
    }

    let customer: any = undefined
    if (payment.metadata?.stripeCustomerId) {
      const customerData = await getCustomer(payment.metadata.stripeCustomerId)
      customer = customerData || undefined
    }

    return {
      success: true,
      payment,
      customer
    }

  } catch (error) {
    console.error('Erro ao obter informações do pagamento:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}
