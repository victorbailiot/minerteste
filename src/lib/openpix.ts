/**
 * Biblioteca OpenPix REST API para Node.js/Next.js
 * Baseada na documentação oficial da OpenPix
 * https://developers.openpix.com.br/docs/apis/
 */

import { logCurlRequest } from "./networkUtils"

// ===== TIPOS E INTERFACES =====

export interface OpenPixConfig {
  appID: string
  env?: 'sandbox' | 'production'
  baseURL?: string
}

export interface OpenPixHeaders {
  'Authorization': string
  'Content-Type': 'application/json'
  'User-Agent'?: string
}

// ===== TIPOS PARA COBRANÇA (CHARGE) =====

export interface CreateChargeRequest {
  correlationID: string
  value: number // valor em centavos
  comment?: string
  identifier?: string
  paymentLinkID?: string
  customer?: {
    name: string
    email?: string
    phone?: string
    taxID?: string
    address?: {
      zipcode: string
      street: string
      number: string
      neighborhood: string
      city: string
      state: string
      complement?: string
    }
  }
  additionalInfo?: Array<{
    key: string
    value: string
  }>
  expiresIn?: number // segundos
  pixKey?: string
  enableCashPayment?: boolean
  cashPaymentSettings?: {
    instructions?: string
    minValue?: number
    maxValue?: number
  }
}

export interface ChargeResponse {
  charge: {
    status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED'
    customer: any
    value: number
    comment: string
    identifier: string
    correlationID: string
    paymentLinkID: string
    transactionID: string
    qrCodeImage: string
    encodedImage: string
    brCode: string
    expiresAt: string
    pixKey: string
    additionalInfo: Array<{
      key: string
      value: string
    }>
    discount: number
    valueWithDiscount: number
    interest: number
    fine: number
    createdAt: string
    updatedAt: string
  }
}

export interface ListChargesResponse {
  charges: ChargeResponse['charge'][]
  pageInfo: {
    errors: any[]
    skip: number
    limit: number
    totalCount: number
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
}

// ===== TIPOS PARA WEBHOOK =====

export interface CreateWebhookRequest {
  webhook: {
    name: string
    event: 'OPENPIX:CHARGE_CREATED' | 'OPENPIX:CHARGE_COMPLETED' | 'OPENPIX:CHARGE_EXPIRED' | 'OPENPIX:TRANSACTION_CREATED' | 'OPENPIX:TRANSACTION_RECEIVED' | 'OPENPIX:MOVEMENT_CREATED'
    url: string
    authorization: string
    isActive: boolean
  }
}

export interface WebhookResponse {
  webhook: {
    id: string
    name: string
    event: string
    url: string
    authorization: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
}

// ===== TIPOS PARA PIX KEY =====

export interface CreatePixKeyRequest {
  type: 'RANDOM' | 'EMAIL' | 'CPF' | 'CNPJ' | 'PHONE'
  key?: string // opcional para RANDOM
}

export interface PixKeyResponse {
  pixKey: {
    id: string
    key: string
    type: string
    status: 'CREATED' | 'ACTIVE' | 'ERROR'
    createdAt: string
    updatedAt: string
  }
}

// ===== TIPOS PARA REQUISIÇÕES DE PAGAMENTO =====

export interface CreatePaymentRequest {
  correlationID: string
  value: number // valor em centavos
  comment?: string
  identifier?: string
  customer?: {
    name: string
    email?: string
    phone?: string
    taxID?: string
  }
  additionalInfo?: Array<{
    key: string
    value: string
  }>
  expiresIn?: number // segundos
  pixKey?: string
}

export interface PaymentRequestResponse {
  payment: {
    status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED'
    customer: any
    value: number
    comment: string
    identifier: string
    correlationID: string
    transactionID: string
    qrCodeImage: string
    encodedImage: string
    brCode: string
    expiresAt: string
    pixKey: string
    additionalInfo: Array<{
      key: string
      value: string
    }>
    createdAt: string
    updatedAt: string
  }
}

// ===== TIPOS PARA SALDO E TRANSAÇÕES =====

export interface BalanceResponse {
  balance: number
}

export interface TransactionResponse {
  transaction: {
    value: number
    time: string
    endToEndId: string
    transactionID: string
    charge: {
      status: string
      customer: any
      value: number
      comment: string
      identifier: string
      correlationID: string
      createdAt: string
      updatedAt: string
    }
    pixKey: {
      id: string
      key: string
      type: string
    }
  }
}

export interface ListTransactionsResponse {
  transactions: TransactionResponse['transaction'][]
  pageInfo: {
    errors: any[]
    skip: number
    limit: number
    totalCount: number
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
}

// ===== TIPOS PARA CONTAS BANCÁRIAS =====

export interface CreateAccountRequest {
  name: string
  email: string
  phone: string
  taxID: string
  pixKey?: string
  pixKeyType?: 'RANDOM' | 'EMAIL' | 'CPF' | 'CNPJ' | 'PHONE'
}

export interface AccountResponse {
  account: {
    id: string
    name: string
    email: string
    phone: string
    taxID: string
    pixKeys: Array<{
      id: string
      key: string
      type: string
      status: string
    }>
    createdAt: string
    updatedAt: string
  }
}

// ===== CLASSE PRINCIPAL OPENPIX =====

export class OpenPixAPI {
  private config: Required<OpenPixConfig>
  private headers: OpenPixHeaders

  constructor(config: OpenPixConfig) {
    const environment = config.env || 'sandbox'
    const baseURL = config.baseURL || (
      environment === 'production' 
        ? 'https://api.woovi.com/api/v1'
        : 'https://api.woovi-sandbox.com/api/v1'
    )
    
    this.config = {
      appID: config.appID,
      env: environment,
      baseURL: baseURL
    }

    this.headers = {
      'Authorization': this.config.appID,
      'Content-Type': 'application/json',
      'User-Agent': 'OpenPix-Node-SDK'
    }

    if (!this.config.appID) {
      throw new Error('AppID é obrigatório para usar a OpenPix API')
    }
  }

  /**
   * Método privado para fazer requisições HTTP
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`
    
    const requestOptions: RequestInit = {
      method,
      headers: this.headers,
      ...(body && { body: JSON.stringify(body) })
    }

    console.log('OpenPix Request:', {
      url,
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body, null, 2) : null
    })

    logCurlRequest(url, {
      method: method,
      headers: this.headers as any,
      body: body ? JSON.stringify(body, null, 2) : null
    })

    try {
      const response = await fetch(url, requestOptions)
      
      console.log('OpenPix Response Status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Error (${response.status}): ${errorData}`)
      }

      const responseData = await response.json()
      console.log('OpenPix Success Response:', responseData)
      return responseData
    } catch (error) {
      console.error('OpenPix Request Error:', error)
      if (error instanceof Error) {
        throw new Error(`${error.message}`)
      }
      throw new Error('Erro desconhecido na requisição OpenPix')
    }
  }

  // ===== MÉTODOS PARA COBRANÇAS =====

  /**
   * Criar uma nova cobrança PIX
   */
  async createCharge(chargeData: CreateChargeRequest): Promise<ChargeResponse> {
    return this.makeRequest<ChargeResponse>('/charge', 'POST', chargeData)
  }

  /**
   * Buscar uma cobrança específica por ID
   */
  async getCharge(chargeId: string): Promise<ChargeResponse> {
    return this.makeRequest<ChargeResponse>(`/charge/${chargeId}`)
  }

  /**
   * Listar todas as cobranças
   */
  async listCharges(skip: number = 0, limit: number = 100): Promise<ListChargesResponse> {
    return this.makeRequest<ListChargesResponse>(`/charge?skip=${skip}&limit=${limit}`)
  }

  /**
   * Buscar cobrança por correlationID
   */
  async getChargeByCorrelationID(correlationID: string): Promise<ChargeResponse> {
    // Encode URI para lidar com caracteres especiais no correlationID
    const encodedCorrelationID = encodeURIComponent(correlationID)
    console.log('Encoded CorrelationID:', encodedCorrelationID)
    return this.makeRequest<ChargeResponse>(`/charge/${encodedCorrelationID}`)
  }

  // ===== MÉTODOS PARA WEBHOOKS =====

  /**
   * Criar um novo webhook
   */
  async createWebhook(webhookData: CreateWebhookRequest): Promise<WebhookResponse> {
    return this.makeRequest<WebhookResponse>('/webhook', 'POST', webhookData)
  }

  /**
   * Listar todos os webhooks
   */
  async listWebhooks(): Promise<{ webhooks: WebhookResponse['webhook'][] }> {
    return this.makeRequest<{ webhooks: WebhookResponse['webhook'][] }>('/webhook')
  }

  /**
   * Deletar um webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    return this.makeRequest<void>(`/webhook/${webhookId}`, 'DELETE')
  }

  // ===== MÉTODOS PARA CHAVES PIX =====

  /**
   * Criar uma nova chave PIX
   */
  async createPixKey(pixKeyData: CreatePixKeyRequest): Promise<PixKeyResponse> {
    return this.makeRequest<PixKeyResponse>('/pixKey', 'POST', pixKeyData)
  }

  /**
   * Listar todas as chaves PIX
   */
  async listPixKeys(): Promise<{ pixKeys: PixKeyResponse['pixKey'][] }> {
    return this.makeRequest<{ pixKeys: PixKeyResponse['pixKey'][] }>('/pixKey')
  }

  /**
   * Deletar uma chave PIX
   */
  async deletePixKey(pixKeyId: string): Promise<void> {
    return this.makeRequest<void>(`/pixKey/${pixKeyId}`, 'DELETE')
  }

  // ===== MÉTODOS PARA SALDO E TRANSAÇÕES =====

  /**
   * Obter saldo da conta
   */
  async getBalance(): Promise<BalanceResponse> {
    return this.makeRequest<BalanceResponse>('/balance')
  }

  /**
   * Listar transações
   */
  async listTransactions(skip: number = 0, limit: number = 100): Promise<ListTransactionsResponse> {
    return this.makeRequest<ListTransactionsResponse>(`/transaction?skip=${skip}&limit=${limit}`)
  }

  /**
   * Buscar transação específica
   */
  async getTransaction(transactionId: string): Promise<TransactionResponse> {
    return this.makeRequest<TransactionResponse>(`/transaction/${transactionId}`)
  }

  // ===== MÉTODOS PARA REQUISIÇÕES DE PAGAMENTO =====

  /**
   * Criar uma nova requisição de pagamento
   */
  async createPaymentRequest(paymentData: CreatePaymentRequest): Promise<PaymentRequestResponse> {
    return this.makeRequest<PaymentRequestResponse>('/payment', 'POST', paymentData)
  }

  /**
   * Buscar uma requisição de pagamento específica por ID
   */
  async getPaymentRequest(paymentRequestId: string): Promise<PaymentRequestResponse> {
    return this.makeRequest<PaymentRequestResponse>(`/paymentRequest/${paymentRequestId}`)
  }

  /**
   * Listar todas as requisições de pagamento
   */
  async listPaymentRequests(skip: number = 0, limit: number = 100): Promise<{ paymentRequests: PaymentRequestResponse['payment'][] }> {
    return this.makeRequest<{ paymentRequests: PaymentRequestResponse['payment'][] }>(`/paymentRequest?skip=${skip}&limit=${limit}`)
  }

  /**
   * Buscar requisição de pagamento por correlationID
   */
  async getPaymentRequestByCorrelationID(correlationID: string): Promise<PaymentRequestResponse> {
    // Encode URI para lidar com caracteres especiais no correlationID
    const encodedCorrelationID = encodeURIComponent(correlationID)
    console.log('Encoded CorrelationID:', encodedCorrelationID)
    return this.makeRequest<PaymentRequestResponse>(`/paymentRequest/${encodedCorrelationID}`)
  }

  /**
   * Aprovar uma requisição de pagamento
   */
  async approvePayment(correlationID: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.makeRequest<any>('/payment/approve', 'POST', {
        correlationID
      })
      return { success: true, message: 'Pagamento aprovado com sucesso' }
    } catch (error) {
      console.error('Erro ao aprovar pagamento:', error)
      return { success: false, message: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  }

  // ===== MÉTODOS PARA CONTAS BANCÁRIAS (MASTER API) =====

  /**
   * Criar nova conta bancária (requer API MASTER)
   */
  async createAccount(accountData: CreateAccountRequest): Promise<AccountResponse> {
    return this.makeRequest<AccountResponse>('/account', 'POST', accountData)
  }

  /**
   * Listar contas bancárias (requer API MASTER)
   */
  async listAccounts(): Promise<{ accounts: AccountResponse['account'][] }> {
    return this.makeRequest<{ accounts: AccountResponse['account'][] }>('/account')
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  /**
   * Gerar correlationID único
   */
  static generateCorrelationID(prefix: string = 'charge'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
  static isValidTaxID(taxID: string): boolean {
    const cleanTaxID = taxID.replace(/\D/g, '')
    return cleanTaxID.length === 11 || cleanTaxID.length === 14
  }

  /**
   * Validar formato de email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validar webhook payload (verificar se é um evento válido da OpenPix)
   */
  static validateWebhookPayload(payload: any): boolean {
    return payload && 
           payload.event && 
           payload.charge && 
           typeof payload.charge === 'object'
  }
}

// ===== INSTÂNCIA PADRÃO =====

// Configuração padrão baseada em variáveis de ambiente
export const defaultOpenPixConfig: OpenPixConfig = {
  appID: process.env.OPENPIX_APP_ID || process.env.NEXT_PUBLIC_OPENPIX_APP_ID || '',
  env: (process.env.OPENPIX_ENV || process.env.NEXT_PUBLIC_OPENPIX_ENV) as 'sandbox' | 'production' || 'production'
}

// Instância padrão da API (só será criada se AppID estiver configurado)
export const openPixAPI = defaultOpenPixConfig.appID 
  ? new OpenPixAPI(defaultOpenPixConfig)
  : null

// ===== FUNÇÕES DE CONVENIÊNCIA =====

/**
 * Criar instância personalizada da OpenPix API
 */
export const createOpenPixAPI = (config: OpenPixConfig): OpenPixAPI => {
  return new OpenPixAPI(config)
}

/**
 * Validar configuração da OpenPix
 */
export const validateOpenPixConfig = (config: OpenPixConfig): boolean => {
  return !!(config.appID && config.appID.length > 0)
}

// ===== DECLARAÇÕES GLOBAIS PARA FRONTEND (PLUGIN) =====

declare global {
  interface Window {
    $openpix: any[]
  }
}

// ===== FUNÇÕES PARA PLUGIN FRONTEND =====

/**
 * Inicializar OpenPix Plugin para frontend
 */
export const initializeOpenPixPlugin = (config: OpenPixConfig = defaultOpenPixConfig) => {
  if (typeof window !== 'undefined') {
    if (!window.$openpix) {
      window.$openpix = []
    }
    
    const openPixConfig: any = { appID: config.appID }
    
    if (config.env) {
      openPixConfig.env = config.env
    }
    
    window.$openpix.push(['config', openPixConfig])
  }
}

/**
 * Criar cobrança PIX via Plugin (frontend)
 */
export const createPixChargePlugin = (options: {
  value: number // valor em centavos
  correlationID: string
  description: string
  modal?: boolean
  onReady?: () => void
  onSuccess?: (transaction: any) => void
  onError?: (error: any) => void
}) => {
  if (typeof window !== 'undefined' && window.$openpix) {
    window.$openpix.push(['pix', options])
  }
}

// ===== FUNÇÕES UTILITÁRIAS EXPORTADAS =====

/**
 * Gerar correlationID único
 */
export const generateCorrelationID = (prefix: string = 'charge'): string => {
  return OpenPixAPI.generateCorrelationID(prefix)
}

/**
 * Converter valor de reais para centavos
 */
export const reaisToCentavos = (valor: number): number => {
  return OpenPixAPI.reaisToCentavos(valor)
}

/**
 * Converter valor de centavos para reais
 */
export const centavosToReais = (centavos: number): number => {
  return OpenPixAPI.centavosToReais(centavos)
}

// ===== FUNÇÕES PARA INTEGRAÇÃO COM FRONTEND =====

export interface CreatePixChargeOptions {
  value: number // valor em centavos
  correlationID: string
  description: string
  customer?: {
    name: string
    email?: string
    phone?: string
    taxID?: string
  }
  onSuccess?: (charge: any) => void
  onError?: (error: any) => void
  onReady?: () => void
}

/**
 * Criar cobrança PIX usando REST API
 */
export const createPixCharge = async (options: CreatePixChargeOptions) => {
  if (!openPixAPI) {
    const error = new Error('OpenPix não configurado. Verifique as variáveis de ambiente NEXT_PUBLIC_OPENPIX_APP_ID')
    console.error(error.message)
    if (options.onError) options.onError(error)
    throw error
  }

  try {
    const chargeData: CreateChargeRequest = {
      correlationID: options.correlationID,
      value: options.value,
      comment: options.description,
      customer: options.customer
    }

    console.log('Criando cobrança PIX:', chargeData)
    const response = await openPixAPI.createCharge(chargeData)
    console.log('Cobrança criada com sucesso:', response.charge.correlationID)
    
    if (options.onReady) {
      options.onReady()
    }

    // Para ambiente de desenvolvimento, simular pagamento
    if (process.env.NEXT_PUBLIC_OPENPIX_ENV === 'sandbox') {
      console.log('Modo sandbox - simulando pagamento em 10 segundos...')
      setTimeout(() => {
        console.log('Simulando pagamento aprovado')
        if (options.onSuccess) {
          options.onSuccess(response.charge)
        }
      }, 10000) // Simula pagamento em 10 segundos
    }

    return response
  } catch (error) {
    console.error('Erro ao criar cobrança PIX:', error)
    if (options.onError) options.onError(error)
    throw error
  }
}

export interface InitializeOpenPixOptions {
  appID: string
  env?: 'sandbox' | 'production'
}

/**
 * Inicializar OpenPix (compatibilidade com código existente)
 */
export const initializeOpenPix = (options: InitializeOpenPixOptions) => {
  console.log(`OpenPix REST API configurado - App ID: ${options.appID}, Ambiente: ${options.env || 'sandbox'}`)
  
  // Verificar se a configuração está válida
  if (!options.appID || options.appID === 'YOUR_OPENPIX_APP_ID') {
    throw new Error('App ID do OpenPix não configurado corretamente')
  }
  
  return true
}

// ===== FUNÇÃO ALTERNATIVA PARA COMPATIBILIDADE =====

/**
 * Criar cobrança PIX usando REST API (alias para createPixCharge)
 */
export const createOpenPixCharge = async (options: CreatePixChargeOptions) => {
  return await createPixCharge(options)
}

// ===== EXPORTS =====

export default OpenPixAPI 