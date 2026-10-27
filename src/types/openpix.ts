/**
 * Tipos específicos e utilitários para OpenPix
 * Complementa a biblioteca principal em src/lib/openpix.ts
 */

// ===== ENUMS =====

export enum OpenPixEventType {
  CHARGE_CREATED = 'OPENPIX:CHARGE_CREATED',
  CHARGE_COMPLETED = 'OPENPIX:CHARGE_COMPLETED',
  CHARGE_EXPIRED = 'OPENPIX:CHARGE_EXPIRED',
  TRANSACTION_CREATED = 'OPENPIX:TRANSACTION_CREATED',
  TRANSACTION_RECEIVED = 'OPENPIX:TRANSACTION_RECEIVED',
  MOVEMENT_CREATED = 'OPENPIX:MOVEMENT_CREATED'
}

export enum ChargeStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED'
}

export enum PixKeyType {
  RANDOM = 'RANDOM',
  EMAIL = 'EMAIL',
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  PHONE = 'PHONE'
}

export enum PixKeyStatus {
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  ERROR = 'ERROR'
}

export enum OpenPixEnvironment {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production'
}

// ===== TIPOS PARA EVENTOS DE WEBHOOK =====

export interface WebhookEventPayload {
  event: OpenPixEventType
  charge?: ChargeWebhookData
  transaction?: TransactionWebhookData
  movement?: MovementWebhookData
}

export interface ChargeWebhookData {
  status: ChargeStatus
  customer: CustomerData
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

export interface TransactionWebhookData {
  value: number
  time: string
  endToEndId: string
  transactionID: string
  charge: Partial<ChargeWebhookData>
  pixKey: {
    id: string
    key: string
    type: PixKeyType
  }
}

export interface MovementWebhookData {
  id: string
  value: number
  type: 'CREDIT' | 'DEBIT'
  description: string
  createdAt: string
  endToEndId: string
  transactionID: string
}

// ===== TIPOS PARA DADOS DO CLIENTE =====

export interface CustomerData {
  name: string
  email?: string
  phone?: string
  taxID?: string // CPF ou CNPJ
  address?: AddressData
}

export interface AddressData {
  zipcode: string
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  complement?: string
}

// ===== TIPOS PARA ERROS =====

export interface OpenPixError {
  error: string
  message: string
  statusCode: number
  details?: any
}

export interface OpenPixValidationError extends OpenPixError {
  fields: Array<{
    field: string
    message: string
  }>
}

// ===== TIPOS PARA FILTROS E PAGINAÇÃO =====

export interface ListChargesFilter {
  skip?: number
  limit?: number
  status?: ChargeStatus
  correlationID?: string
  identifier?: string
  pixKey?: string
  startDate?: string // ISO date
  endDate?: string // ISO date
}

export interface ListTransactionsFilter {
  skip?: number
  limit?: number
  startDate?: string // ISO date
  endDate?: string // ISO date
  pixKey?: string
  endToEndId?: string
}

export interface PaginationInfo {
  errors: any[]
  skip: number
  limit: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

// ===== TIPOS PARA CONFIGURAÇÃO AVANÇADA =====

export interface OpenPixAdvancedConfig {
  appID: string
  env: OpenPixEnvironment
  baseURL?: string
  timeout?: number // em milissegundos
  retries?: number
  retryDelay?: number // em milissegundos
  userAgent?: string
  debug?: boolean
}

// ===== TIPOS PARA ESTATÍSTICAS =====

export interface OpenPixStats {
  totalCharges: number
  completedCharges: number
  activeCharges: number
  expiredCharges: number
  totalTransactions: number
  totalValue: number
  period: {
    startDate: string
    endDate: string
  }
}

// ===== TIPOS PARA QR CODE =====

export interface QRCodeOptions {
  size?: 'small' | 'medium' | 'large' | number
  format?: 'PNG' | 'SVG'
  backgroundColor?: string
  foregroundColor?: string
  margin?: number
}

// ===== UTILITÁRIOS DE VALIDAÇÃO =====

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// ===== TIPOS PARA INTEGRAÇÕES =====

export interface EcommerceIntegration {
  platform: 'WooCommerce' | 'Shopify' | 'Magento' | 'PrestaShop' | 'Other'
  version?: string
  pluginVersion?: string
  webhookURL?: string
  returnURL?: string
  cancelURL?: string
}

// ===== TIPOS PARA CAMPANHAS (API MASTER) =====

export interface CampaignData {
  name: string
  description?: string
  targetAmount: number // em centavos
  currentAmount: number // em centavos
  startDate: string
  endDate: string
  pixKey: string
  isActive: boolean
  participants: number
}

// ===== CONSTANTES ÚTEIS =====

export const OPENPIX_CONSTANTS = {
  MAX_COMMENT_LENGTH: 140,
  MAX_IDENTIFIER_LENGTH: 64,
  MAX_CORRELATION_ID_LENGTH: 128,
  MIN_VALUE_CENTAVOS: 1, // 1 centavo
  MAX_VALUE_CENTAVOS: 1000000000, // 10 milhões de reais
  DEFAULT_EXPIRATION_SECONDS: 86400, // 24 horas
  MAX_WEBHOOK_RETRIES: 5,
  RATE_LIMIT_PER_SECOND: 10
} as const

// ===== HELPERS PARA TIPOS =====

export type OpenPixEventHandler<T = any> = (data: T) => void | Promise<void>

export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// ===== EXPORT TYPES =====

export type * from './openpix' 