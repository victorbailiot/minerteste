/**
 * Biblioteca Pagar.me REST API para Node.js/Next.js
 * Baseada na documentação oficial da Pagar.me
 * https://docs.pagar.me/reference/pedidos-1
 */

import { logCurlRequest } from "../networkUtils"

// ===== TIPOS E INTERFACES =====

export interface PagarMeConfig {
  apiKey: string
  env?: 'sandbox' | 'production'
  baseURL?: string
}

export interface PagarMeHeaders {
  'Authorization': string
  'Content-Type': 'application/json'
  'User-Agent'?: string
}

// ===== TIPOS PARA CLIENTES =====

export interface Customer {
  name: string
  email: string
  type: 'individual' | 'company'
  document: string
  document_type: 'cpf' | 'cnpj' | 'passport'
  phones?: {
    mobile_phone?: {
      country_code: string
      area_code: string
      number: string
    }
    home_phone?: {
      country_code: string
      area_code: string
      number: string
    }
  }
  address?: {
    line_1: string
    line_2?: string
    zip_code: string
    city: string
    state: string
    country: string
  }
  metadata?: Record<string, string>
}

// ===== TIPOS PARA RECEBEDORES =====

export interface BankAccount {
  bank: string
  branch_number: string
  branch_check_digit?: string
  account_number: string
  account_check_digit: string
  type: 'checking' | 'savings'
  holder_name: string
  holder_type: 'individual' | 'company'
  holder_document: string
  metadata?: Record<string, string>
}

export interface CreateRecipientRequest {
  name: string
  email: string
  description?: string
  document: string
  type: 'individual' | 'company'
  default_bank_account: BankAccount
  transfer_settings?: {
    transfer_enabled: boolean
    transfer_interval: 'daily' | 'weekly' | 'monthly'
    transfer_day?: number
  }
  automatic_anticipation_settings?: {
    enabled: boolean
    type?: 'full' | 'partial'
    volume_percentage?: number
    delay?: number
  }
  metadata?: Record<string, string>
}

export interface RecipientResponse {
  id: string
  name: string
  email: string
  description?: string
  document: string
  type: 'individual' | 'company'
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  created_at: string
  updated_at: string
  default_bank_account: BankAccount & {
    id: string
    status: 'active' | 'inactive' | 'pending'
    created_at: string
    updated_at: string
  }
  gateway_recipients?: Array<{
    gateway: string
    status: string
    pgid: string
    created_at: string
    updated_at: string
  }>
  transfer_settings?: {
    transfer_enabled: boolean
    transfer_interval: 'daily' | 'weekly' | 'monthly'
    transfer_day?: number
  }
  automatic_anticipation_settings?: {
    enabled: boolean
    type?: 'full' | 'partial'
    volume_percentage?: number
    delay?: number
  }
  metadata?: Record<string, string>
}

export interface UpdateBankAccountRequest {
  bank: string
  branch_number: string
  branch_check_digit?: string
  account_number: string
  account_check_digit: string
  type: 'checking' | 'savings'
  holder_name: string
  holder_type: 'individual' | 'company'
  holder_document: string
  metadata?: Record<string, string>
}

// ===== TIPOS PARA ENTREGAS =====

export interface Shipping {
  amount: number
  description: string
  recipient_name: string
  recipient_phone: string
  address: {
    line_1: string
    line_2?: string
    zip_code: string
    city: string
    state: string
    country: string
  }
  max_delivery_date?: string
  earliest_delivery_date?: string
}

// ===== TIPOS PARA ITENS DO PEDIDO =====

export interface OrderItem {
  amount: number
  description: string
  quantity: number
  code: string
  type: 'product' | 'physical' | 'digital' | 'service' | 'airline_ticket'
  category?: string
  brand?: string
  model?: string
  weight?: number
  height?: number
  width?: number
  length?: number
  unit?: string
  url?: string
  image_url?: string
  metadata?: Record<string, string>
}

// ===== TIPOS PARA PAGAMENTOS =====

export interface PaymentMethod {
  type: 'credit_card' | 'boleto' | 'pix' | 'voucher' | 'cash',
  amount?: number,
  installments?: number
  statement_descriptor?: string
  card?: {
    number: string
    holder_name: string
    exp_month: number
    exp_year: number
    cvv: string
    brand?: string
    billing_address?: {
      line_1: string
      line_2?: string
      zip_code: string
      city: string
      state: string
      country: string
    }
  }
  credit_card?: {
    installments: number
    statement_descriptor?: string
    card?: {
      number: string
      holder_name: string
      exp_month: number
      exp_year: number
      cvv: string
      brand?: string
      billing_address?: {
        line_1: string
        line_2?: string
        zip_code: string
        city: string
        state: string
        country: string
      }
    }
    card_token?: string
    card_id?: string
    billing_address?: {
      line_1: string
      line_2?: string
      zip_code: string
      city: string
      state: string
      country: string
    }
  }
  billing?: {
    address: {
      line_1: string
      zip_code: string
      city: string
      state: string
      country: string
    }
  }
  boleto?: {
    type: 'DM' | 'BDB' | 'BDP' | 'BDS' | 'BDBB' | 'BDBD' | 'BDBE' | 'BDBF' | 'BDBG' | 'BDBH' | 'BDBI' | 'BDBJ' | 'BDBK' | 'BDBL' | 'BDBM' | 'BDBO' | 'BDBP' | 'BDBQ' | 'BDBR' | 'BDBT' | 'BDBU' | 'BDBV' | 'BDBW' | 'BDBX' | 'BDBY' | 'BDBZ'
    due_at?: string
    document_number?: string
    instructions?: string[]
    interest?: {
      days: number
      type: 'percentage' | 'amount'
      amount: number
    }
    fine?: {
      days: number
      type: 'percentage' | 'amount'
      amount: number
    }
    max_days_to_pay_past_due?: number
  }
  pix?: {
    expires_in?: number
    additional_information?: Array<{
      name: string
      value: string
    }>
  }
  voucher?: {
    statement_descriptor?: string
    card_id?: string
    card_token?: string
    recurrency_cycle?: 'first' | 'subsequent'
  }
  cash?: {
    confirm?: boolean
    description?: string
    amount?: number
  }
}

// ===== TIPOS PARA ANTIFRAUDE =====

export interface Antifraud {
  type: 'clearsale' | 'konduto' | 'signifyd'
  clearsale?: {
    custom_sla?: number
  }
  konduto?: {
    name: string
    email: string
    id: string
    phone: string
    address: {
      name: string
      address_1: string
      address_2?: string
      city: string
      state: string
      zipcode: string
      country: string
      phone: string
    }
    shopping_cart: Array<{
      product_id: string
      product_title: string
      amount: number
      qty: number
    }>
    customer: {
      id: string
      name: string
      email: string
      tax_id: string
      phone1: string
      phone2?: string
      risk_level: 'low' | 'medium' | 'high'
      vip: boolean
    }
  }
  signifyd?: {
    name: string
    email: string
    id: string
    phone: string
    address: {
      name: string
      address_1: string
      address_2?: string
      city: string
      state: string
      zipcode: string
      country: string
      phone: string
    }
    shopping_cart: Array<{
      product_id: string
      product_title: string
      amount: number
      qty: number
    }>
    customer: {
      id: string
      name: string
      email: string
      tax_id: string
      phone1: string
      phone2?: string
      risk_level: 'low' | 'medium' | 'high'
      vip: boolean
    }
  }
}

// ===== TIPOS PARA CRIAÇÃO DE PEDIDOS =====

export interface CreateOrderRequest {
  items: Array<{
    amount: number
    description: string
    code?: string
    quantity: number
  }>
  customer: {
    name: string
    email: string
    type: 'individual' | 'company'
    document: string
    document_type: 'cpf' | 'cnpj' | 'passport'
    phones: {
      home_phone?: {
        country_code: string
        area_code: string
        number: string
      }
      mobile_phone?: {
        country_code: string
        area_code: string
        number: string
      }
    }
  }
  payments: Array<{
    payment_method: 'pix' | 'credit_card' | 'boleto'
    pix?: {
      expires_in: string
      additional_information?: Array<{
        name: string
        value: string
      }>
    }
    credit_card?: any
    boleto?: any,
    billing?: any
  }>
  billing?: {
    name: string
    address: {
      street: string
      number: string
      complement?: string
      neighborhood: string
      city: string
      state: string
      zip_code: string
      country: string
    }
  }
  metadata?: Record<string, string>
}

// ===== TIPOS PARA RESPOSTAS DE PEDIDOS =====

export interface OrderResponse {
  id: string
  code: string
  amount: number
  currency: string
  closed: boolean
  items?: OrderItem[]
  customer: Customer
  shipping?: Shipping
  payments?: Array<{
    id: string
    type: string
    amount: number
    status: 'pending' | 'processing' | 'authorized' | 'paid' | 'refused' | 'refunded' | 'chargedback' | 'analyzing' | 'pending_review'
    payment_method: {
      type: string
      installments: number
      statement_descriptor?: string
      card?: {
        brand: string
        holder_name: string
        first_digits: string
        last_digits: string
        fingerprint: string
        valid: boolean
        expiration_date: string
      }
      boleto?: {
        document_number: string
        type: string
        due_at: string
        instructions: string[]
        interest: {
          days: number
          type: string
          amount: number
        }
        fine: {
          days: number
          type: string
          amount: number
        }
        max_days_to_pay_past_due: number
        url: string
        barcode: string
        line: string
      }
      pix?: {
        qr_code: string
        qr_code_url: string
        expires_at: string
        additional_information: Array<{
          name: string
          value: string
        }>
      }
    }
    created_at: string
    updated_at: string
  }>
  charges?: Array<{
    id: string
    code: string
    gateway_id: string
    amount: number
    status: 'pending' | 'processing' | 'authorized' | 'paid' | 'refused' | 'refunded' | 'chargedback' | 'analyzing' | 'pending_review'
    currency: string
    payment_method: string
    paid_amount?: number
    paid_at?: string
    created_at: string
    updated_at: string
    customer: Customer
    last_transaction?: {
      id: string
      transaction_type: string
      gateway_id: string
      amount: number
      status: 'waiting_payment' | 'paid' | 'pending_refund' | 'refunded' | 'with_error' | 'failed'
      success: boolean
      qr_code: string
      qr_code_url: string
      additional_information?: Array<{
        name: string
        value: string
      }>
      expires_at: string
      created_at: string
      updated_at: string
      gateway_response: any
      antifraud_response: any
      metadata: any
    }
  }>
  antifraud?: Antifraud
  metadata?: Record<string, string>
  created_at: string
  updated_at: string
  status: 'pending' | 'paid' | 'canceled' | 'failed'
  recurrence_cycle?: 'first' | 'subsequent'
}

export interface ListOrdersResponse {
  data: OrderResponse[]
  paging: {
    total: number
    page: number
    size: number
    pages: number
  }
}

// ===== TIPOS PARA ATUALIZAÇÃO DE PEDIDOS =====

export interface UpdateOrderRequest {
  status?: 'pending' | 'paid' | 'canceled' | 'failed'
  metadata?: Record<string, string>
}

// ===== TIPOS PARA INCLUSÃO DE ITENS =====

export interface AddItemRequest {
  amount: number
  description: string
  quantity: number
  code: string
  type: 'product' | 'physical' | 'digital' | 'service' | 'airline_ticket'
  category?: string
  brand?: string
  model?: string
  weight?: number
  height?: number
  width?: number
  length?: number
  unit?: string
  url?: string
  image_url?: string
  metadata?: Record<string, string>
}

// ===== TIPOS PARA TRANSFERÊNCIAS =====

export interface CreateTransferRequest {
  amount: number // valor em centavos
  recipient_id: string
  metadata?: Record<string, string>
}

export interface TransferResponse {
  id: string
  amount: number
  status: 'pending_transfer' | 'transferred' | 'failed' | 'canceled'
  fee: number
  funding_date: string
  funding_estimated_date: string
  date_created: string
  date_updated: string
  recipient: {
    id: string
    name: string
    email: string
    document: string
    type: 'individual' | 'company'
  }
  bank_account: {
    id: string
    holder_name: string
    holder_type: 'individual' | 'company'
    holder_document: string
    bank: string
    branch_number: string
    branch_check_digit: string
    account_number: string
    account_check_digit: string
    type: 'checking' | 'savings'
  }
  metadata?: Record<string, string>
}

// ===== TIPOS PARA COBRANÇAS =====

export interface Charge {
  id: string
  code: string
  amount: number
  status: 'pending' | 'processing' | 'authorized' | 'paid' | 'refused' | 'refunded' | 'chargedback' | 'analyzing' | 'pending_review'
  payment_method: {
    type: string
    installments: number
    statement_descriptor?: string
    card?: {
      brand: string
      holder_name: string
      first_digits: string
      last_digits: string
      fingerprint: string
      valid: boolean
      expiration_date: string
    }
    boleto?: {
      document_number: string
      type: string
      due_at: string
      instructions: string[]
      interest: {
        days: number
        type: string
        amount: number
      }
      fine: {
        days: number
        type: string
        amount: number
      }
      max_days_to_pay_past_due: number
      url: string
      barcode: string
      line: string
    }
    pix?: {
      qr_code: string
      qr_code_url: string
      expires_at: string
      additional_information: Array<{
        name: string
        value: string
      }>
    }
  }
  created_at: string
  updated_at: string
}

// ===== CLASSE PRINCIPAL PAGAR.ME =====

export class PagarMeAPI {
  private config: Required<PagarMeConfig>
  private headers: PagarMeHeaders

  constructor(config: PagarMeConfig) {
    const environment = config.env || 'sandbox'
    const baseURL = config.baseURL || (
      environment === 'production'
        ? 'https://api.pagar.me/core/v5'
        : 'https://api.pagar.me/core/v5'
    )

    this.config = {
      apiKey: config.apiKey,
      env: environment,
      baseURL: baseURL
    }

    this.headers = {
      'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PagarMe-Node-SDK'
    }

    if (!this.config.apiKey) {
      throw new Error('API Key é obrigatória para usar a Pagar.me API')
    }
  }

  /**
   * Método privado para fazer requisições HTTP
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`

    const requestOptions: RequestInit = {
      method,
      headers: this.headers,
      ...(body && { body: JSON.stringify(body) })
    }

    logCurlRequest(url, {
      method: method,
      headers: this.headers as any,
      body: body ? JSON.stringify(body, null, 2) : null
    })

    try {
      const response = await fetch(url, requestOptions)

      console.log('Pagar.me Response Status:', response.status)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Error (${response.status}): ${errorData}`)
      }

      const responseData = await response.json()
      console.log('--------------------------------')
      console.log('Pagar.me Success Response:', JSON.stringify(responseData, null, 2))
      return responseData
    } catch (error) {
      console.error('Pagar.me Request Error:', error)
      if (error instanceof Error) {
        throw new Error(`${error.message}`)
      }
      throw new Error('Erro desconhecido na requisição Pagar.me')
    }
  }

  // ===== MÉTODOS PARA PEDIDOS =====

  /**
   * Criar um novo pedido
   */
  async createOrder(orderData: CreateOrderRequest): Promise<OrderResponse> {
    return this.makeRequest<OrderResponse>('/orders', 'POST', orderData)
  }

  /**
   * Buscar um pedido específico por ID
   */
  async getOrder(orderId: string): Promise<OrderResponse> {
    return this.makeRequest<OrderResponse>(`/orders/${orderId}`)
  }

  /**
   * Listar todos os pedidos
   */
  async listOrders(page: number = 1, size: number = 10): Promise<ListOrdersResponse> {
    return this.makeRequest<ListOrdersResponse>(`/orders?page=${page}&size=${size}`)
  }

  /**
   * Fechar um pedido
   */
  async closeOrder(orderId: string): Promise<OrderResponse> {
    return this.makeRequest<OrderResponse>(`/orders/${orderId}/closed`, 'PATCH', { closed: true })
  }

  /**
   * Atualizar um pedido
   */
  async updateOrder(orderId: string, updateData: UpdateOrderRequest): Promise<OrderResponse> {
    return this.makeRequest<OrderResponse>(`/orders/${orderId}`, 'PUT', updateData)
  }

  // ===== MÉTODOS PARA ITENS DO PEDIDO =====

  /**
   * Incluir item no pedido
   */
  async addItemToOrder(orderId: string, itemData: AddItemRequest): Promise<OrderItem> {
    return this.makeRequest<OrderItem>(`/orders/${orderId}/items`, 'POST', itemData)
  }

  /**
   * Editar item do pedido
   */
  async updateOrderItem(orderId: string, itemId: string, itemData: Partial<AddItemRequest>): Promise<OrderItem> {
    return this.makeRequest<OrderItem>(`/orders/${orderId}/items/${itemId}`, 'PUT', itemData)
  }

  /**
   * Deletar item do pedido
   */
  async deleteOrderItem(orderId: string, itemId: string): Promise<void> {
    return this.makeRequest<void>(`/orders/${orderId}/items/${itemId}`, 'DELETE')
  }

  /**
   * Remover todos os itens do pedido
   */
  async removeAllOrderItems(orderId: string): Promise<void> {
    return this.makeRequest<void>(`/orders/${orderId}/items`, 'DELETE')
  }

  /**
   * Obter item específico do pedido
   */
  async getOrderItem(orderId: string, itemId: string): Promise<OrderItem> {
    return this.makeRequest<OrderItem>(`/orders/${orderId}/items/${itemId}`)
  }

  // ===== MÉTODOS PARA COBRANÇAS =====

  /**
   * Incluir cobrança no pedido
   */
  async addChargeToOrder(orderId: string, paymentData: PaymentMethod): Promise<Charge> {
    return this.makeRequest<Charge>(`/orders/${orderId}/charges`, 'POST', { payment: paymentData })
  }

  /**
   * Capturar cobrança
   */
  async captureCharge(chargeId: string, amount?: number): Promise<Charge> {
    const body = amount ? { amount } : {}
    return this.makeRequest<Charge>(`/charges/${chargeId}/capture`, 'POST', body)
  }

  /**
   * Obter cobrança específica
   */
  async getCharge(chargeId: string): Promise<Charge> {
    return this.makeRequest<Charge>(`/charges/${chargeId}`)
  }

  /**
   * Listar cobranças
   */
  async listCharges(page: number = 1, size: number = 10): Promise<{ data: Charge[], paging: any }> {
    return this.makeRequest<{ data: Charge[], paging: any }>(`/charges?page=${page}&size=${size}`)
  }

  /**
   * Cancelar cobrança
   */
  async cancelCharge(chargeId: string, amount?: number): Promise<Charge> {
    const body = amount ? { amount } : {}
    return this.makeRequest<Charge>(`/charges/${chargeId}/cancel`, 'DELETE', body)
  }

  // ===== MÉTODOS PARA CLIENTES =====

  /**
   * Criar cliente
   */
  async createCustomer(customerData: Customer): Promise<Customer & { id: string }> {
    return this.makeRequest<Customer & { id: string }>('/customers', 'POST', customerData)
  }

  /**
   * Obter cliente específico
   */
  async getCustomer(customerId: string): Promise<Customer & { id: string }> {
    return this.makeRequest<Customer & { id: string }>(`/customers/${customerId}`)
  }

  /**
   * Listar clientes
   */
  async listCustomers(page: number = 1, size: number = 10): Promise<{ data: (Customer & { id: string })[], paging: any }> {
    return this.makeRequest<{ data: (Customer & { id: string })[], paging: any }>(`/customers?page=${page}&size=${size}`)
  }

  /**
   * Atualizar cliente
   */
  async updateCustomer(customerId: string, customerData: Partial<Customer>): Promise<Customer & { id: string }> {
    return this.makeRequest<Customer & { id: string }>(`/customers/${customerId}`, 'PUT', customerData)
  }

  // ===== MÉTODOS PARA CARTÕES =====

  /**
   * Criar cartão associado a um cliente
   */
  async createCard(customerId: string, cardData: {
    number: string
    holder_name: string
    holder_document?: string
    exp_month: number
    exp_year: number
    cvv: string
    brand: string
    label?: string
    billing_address: {
      line_1: string
      line_2?: string
      zip_code: string
      city: string
      state: string
      country: string
    }
    options?: {
      verify_card?: boolean
    }
  }): Promise<{ id: string, first_six_digits: string, last_four_digits: string, brand: string, holder_name: string, exp_month: number, exp_year: number, status: string, created_at: string, updated_at: string, billing_address: any }> {
    return this.makeRequest(`/customers/${customerId}/cards`, 'POST', cardData)
  }

  /**
   * Obter cartão específico
   */
  async getCard(customerId: string, cardId: string): Promise<any> {
    return this.makeRequest(`/customers/${customerId}/cards/${cardId}`)
  }

  /**
   * Listar cartões de um cliente
   */
  async listCards(customerId: string, page: number = 1, size: number = 10): Promise<{ data: any[], paging: any }> {
    return this.makeRequest(`/customers/${customerId}/cards?page=${page}&size=${size}`)
  }

  /**
   * Tokenizar cartão via API V5 (endpoint /cards)
   * Retorna o objeto do cartão com id para uso em cobranças
   */
  async tokenizeCard(cardData: {
    number: string
    holder_name: string
    holder_document?: string
    exp_month: number
    exp_year: number
    cvv: string
    brand: string
  }): Promise<{ id: string; [key: string]: unknown }> {
    return this.makeRequest<{ id: string; [key: string]: unknown }>('/cards', 'POST', cardData)
  }

  // ===== MÉTODOS PARA RECEBEDORES =====

  /**
   * Criar um novo recebedor
   */
  async createRecipient(recipientData: CreateRecipientRequest): Promise<RecipientResponse> {
    return this.makeRequest<RecipientResponse>('/recipients', 'POST', recipientData)
  }

  /**
   * Buscar um recebedor específico por ID
   */
  async getRecipient(recipientId: string): Promise<RecipientResponse> {
    return this.makeRequest<RecipientResponse>(`/recipients/${recipientId}`)
  }

  /**
   * Listar todos os recebedores
   */
  async listRecipients(page: number = 1, size: number = 10): Promise<{ data: RecipientResponse[], paging: any }> {
    return this.makeRequest<{ data: RecipientResponse[], paging: any }>(`/recipients?page=${page}&size=${size}`)
  }

  /**
   * Atualizar conta bancária do recebedor
   */
  async updateRecipientBankAccount(recipientId: string, bankAccountData: UpdateBankAccountRequest): Promise<RecipientResponse> {
    return this.makeRequest<RecipientResponse>(`/recipients/${recipientId}/default_bank_account`, 'PUT', bankAccountData)
  }

  /**
   * Atualizar dados do recebedor
   */
  async updateRecipient(recipientId: string, recipientData: Partial<CreateRecipientRequest>): Promise<RecipientResponse> {
    return this.makeRequest<RecipientResponse>(`/recipients/${recipientId}`, 'PUT', recipientData)
  }

  /**
   * Criar link de KYC para validação do recebedor
   */
  async createKycLink(recipientId: string): Promise<{ url: string, base64_qrcode: string, expires_at: string }> {
    return this.makeRequest<{ url: string, base64_qrcode: string, expires_at: string }>(`/recipients/${recipientId}/kyc_link`, 'POST', {})
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  /**
   * Gerar código único para pedido
   */
  static generateOrderCode(prefix: string = 'order'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Converter valor de reais para centavos
   */
  static reaisToCentavos(valor: number): number {
    return Math.round(valor * 100)
  }

  /**
   * Converter valor de centavos para reais
   */
  static centavosToReais(centavos: number): number {
    return centavos / 100
  }

  /**
   * Validar formato de CPF/CNPJ
   */
  static isValidDocument(document: string): boolean {
    const cleanDocument = document.replace(/\D/g, '')
    return cleanDocument.length === 11 || cleanDocument.length === 14
  }

  /**
   * Validar formato de email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validar número de cartão de crédito (Luhn algorithm)
   */
  static isValidCreditCard(cardNumber: string): boolean {
    const cleanNumber = cardNumber.replace(/\D/g, '')
    if (cleanNumber.length < 13 || cleanNumber.length > 19) return false

    let sum = 0
    let isEven = false

    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i))

      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }

      sum += digit
      isEven = !isEven
    }

    return sum % 10 === 0
  }

  /**
   * Detectar bandeira do cartão
   */
  static detectCardBrand(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\D/g, '')

    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
      diners: /^3(?:0[0-5]|[68])/,
      jcb: /^(?:2131|1800|35\d{3})/,
      elo: /^(?:636368|438935|504175|451416|636297|5067|4576|4011)/
    }

    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleanNumber)) {
        return brand
      }
    }

    return 'unknown'
  }

  // ===== MÉTODOS PARA TRANSFERÊNCIAS =====

  /**
   * Criar uma transferência
   */
  async createTransfer(transferData: CreateTransferRequest): Promise<TransferResponse> {
    return this.makeRequest<TransferResponse>('/transfers', 'POST', transferData)
  }

  /**
   * Obter uma transferência específica
   */
  async getTransfer(transferId: string): Promise<TransferResponse> {
    return this.makeRequest<TransferResponse>(`/transfers/${transferId}`)
  }

  /**
   * Listar transferências
   */
  async listTransfers(page?: number, size?: number): Promise<{ data: TransferResponse[], paging: any }> {
    const params = new URLSearchParams()
    if (page) params.append('page', page.toString())
    if (size) params.append('size', size.toString())

    const queryString = params.toString()
    const endpoint = queryString ? `/transfers?${queryString}` : '/transfers'

    return this.makeRequest<{ data: TransferResponse[], paging: any }>(endpoint)
  }

  /**
   * Cancelar uma transferência
   */
  async cancelTransfer(transferId: string): Promise<TransferResponse> {
    return this.makeRequest<TransferResponse>(`/transfers/${transferId}/cancel`, 'POST')
  }
}

// ===== INSTÂNCIA PADRÃO =====

// Configuração padrão baseada em variáveis de ambiente
export const defaultPagarMeConfig: PagarMeConfig = {
  apiKey: process.env.PAGARME_API_KEY || process.env.NEXT_PUBLIC_PAGARME_API_KEY || '',
  env: (process.env.PAGARME_ENV || process.env.NEXT_PUBLIC_PAGARME_ENV) as 'sandbox' | 'production' || 'sandbox'
}

// Instância padrão da API (só será criada se API Key estiver configurada)
export const pagarMeAPI = defaultPagarMeConfig.apiKey
  ? new PagarMeAPI(defaultPagarMeConfig)
  : null

// ===== FUNÇÕES DE CONVENIÊNCIA =====

/**
 * Criar instância personalizada da Pagar.me API
 */
export const createPagarMeAPI = (config: PagarMeConfig): PagarMeAPI => {
  console.log('Criando instância da Pagar.me API:', config)
  return new PagarMeAPI(config)
}

/**
 * Validar configuração da Pagar.me
 */
export const validatePagarMeConfig = (config: PagarMeConfig): boolean => {
  return !!(config.apiKey && config.apiKey.length > 0)
}

// ===== FUNÇÕES PARA CRIAÇÃO DE PEDIDOS =====

export interface CreateOrderOptions {
  amount: number // valor em centavos
  customer: Customer
  payment: PaymentMethod[]
  items?: OrderItem[]
  shipping?: Shipping
  antifraud?: Antifraud
  closed?: boolean
  billing?: {
    name: string
    address: {
      street: string
      number: string
      complement?: string
      neighborhood: string
      city: string
      state: string
      zip_code: string
      country: string
    }
  }
  metadata?: Record<string, string>
  onSuccess?: (order: OrderResponse) => void
  onError?: (error: any) => void
}

/**
 * Criar pedido usando REST API
 */
export const createOrder = async (options: CreateOrderOptions) => {
  if (!pagarMeAPI) {
    const error = new Error('Pagar.me não configurado. Verifique as variáveis de ambiente PAGARME_API_KEY')
    console.error(error.message)
    if (options.onError) options.onError(error)
    throw error
  }

  try {
    const orderData: CreateOrderRequest = {
      customer: {
        ...options.customer,
        phones: options.customer.phones || {}
      },
      payments: (Array.isArray(options.payment) ? options.payment : [options.payment]).map(payment => {
        const paymentData: any = {
          payment_method: payment.type as 'credit_card' | 'boleto' | 'pix'
        }

        // Adicionar dados específicos do método de pagamento
        if (payment.credit_card) {
          paymentData.credit_card = payment.credit_card
        } else if (payment.card) {
          // Fallback para formato antigo
          paymentData.credit_card = {
            installments: payment.installments || 1,
            statement_descriptor: payment.statement_descriptor,
            card: payment.card
          }
        }

        if (payment.boleto) {
          paymentData.boleto = payment.boleto
        }

        if (payment.pix) {
          paymentData.pix = payment.pix
        }

        if (payment.amount) {
          paymentData.amount = payment.amount
        }
        
        /*
        const totalAmount = options.amount
        const minerAmount = Math.round(totalAmount * 0.95)
        const devAmount = totalAmount - minerAmount

        paymentData.split = [
          {
            amount: minerAmount,
            recipient_id: process.env.RECEBEDOR_MINERSTONE || '',
            type: "flat",
            options: {
              charge_processing_fee: true,
              charge_remainder_fee: true,
              liable: true
            }
          },
          {
            amount: devAmount,
            recipient_id: process.env.RECEBEDOR_DESENVOLVEDOR || '',
            type: "flat",
            options: {
              charge_processing_fee: false,
              charge_remainder_fee: false,
              liable: false
            }
          }
        ]*/

        // Adicionar billing do payment individual (prioridade) ou do options
        const billingData = (payment as any).billing || options.billing
        if (billingData) {
          paymentData.billing = billingData
        }

        return paymentData
      }),
      items: options.items || [],
      ...(options.billing && { billing: options.billing }),
      metadata: options.metadata || {}
    }

    console.log('Criando pedido Pagar.me:', JSON.stringify(orderData, null, 2))
    const response = await pagarMeAPI.createOrder(orderData)
    console.log('Pedido criado com sucesso:', response.id)

    if (options.onSuccess) {
      options.onSuccess(response)
    }

    return response
  } catch (error) {
    console.error('Erro ao criar pedido Pagar.me:', error)
    if (options.onError) options.onError(error)
    throw error
  }
}

// ===== FUNÇÕES PARA PAGAMENTOS COM CARTÃO =====

export interface CreateCreditCardPaymentOptions {
  amount: number // valor em centavos
  cardNumber: string
  holderName: string
  expMonth: number
  expYear: number
  cvv: string
  installments?: number
  statementDescriptor?: string
  billingAddress?: {
    line_1: string
    line_2?: string
    zip_code: string
    city: string
    state: string
    country: string
  }
}

/**
 * Criar pagamento com cartão de crédito
 */
export const createCreditCardPayment = (options: CreateCreditCardPaymentOptions): PaymentMethod => {
  return {
    type: 'credit_card',
    installments: options.installments || 1,
    statement_descriptor: options.statementDescriptor,
    card: {
      number: options.cardNumber,
      holder_name: options.holderName,
      exp_month: options.expMonth,
      exp_year: options.expYear,
      cvv: options.cvv,
      brand: PagarMeAPI.detectCardBrand(options.cardNumber),
      billing_address: options.billingAddress
    }
  }
}

// ===== FUNÇÕES PARA PAGAMENTOS PIX =====

export interface CreatePixPaymentOptions {
  amount: number // valor em centavos
  expiresIn?: number // segundos
  additionalInformation?: Array<{
    name: string
    value: string
  }>
}

/**
 * Criar pagamento PIX
 */
export const createPixPayment = (options: CreatePixPaymentOptions): PaymentMethod => {
  return {
    type: 'pix',
    pix: {
      expires_in: options.expiresIn || 3600, // 1 hora por padrão
      additional_information: options.additionalInformation
    }
  }
}

// ===== FUNÇÕES PARA PAGAMENTOS BOLETO =====

export interface CreateBoletoPaymentOptions {
  amount: number // valor em centavos
  documentNumber: string
  type?: 'DM' | 'BDB' | 'BDP' | 'BDS' | 'BDBB' | 'BDBD' | 'BDBE' | 'BDBF' | 'BDBG' | 'BDBH' | 'BDBI' | 'BDBJ' | 'BDBK' | 'BDBL' | 'BDBM' | 'BDBO' | 'BDBP' | 'BDBQ' | 'BDBR' | 'BDBT' | 'BDBU' | 'BDBV' | 'BDBW' | 'BDBX' | 'BDBY' | 'BDBZ'
  dueAt?: string
  instructions?: string[]
  interest?: {
    days: number
    type: 'percentage' | 'amount'
    amount: number
  }
  fine?: {
    days: number
    type: 'percentage' | 'amount'
    amount: number
  }
  maxDaysToPayPastDue?: number
}

/**
 * Criar pagamento com boleto
 */
export const createBoletoPayment = (options: CreateBoletoPaymentOptions): PaymentMethod => {
  return {
    type: 'boleto',
    boleto: {
      type: options.type || 'DM',
      document_number: options.documentNumber,
      due_at: options.dueAt,
      instructions: options.instructions,
      interest: options.interest,
      fine: options.fine,
      max_days_to_pay_past_due: options.maxDaysToPayPastDue
    }
  }
}

// ===== FUNÇÕES UTILITÁRIAS EXPORTADAS =====

/**
 * Gerar código único para pedido
 */
export const generateOrderCode = (prefix: string = 'order'): string => {
  return PagarMeAPI.generateOrderCode(prefix)
}

/**
 * Converter valor de reais para centavos
 */
export const reaisToCentavos = (valor: number): number => {
  return PagarMeAPI.reaisToCentavos(valor)
}

/**
 * Converter valor de centavos para reais
 */
export const centavosToReais = (centavos: number): number => {
  return PagarMeAPI.centavosToReais(centavos)
}

/**
 * Validar documento (CPF/CNPJ)
 */
export const isValidDocument = (document: string): boolean => {
  return PagarMeAPI.isValidDocument(document)
}

/**
 * Validar email
 */
export const isValidEmail = (email: string): boolean => {
  return PagarMeAPI.isValidEmail(email)
}

/**
 * Validar cartão de crédito
 */
export const isValidCreditCard = (cardNumber: string): boolean => {
  return PagarMeAPI.isValidCreditCard(cardNumber)
}


/**
 * Detectar bandeira do cartão
 */
export const detectCardBrand = (cardNumber: string): string => {
  return PagarMeAPI.detectCardBrand(cardNumber)
}

// ===== FUNÇÕES UTILITÁRIAS PARA RECEBEDORES =====

export interface CreateRecipientOptions {
  name: string
  email: string
  document: string
  type: 'individual' | 'company'
  description?: string
  bankAccount: {
    bank: string
    branchNumber: string
    branchCheckDigit?: string
    accountNumber: string
    accountCheckDigit: string
    type: 'checking' | 'savings'
    holderName: string
    holderType: 'individual' | 'company'
    holderDocument: string
  }
  transferSettings?: {
    transferEnabled?: boolean
    transferInterval?: 'daily' | 'weekly' | 'monthly'
    transferDay?: number
  }
  automaticAnticipationSettings?: {
    enabled?: boolean
    type?: 'full' | 'partial'
    volumePercentage?: number
    delay?: number
  }
  metadata?: Record<string, string>
}

/**
 * Criar recebedor com configurações simplificadas
 */
export const createRecipient = async (options: CreateRecipientOptions) => {
  if (!pagarMeAPI) {
    throw new Error('Pagar.me API não inicializada. Configure a API Key primeiro.')
  }

  const recipientData: CreateRecipientRequest = {
    name: options.name,
    email: options.email,
    document: options.document,
    type: options.type,
    description: options.description,
    default_bank_account: {
      bank: options.bankAccount.bank,
      branch_number: options.bankAccount.branchNumber,
      branch_check_digit: options.bankAccount.branchCheckDigit,
      account_number: options.bankAccount.accountNumber,
      account_check_digit: options.bankAccount.accountCheckDigit,
      type: options.bankAccount.type,
      holder_name: options.bankAccount.holderName,
      holder_type: options.bankAccount.holderType,
      holder_document: options.bankAccount.holderDocument,
      metadata: options.metadata
    },
    // Só incluir transfer_settings se transferSettings for fornecido e habilitado
    ...(options.transferSettings?.transferEnabled && {
      transfer_settings: {
        transfer_enabled: options.transferSettings.transferEnabled,
        transfer_interval: options.transferSettings.transferInterval ?? 'daily',
        transfer_day: options.transferSettings.transferDay
      }
    }),
    automatic_anticipation_settings: options.automaticAnticipationSettings ? {
      enabled: options.automaticAnticipationSettings.enabled ?? false,
      type: options.automaticAnticipationSettings.type,
      volume_percentage: options.automaticAnticipationSettings.volumePercentage,
      delay: options.automaticAnticipationSettings.delay
    } : undefined,
    metadata: options.metadata
  }

  return pagarMeAPI.createRecipient(recipientData)
}

export interface UpdateBankAccountOptions {
  bank: string
  branchNumber: string
  branchCheckDigit?: string
  accountNumber: string
  accountCheckDigit: string
  type: 'checking' | 'savings'
  holderName: string
  holderType: 'individual' | 'company'
  holderDocument: string
  metadata?: Record<string, string>
}

/**
 * Atualizar conta bancária do recebedor
 */
export const updateRecipientBankAccount = async (recipientId: string, options: UpdateBankAccountOptions) => {
  if (!pagarMeAPI) {
    throw new Error('Pagar.me API não inicializada. Configure a API Key primeiro.')
  }

  const bankAccountData: UpdateBankAccountRequest = {
    bank: options.bank,
    branch_number: options.branchNumber,
    branch_check_digit: options.branchCheckDigit,
    account_number: options.accountNumber,
    account_check_digit: options.accountCheckDigit,
    type: options.type,
    holder_name: options.holderName,
    holder_type: options.holderType,
    holder_document: options.holderDocument,
    metadata: options.metadata
  }

  return pagarMeAPI.updateRecipientBankAccount(recipientId, bankAccountData)
}

/**
 * Validar dados de conta bancária
 */
export const validateBankAccount = (bankAccount: UpdateBankAccountOptions): boolean => {
  // Validar campos obrigatórios
  if (!bankAccount.bank || !bankAccount.branchNumber || !bankAccount.accountNumber ||
    !bankAccount.accountCheckDigit || !bankAccount.holderName || !bankAccount.holderDocument) {
    return false
  }

  // Validar documento do titular
  if (!isValidDocument(bankAccount.holderDocument)) {
    return false
  }

  // Validar tipo de conta
  if (!['checking', 'savings'].includes(bankAccount.type)) {
    return false
  }

  // Validar tipo de titular
  if (!['individual', 'company'].includes(bankAccount.holderType)) {
    return false
  }

  return true
}

/**
 * Validar dados do recebedor
 */
export const validateRecipient = (recipient: CreateRecipientOptions): boolean => {
  // Validar campos obrigatórios
  if (!recipient.name || !recipient.email || !recipient.document) {
    return false
  }

  // Validar email
  if (!isValidEmail(recipient.email)) {
    return false
  }

  // Validar documento
  if (!isValidDocument(recipient.document)) {
    return false
  }

  // Validar tipo
  if (!['individual', 'company'].includes(recipient.type)) {
    return false
  }

  // Validar conta bancária
  if (!validateBankAccount(recipient.bankAccount)) {
    return false
  }

  return true
}

// ===== FUNÇÃO DE INICIALIZAÇÃO =====

export interface InitializePagarMeOptions {
  apiKey: string
  env?: 'sandbox' | 'production'
}

/**
 * Inicializar Pagar.me (compatibilidade com código existente)
 */
export const initializePagarMe = (options: InitializePagarMeOptions) => {
  console.log(`Pagar.me REST API configurado - API Key: ${options.apiKey.substring(0, 10)}..., Ambiente: ${options.env || 'sandbox'}`)

  // Verificar se a configuração está válida
  if (!options.apiKey || options.apiKey === 'YOUR_PAGARME_API_KEY') {
    throw new Error('API Key da Pagar.me não configurada corretamente')
  }

  return true
}

// ===== FUNÇÕES PARA TRANSFERÊNCIAS =====

export interface CreateTransferOptions {
  amount: number // valor em reais
  recipientId: string
  metadata?: Record<string, string>
}

/**
 * Criar transferência usando REST API
 */
export const createTransfer = async (options: CreateTransferOptions) => {
  if (!pagarMeAPI) {
    throw new Error('Pagar.me API não inicializada. Configure a API Key primeiro.')
  }

  try {
    const transferData: CreateTransferRequest = {
      amount: reaisToCentavos(options.amount), // Converter reais para centavos
      recipient_id: options.recipientId,
      metadata: options.metadata
    }

    console.log('Criando transferência Pagar.me:', transferData)
    const response = await pagarMeAPI.createTransfer(transferData)
    console.log('Transferência criada com sucesso:', response.id)

    return response
  } catch (error) {
    console.error('Erro ao criar transferência Pagar.me:', error)
    throw error
  }
}

// ===== FUNÇÕES PARA KYC =====

export interface KycLinkResponse {
  url: string
  base64_qrcode: string
  expires_at: string
}

/**
 * Criar link de validação KYC para recebedor
 */
export const createKycLink = async (recipientId: string): Promise<KycLinkResponse> => {
  if (!pagarMeAPI) {
    throw new Error('Pagar.me API não inicializada. Configure a API Key primeiro.')
  }

  try {
    const response = await pagarMeAPI.createKycLink(recipientId)

    return response
  } catch (error) {
    console.error('Erro ao criar link KYC:', error)
    throw error
  }
}

// ===== EXPORTS =====

export default PagarMeAPI

// ===== TOKENIZAÇÃO DE CARTÃO (API V5) =====

export interface CreateCardTokenOptions {
  number: string
  holder_name: string
  exp_month: number
  exp_year: number
  cvv: string
}

/**
 * Criar token de cartão usando a API V5
 * Observações da documentação:
 * - Somente o cabeçalho Content-Type é permitido
 * - NÃO enviar Authorization
 * - Autenticação via appId (public_key) na query string
 * - Billing address NÃO é tokenizado; deve ser enviado na criação do pedido/cobrança
 * Doc: https://docs.pagar.me/reference/criar-token-cart%C3%A3o-1
 */
export const createCardToken = async (card: CreateCardTokenOptions, publicKey?: string): Promise<string> => {
  const appId = publicKey || process.env.NEXT_PUBLIC_PAGARME_KEY_PUBLIC || ''
  if (!appId) {
    throw new Error('Chave pública Pagar.me não configurada (NEXT_PUBLIC_PAGARME_KEY_PUBLIC)')
  }

  const url = `https://api.pagar.me/core/v5/tokens?appId=${encodeURIComponent(appId)}`

  const body = {
    type: 'card',
    card: {
      number: card.number.replace(/\s/g, ''),
      holder_name: card.holder_name,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      cvv: card.cvv
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Erro ao tokenizar cartão: ${errorData}`)
  }

  const tokenData = await response.json()
  if (!tokenData?.id) {
    throw new Error('Resposta inválida da API de tokenização')
  }
  return tokenData.id as string
}