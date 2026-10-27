/**
 * Cliente de alto nível para a API Pix Bradesco
 * Abstrai autenticação, chamadas HTTP e tipagem em uma interface simples
 */

import { BradescoEnvironment } from './config'
import { getBradescoAccessToken, invalidateBradescoTokenCache } from './auth'
import { requestBradesco } from './http'
import {
  PixTransferRequest,
  PixTransferResponse,
  PixTransferQueryParams,
  PixTransferStatusResponse,
} from './types'
import { BradescoPixError } from './errors'

export interface BradescoPixClientOptions {
  environment?: BradescoEnvironment
}

export interface BradescoPixClient {
  /**
   * Solicita uma transferência Pix.
   * Suporta pagador por Agência+Conta ou por Chave Pix (EVP, Telefone, Email, CPF/CNPJ).
   * @see https://developers.bradesco.com.br - POST /v1/spi/solicitar-transferencia
   */
  transferPix: (request: PixTransferRequest) => Promise<PixTransferResponse>

  /**
   * Consulta o status de uma transferência Pix pelo idtransacao e e2eid.
   * @see https://developers.bradesco.com.br - GET /v1/spi/consulta/transferencia/{idtransacao}/{e2eid}
   */
  getTransferStatus: (params: PixTransferQueryParams) => Promise<PixTransferStatusResponse>
}

/**
 * Cria uma instância do cliente Pix Bradesco.
 * O ambiente é resolvido via BRADESCO_ENV ou sobrescrito pelo parâmetro `environment`.
 *
 * @example
 * const client = createBradescoPixClient()
 * const result = await client.transferPix({ idtransacao: '...', pagador: {...}, recebedor: {...}, valor: '100.00' })
 */
export const createBradescoPixClient = (
  options?: BradescoPixClientOptions
): BradescoPixClient => {
  const env = options?.environment

  const getToken = async (): Promise<string> => {
    try {
      return await getBradescoAccessToken(env)
    } catch (error) {
      throw new Error(
        `[BradescoLib] Não foi possível obter token de acesso: ${(error as Error).message}`
      )
    }
  }

  const transferPix = async (request: PixTransferRequest): Promise<PixTransferResponse> => {
    let accessToken: string
    try {
      accessToken = await getToken()
    } catch (error) {
      throw error
    }

    try {
      const response = await requestBradesco<PixTransferResponse>(
        '/solicitar-transferencia',
        {
          method: 'POST',
          accessToken,
          body: request,
          overrideEnv: env,
        }
      )

      console.log(
        `[BradescoLib] Transferência Pix solicitada - idtransacao: ${request.idtransacao}, e2eid: ${response.e2eid ?? 'pendente'}`
      )

      return response
    } catch (error) {
      if (error instanceof BradescoPixError && error.httpStatus === 401) {
        invalidateBradescoTokenCache(env)
      }
      console.error(
        `[BradescoLib] Erro na transferência Pix - idtransacao: ${request.idtransacao}`
      )
      throw error
    }
  }

  const getTransferStatus = async (
    params: PixTransferQueryParams
  ): Promise<PixTransferStatusResponse> => {
    let accessToken: string
    try {
      accessToken = await getToken()
    } catch (error) {
      throw error
    }

    try {
      const response = await requestBradesco<PixTransferStatusResponse>(
        `/consulta/transferencia/${encodeURIComponent(params.idtransacao)}/${encodeURIComponent(params.e2eid)}`,
        {
          method: 'GET',
          accessToken,
          overrideEnv: env,
        }
      )

      console.log(
        `[BradescoLib] Consulta de transferência - idtransacao: ${params.idtransacao}, status: ${response.status ?? 'desconhecido'}`
      )

      return response
    } catch (error) {
      if (error instanceof BradescoPixError && error.httpStatus === 401) {
        invalidateBradescoTokenCache(env)
      }
      console.error(
        `[BradescoLib] Erro na consulta de transferência - idtransacao: ${params.idtransacao}`
      )
      throw error
    }
  }

  return { transferPix, getTransferStatus }
}

/**
 * Instância padrão do cliente Pix Bradesco.
 * Utiliza o ambiente definido em BRADESCO_ENV (padrão: sandbox).
 * Lazy initialization — só lança erro se as variáveis forem acessadas em tempo de execução.
 */
export const bradescoPixClient = createBradescoPixClient()
