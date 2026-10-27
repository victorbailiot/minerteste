/**
 * Biblioteca de integração com a API Melhor Envio
 * Documentação: https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos
 */

import { logCurlRequest } from '../networkUtils'
import {
  MELHOR_ENVIO_TOKEN,
  MELHOR_ENVIO_URL,
  MELHOR_ENVIO_CALCULATE_ENDPOINT
} from './melhor-envio-config'

// ===== TIPOS E INTERFACES =====

export interface MelhorEnvioAddress {
  postal_code: string
}

export interface MelhorEnvioProduct {
  id: string
  width: number
  height: number
  length: number
  weight: number
  insurance_value: number
  quantity: number
}

export interface MelhorEnvioCalculateOptions {
  receipt?: boolean
  own_hand?: boolean
}

export interface MelhorEnvioCalculateRequest {
  from: MelhorEnvioAddress
  to: MelhorEnvioAddress
  products: MelhorEnvioProduct[]
  options?: MelhorEnvioCalculateOptions
  services?: string
}

export interface MelhorEnvioShippingOption {
  id: number | string
  name: string
  price: string
  custom_price?: string
  discount?: string
  currency: string
  delivery_time?: number
  delivery_range?: {
    min: number
    max: number
  }
  custom_delivery_time?: number
  custom_delivery_range?: {
    min: number
    max: number
  }
  company?: {
    id: number
    name: string
    picture: string
  }
  error?: string
  [key: string]: unknown
}

export interface MelhorEnvioCalculateResponse {
  id: number | string
  name: string
  price: string
  custom_price?: string
  discount?: string
  currency: string
  delivery_time?: number
  delivery_range?: {
    min: number
    max: number
  }
  custom_delivery_time?: number
  custom_delivery_range?: {
    min: number
    max: number
  }
  company?: {
    id: number
    name: string
    picture: string
  }
  error?: string
  [key: string]: unknown
}

export class MelhorEnvioError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message)
    this.name = 'MelhorEnvioError'
  }
}

// ===== FUNÇÕES =====

const getBaseUrl = (): string => {
  const url = MELHOR_ENVIO_URL
  if (!url) {
    throw new MelhorEnvioError('MELHOR_ENVIO_URL não configurada nas variáveis de ambiente')
  }
  return url.replace(/\/$/, '')
}

const getToken = (): string => {
  const token = MELHOR_ENVIO_TOKEN
  if (!token) {
    throw new MelhorEnvioError('MELHOR_ENVIO_TOKEN não configurada nas variáveis de ambiente')
  }
  return token
}

/**
 * Calcula o frete para um envio usando a API Melhor Envio
 * @param params - Parâmetros do cálculo (origem, destino, produtos, opções)
 * @returns Array com as opções de frete disponíveis
 */
export const calcularFrete = async (
  params: MelhorEnvioCalculateRequest
): Promise<MelhorEnvioCalculateResponse[]> => {
  const baseUrl = getBaseUrl()
  const token = getToken()
  const url = `${baseUrl}${MELHOR_ENVIO_CALCULATE_ENDPOINT}`

  const body: MelhorEnvioCalculateRequest = {
    from: params.from,
    to: params.to,
    products: params.products,
    ...(params.options && { options: params.options }),
    ...(params.services && { services: params.services })
  }

  logCurlRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  })

  console.log('Melhor Envio Response:', response)

  if (!response.ok) {
    const errorBody = await response.text()
    let parsedError: unknown
    try {
      parsedError = JSON.parse(errorBody)
    } catch {
      parsedError = errorBody
    }

    throw new MelhorEnvioError(
      `Erro na API Melhor Envio: ${response.status} ${response.statusText}`,
      response.status,
      parsedError
    )
  }

  const data = await response.json()

  if (!Array.isArray(data)) {
    return [data]
  }

  return data
}
