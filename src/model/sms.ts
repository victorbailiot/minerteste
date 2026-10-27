export interface SmsDevConfig {
  apiKey: string
  baseUrl?: string
  type?: number
}

export interface SmsDevSendMessage {
  number: string
  msg: string
  refer?: string
  jobdate?: string
  jobtime?: string
  type?: number
}

export interface SmsDevApiResponseItem {
  situacao: string
  codigo: string
  id?: string
  descricao: string
  [key: string]: unknown
}

export interface SmsDevCancelRequest {
  id?: string
  refer?: string
}

export interface SmsDevStatusRequest {
  id?: string
  refer?: string
}

export interface SmsDevBalanceResponse {
  situacao?: string
  codigo?: string
  descricao?: string
  saldo?: string | number
  [key: string]: unknown
}
