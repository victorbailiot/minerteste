import { logCurlRequest } from '@/lib/networkUtils'
import type {
  SmsDevApiResponseItem,
  SmsDevBalanceResponse,
  SmsDevCancelRequest,
  SmsDevConfig,
  SmsDevSendMessage,
  SmsDevStatusRequest
} from '@/model/sms'

const DEFAULT_SMS_DEV_BASE_URL = 'https://api.smsdev.com.br/v1'
const DEFAULT_SMS_DEV_TYPE = 9

export class SmsDevError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message)
    this.name = 'SmsDevError'
  }
}

export class SmsDevService {
  private readonly config: Required<SmsDevConfig>

  constructor(config?: SmsDevConfig) {
    const apiKey = config?.apiKey || process.env.SMS_DEV_API_KEY || ''
    const baseUrl = config?.baseUrl || process.env.SMS_DEV_BASE_URL || DEFAULT_SMS_DEV_BASE_URL
    const type = config?.type || Number(process.env.SMS_DEV_TYPE || DEFAULT_SMS_DEV_TYPE)

    this.config = {
      apiKey,
      baseUrl: baseUrl.replace(/\/$/, ''),
      type
    }

    if (!this.config.apiKey) {
      throw new SmsDevError('SMS_DEV_API_KEY não configurada nas variáveis de ambiente')
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.config.baseUrl}/${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value))
        }
      })
    }

    return url.toString()
  }

  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  private parseResponseBody = async <T>(response: Response): Promise<T> => {
    const responseText = await response.text()

    if (!responseText) {
      return {} as T
    }

    try {
      return JSON.parse(responseText) as T
    } catch {
      return responseText as T
    }
  }

  private async request<T>(
    endpoint: string,
    options?: {
      method?: 'GET' | 'POST'
      params?: Record<string, string | number | undefined>
      body?: unknown
    }
  ): Promise<T> {
    const method = options?.method || 'GET'
    const url = this.buildUrl(endpoint, method === 'GET' ? options?.params : undefined)
    const requestBody = method === 'POST' && options?.body ? JSON.stringify(options.body) : undefined

    const headers: HeadersInit = {
      Accept: 'application/json'
    }

    if (requestBody) {
      headers['Content-Type'] = 'application/json'
    }

    logCurlRequest(url, {
      method,
      headers,
      body: requestBody
    })

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody
    })

    const parsedBody = await this.parseResponseBody<T>(response)

    if (!response.ok) {
      throw new SmsDevError(
        `Erro na API SMS Dev: ${response.status} ${response.statusText}`,
        response.status,
        parsedBody
      )
    }

    return parsedBody
  }

  async sendSms(payload: SmsDevSendMessage | SmsDevSendMessage[]): Promise<SmsDevApiResponseItem[]> {
    const messages = Array.isArray(payload) ? payload : [payload]

    const requestBody = messages.map((message) => ({
      key: this.config.apiKey,
      type: message.type || this.config.type,
      number: this.normalizePhoneNumber(message.number),
      msg: message.msg,
      ...(message.refer ? { refer: message.refer } : {}),
      ...(message.jobdate ? { jobdate: message.jobdate } : {}),
      ...(message.jobtime ? { jobtime: message.jobtime } : {})
    }))

    const response = await this.request<SmsDevApiResponseItem[] | SmsDevApiResponseItem>('send', {
      method: 'POST',
      body: Array.isArray(payload) ? requestBody : requestBody[0]
    })

    return Array.isArray(response) ? response : [response]
  }

  async cancelSms(payload: SmsDevCancelRequest): Promise<unknown> {
    return this.request('cancel', {
      method: 'GET',
      params: {
        key: this.config.apiKey,
        id: payload.id,
        refer: payload.refer
      }
    })
  }

  async getDeliveryStatus(payload: SmsDevStatusRequest): Promise<unknown> {
    return this.request('dlr', {
      method: 'GET',
      params: {
        key: this.config.apiKey,
        id: payload.id,
        refer: payload.refer
      }
    })
  }

  async getBalance(): Promise<SmsDevBalanceResponse> {
    return this.request<SmsDevBalanceResponse>('balance', {
      method: 'GET',
      params: {
        key: this.config.apiKey
      }
    })
  }
}

export const getSmsDevService = (): SmsDevService => new SmsDevService()
