/**
 * Integração Stripe para Pagamentos Internacionais
 * Suporte a múltiplas moedas e métodos de pagamento
 */

import Stripe from 'stripe'

// ===== CONFIGURAÇÃO =====

const stripeConfig = {
  apiKey: process.env.STRIPE_SECRET_KEY!,
  apiVersion: '2024-12-18.acacia' as const,
  typescript: true,
}

// Inicializar cliente Stripe
const stripe = new Stripe(stripeConfig.apiKey, {
  apiVersion: '2025-07-30.basil' as const,
})

// ===== TIPOS E INTERFACES =====

export interface StripeCustomer {
  id: string
  email: string
  name: string
  phone?: string
  metadata?: Record<string, string>
}

export interface StripePaymentIntent {
  id: string
  amount: number
  currency: string
  status: string
  client_secret: string
  payment_method_types: string[]
  metadata?: Record<string, string>
  next_action?: any
}

export interface StripeProduct {
  id: string
  name: string
  description?: string
  active: boolean
  metadata?: Record<string, string>
}

export interface StripePrice {
  id: string
  product: string
  unit_amount: number
  currency: string
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year'
    interval_count: number
  }
  metadata?: Record<string, string>
}

export interface CreatePaymentIntentOptions {
  amount: number // em centavos
  currency: string // 'usd', 'eur', 'brl', etc.
  customerId?: string
  customerData?: {
    email: string
    name: string
    phone?: string
  }
  metadata?: Record<string, string>
  description?: string
  paymentMethodTypes?: string[]
  paymentMethodOptions?: Record<string, any>
  automaticPaymentMethods?: boolean
  confirm?: boolean
  returnUrl?: string
}

export interface CreateCustomerOptions {
  email: string
  name: string
  phone?: string
  metadata?: Record<string, string>
  description?: string
}

export interface CreateProductOptions {
  name: string
  description?: string
  metadata?: Record<string, string>
  images?: string[]
}

export interface CreatePriceOptions {
  productId: string
  unitAmount: number // em centavos
  currency: string
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year'
    intervalCount: number
  }
  metadata?: Record<string, string>
}

export interface WebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
  created: number
}

// ===== FUNÇÕES PRINCIPAIS =====

/**
 * Criar cliente no Stripe
 */
export async function createCustomer(options: CreateCustomerOptions): Promise<StripeCustomer> {
  try {
    const customer = await stripe.customers.create({
      email: options.email,
      name: options.name,
      phone: options.phone,
      metadata: options.metadata,
      description: options.description,
    })

    return {
      id: customer.id,
      email: customer.email!,
      name: customer.name!,
      phone: customer.phone || undefined,
      metadata: customer.metadata,
    }
  } catch (error) {
    console.error('Erro ao criar cliente Stripe:', error)
    throw new Error(`Falha ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Buscar cliente por ID
 */
export async function getCustomer(customerId: string): Promise<StripeCustomer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    
    if (customer.deleted) {
      return null
    }

    return {
      id: customer.id,
      email: customer.email!,
      name: customer.name!,
      phone: customer.phone || undefined,
      metadata: customer.metadata,
    }
  } catch (error) {
    console.error('Erro ao buscar cliente Stripe:', error)
    return null
  }
}

/**
 * Criar Payment Intent para pagamento
 */
export async function createPaymentIntent(options: CreatePaymentIntentOptions): Promise<StripePaymentIntent> {
  try {
    // Criar cliente se não existir
    let customerId = options.customerId
    
    if (!customerId && options.customerData) {
      const customer = await createCustomer(options.customerData)
      customerId = customer.id
    }

    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: options.amount,
      currency: options.currency,
      description: options.description,
      metadata: options.metadata,
      automatic_payment_methods: options.paymentMethodTypes ? undefined : {
        enabled: true,
      },
      payment_method_types: options.paymentMethodTypes,
      payment_method_options: options.paymentMethodOptions,
    }

    if (customerId) {
      paymentIntentData.customer = customerId
    }

    if (options.confirm) {
      paymentIntentData.confirm = true
      if (options.returnUrl) {
        paymentIntentData.return_url = options.returnUrl
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret!,
      payment_method_types: paymentIntent.payment_method_types,
      metadata: paymentIntent.metadata,
    }
  } catch (error) {
    console.error('Erro ao criar Payment Intent:', error)
    throw new Error(`Falha ao criar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Buscar Payment Intent por ID
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent | null> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret!,
      payment_method_types: paymentIntent.payment_method_types,
      metadata: paymentIntent.metadata,
      next_action: paymentIntent.next_action,
    }
  } catch (error) {
    console.error('Erro ao buscar Payment Intent:', error)
    return null
  }
}

/**
 * Confirmar Payment Intent
 */
export async function confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<StripePaymentIntent> {
  try {
    const confirmData: Stripe.PaymentIntentConfirmParams = {}
    
    if (paymentMethodId) {
      confirmData.payment_method = paymentMethodId
    }

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, confirmData)

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret!,
      payment_method_types: paymentIntent.payment_method_types,
      metadata: paymentIntent.metadata,
    }
  } catch (error) {
    console.error('Erro ao confirmar Payment Intent:', error)
    throw new Error(`Falha ao confirmar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Cancelar Payment Intent
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId)

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret!,
      payment_method_types: paymentIntent.payment_method_types,
      metadata: paymentIntent.metadata,
    }
  } catch (error) {
    console.error('Erro ao cancelar Payment Intent:', error)
    throw new Error(`Falha ao cancelar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Criar produto no Stripe
 */
export async function createProduct(options: CreateProductOptions): Promise<StripeProduct> {
  try {
    const product = await stripe.products.create({
      name: options.name,
      description: options.description,
      metadata: options.metadata,
      images: options.images,
    })

    return {
      id: product.id,
      name: product.name,
      description: product.description || undefined,
      active: product.active,
      metadata: product.metadata,
    }
  } catch (error) {
    console.error('Erro ao criar produto Stripe:', error)
    throw new Error(`Falha ao criar produto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Criar preço para produto
 */
export async function createPrice(options: CreatePriceOptions): Promise<StripePrice> {
  try {
    const priceData: Stripe.PriceCreateParams = {
      product: options.productId,
      unit_amount: options.unitAmount,
      currency: options.currency,
      metadata: options.metadata,
    }

    if (options.recurring) {
      priceData.recurring = {
        interval: options.recurring.interval,
        interval_count: options.recurring.intervalCount,
      }
    }

    const price = await stripe.prices.create(priceData)

    return {
      id: price.id,
      product: typeof price.product === 'string' ? price.product : price.product.id,
      unit_amount: price.unit_amount!,
      currency: price.currency,
      recurring: price.recurring || undefined,
      metadata: price.metadata,
    }
  } catch (error) {
    console.error('Erro ao criar preço Stripe:', error)
    throw new Error(`Falha ao criar preço: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Atualizar preço existente no Stripe
 * Nota: O Stripe não permite atualizar preços existentes, então criamos um novo e desativamos o antigo
 */
export async function updatePrice(
  priceId: string,
  newUnitAmount: number,
  newMetadata?: Record<string, string>
): Promise<StripePrice> {
  try {
    // 1. Desativar o preço antigo
    await stripe.prices.update(priceId, {
      active: false
    })

    // 2. Obter informações do preço antigo
    const oldPrice = await stripe.prices.retrieve(priceId)
    
    // 3. Criar novo preço com o valor atualizado
    const newPriceData: Stripe.PriceCreateParams = {
      product: typeof oldPrice.product === 'string' ? oldPrice.product : oldPrice.product.id,
      unit_amount: newUnitAmount,
      currency: oldPrice.currency,
      metadata: newMetadata || oldPrice.metadata,
    }

    if (oldPrice.recurring) {
      newPriceData.recurring = {
        interval: oldPrice.recurring.interval,
        interval_count: oldPrice.recurring.interval_count,
      }
    }

    const newPrice = await stripe.prices.create(newPriceData)

    return {
      id: newPrice.id,
      product: typeof newPrice.product === 'string' ? newPrice.product : newPrice.product.id,
      unit_amount: newPrice.unit_amount!,
      currency: newPrice.currency,
      recurring: newPrice.recurring || undefined,
      metadata: newPrice.metadata,
    }
  } catch (error) {
    console.error('Erro ao atualizar preço Stripe:', error)
    throw new Error(`Falha ao atualizar preço: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Criar ou atualizar preço para uma moeda específica
 */
export async function createOrUpdatePrice(options: {
  productId: string
  unitAmount: number
  currency: string
  metadata?: Record<string, string>
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year'
    intervalCount: number
  }
}): Promise<{
  price: StripePrice
  action: 'created' | 'updated'
  oldPriceId?: string
}> {
  try {
    // 1. Verificar se já existe um preço ativo para esta moeda
    const existingPrice = await findPriceByProductAndCurrency(options.productId, options.currency)
    
    if (existingPrice) {
      // 2. Se o valor for diferente, atualizar o preço
      if (existingPrice.unit_amount !== options.unitAmount) {
        console.log(`🔄 Atualizando preço existente para ${options.currency.toUpperCase()}: ${fromCents(existingPrice.unit_amount)} → ${fromCents(options.unitAmount)}`)
        
        const updatedPrice = await updatePrice(
          existingPrice.id,
          options.unitAmount,
          options.metadata
        )
        
        return {
          price: updatedPrice,
          action: 'updated',
          oldPriceId: existingPrice.id
        }
      } else {
        // 3. Se o valor for o mesmo, retornar o preço existente
        console.log(`⏭️ Preço para ${options.currency.toUpperCase()} já existe com o mesmo valor, mantendo...`)
        return {
          price: existingPrice,
          action: 'updated',
          oldPriceId: undefined
        }
      }
    } else {
      // 4. Se não existir, criar novo preço
      console.log(`🆕 Criando novo preço para ${options.currency.toUpperCase()}: ${fromCents(options.unitAmount)}`)
      
      const newPrice = await createPrice({
        productId: options.productId,
        unitAmount: options.unitAmount,
        currency: options.currency,
        metadata: options.metadata,
        recurring: options.recurring
      })
      
      return {
        price: newPrice,
        action: 'created',
        oldPriceId: undefined
      }
    }
  } catch (error) {
    console.error('Erro ao criar/atualizar preço:', error)
    throw error
  }
}

/**
 * Criar Checkout Session para pagamento
 */
export async function createCheckoutSession(options: {
  lineItems: Array<{
    price: string
    quantity: number
  }>
  mode: 'payment' | 'subscription'
  successUrl: string
  cancelUrl: string
  customerId?: string
  metadata?: Record<string, string>
  currency?: string
  locale?: string
}): Promise<{ id: string; url: string }> {
  try {
    const sessionData: Stripe.Checkout.SessionCreateParams = {
      line_items: options.lineItems,
      mode: options.mode,
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      metadata: options.metadata,
      currency: options.currency || 'usd',
      locale: (options.locale || 'auto') as any,
    }

    if (options.customerId) {
      sessionData.customer = options.customerId
    }

    const session = await stripe.checkout.sessions.create(sessionData)

    return {
      id: session.id,
      url: session.url!,
    }
  } catch (error) {
    console.error('Erro ao criar Checkout Session:', error)
    throw new Error(`Falha ao criar sessão de checkout: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Verificar assinatura de webhook
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret)
    return !!event
  } catch (error) {
    console.error('Erro ao verificar assinatura do webhook:', error)
    return false
  }
}

/**
 * Processar evento de webhook
 */
export function constructWebhookEvent(payload: string, signature: string, secret: string): WebhookEvent {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret)
    
    return {
      id: event.id,
      type: event.type,
      data: event.data,
      created: event.created,
    }
  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    throw new Error(`Falha ao processar webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Converter valor para centavos
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Converter centavos para valor
 */
export function fromCents(cents: number): number {
  return cents / 100
}

/**
 * Obter moedas suportadas
 */
export const SUPPORTED_CURRENCIES = [
  'usd', 'eur', 'brl', 'cad', 'aud', 'gbp', 'jpy', 'chf', 'sek', 'nok',
  'dkk', 'pln', 'czk', 'huf', 'ron', 'hrk', 'rub', 'try', 'inr', 'sgd',
  'hkd', 'nzd', 'mxn', 'ars', 'clp', 'cop', 'pen', 'uyu', 'pyg', 'bob'
] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

/**
 * Verificar se moeda é suportada
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)
}

/**
 * Obter símbolo da moeda
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    usd: '$',
    eur: '€',
    brl: 'R$',
    cad: 'C$',
    aud: 'A$',
    gbp: '£',
    jpy: '¥',
    chf: 'CHF',
    sek: 'kr',
    nok: 'kr',
    dkk: 'kr',
    pln: 'zł',
    czk: 'Kč',
    huf: 'Ft',
    ron: 'lei',
    hrk: 'kn',
    rub: '₽',
    try: '₺',
    inr: '₹',
    sgd: 'S$',
    hkd: 'HK$',
    nzd: 'NZ$',
    mxn: '$',
    ars: '$',
    clp: '$',
    cop: '$',
    pen: 'S/',
    uyu: '$U',
    pyg: '₲',
    bob: 'Bs'
  }
  
  return symbols[currency.toLowerCase()] || currency.toUpperCase()
}

/**
 * Buscar produto no Stripe por metadados
 */
export async function findProductByMetadata(metadata: Record<string, string>): Promise<StripeProduct | null> {
  try {
    // Buscar produtos com os metadados especificados
    const products = await stripe.products.list({
      limit: 100,
      active: true
    })

    // Filtrar produtos que correspondem aos metadados
    for (const product of products.data) {
      let matches = true
      
      for (const [key, value] of Object.entries(metadata)) {
        if (product.metadata[key] !== value) {
          matches = false
          break
        }
      }
      
      if (matches) {
        return {
          id: product.id,
          name: product.name,
          description: product.description || undefined,
          active: product.active,
          metadata: product.metadata,
        }
      }
    }

    return null
  } catch (error) {
    console.error('Erro ao buscar produto por metadados:', error)
    return null
  }
}

/**
 * Buscar preço existente no Stripe
 */
export async function findPriceByProductAndCurrency(
  productId: string, 
  currency: string
): Promise<StripePrice | null> {
  try {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100
    })

    // Buscar preço com a moeda específica
    const price = prices.data.find(p => p.currency === currency)
    
    if (price) {
      return {
        id: price.id,
        product: typeof price.product === 'string' ? price.product : price.product.id,
        unit_amount: price.unit_amount!,
        currency: price.currency,
        recurring: price.recurring || undefined,
        metadata: price.metadata,
      }
    }

    return null
  } catch (error) {
    console.error('Erro ao buscar preço por produto e moeda:', error)
    return null
  }
}

/**
 * Listar todos os preços de um produto
 */
export async function listProductPrices(productId: string): Promise<StripePrice[]> {
  try {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100
    })

    return prices.data.map(price => ({
      id: price.id,
      product: typeof price.product === 'string' ? price.product : price.product.id,
      unit_amount: price.unit_amount!,
      currency: price.currency,
      recurring: price.recurring || undefined,
      metadata: price.metadata,
    }))
  } catch (error) {
    console.error('Erro ao listar preços do produto:', error)
    return []
  }
}

export default stripe
