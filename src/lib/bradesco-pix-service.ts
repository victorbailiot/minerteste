/**
 * Service de integração Bradesco Pix para o backend
 * Consome a lib bradesco e centraliza o tratamento de erros para uso nas API routes
 */

import { createBradescoPixClient, BradescoPixError } from './bradesco'
import {
  PixTransferRequest,
  PixTransferResponse,
  PixTransferStatusResponse,
} from './bradesco/types'

export interface SolicitarTransferenciaPixInput extends PixTransferRequest {
  userId?: string
}

export interface BradescoPixServiceResult<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    httpStatus?: number
  }
}

/**
 * Solicita uma transferência Pix via Bradesco.
 * Centraliza o tratamento de erros e log de auditoria.
 */
export const solicitarTransferenciaPix = async (
  input: SolicitarTransferenciaPixInput
): Promise<BradescoPixServiceResult<PixTransferResponse>> => {
  const { userId, ...transferRequest } = input
  const client = createBradescoPixClient()

  try {
    const response = await client.transferPix(transferRequest)

    console.log(
      `[BradescoPixService] Transferência solicitada - idtransacao: ${transferRequest.idtransacao}` +
      (userId ? `, userId: ${userId}` : '') +
      `, e2eid: ${response.e2eid ?? 'pendente'}`
    )

    return { success: true, data: response }
  } catch (error) {
    if (error instanceof BradescoPixError) {
      console.error(
        `[BradescoPixService] Erro na transferência - idtransacao: ${transferRequest.idtransacao}` +
        (userId ? `, userId: ${userId}` : '') +
        `, httpStatus: ${error.httpStatus}, code: ${error.code ?? 'N/A'}`
      )

      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          httpStatus: error.httpStatus,
        },
      }
    }

    console.error(
      `[BradescoPixService] Erro inesperado na transferência - idtransacao: ${transferRequest.idtransacao}`,
      error
    )

    return {
      success: false,
      error: {
        message: 'Erro interno ao processar transferência Pix',
        httpStatus: 500,
      },
    }
  }
}

/**
 * Consulta o status de uma transferência Pix via Bradesco.
 */
export const consultarTransferenciaPix = async (
  idtransacao: string,
  e2eid: string
): Promise<BradescoPixServiceResult<PixTransferStatusResponse>> => {
  const client = createBradescoPixClient()

  try {
    const response = await client.getTransferStatus({ idtransacao, e2eid })

    console.log(
      `[BradescoPixService] Consulta realizada - idtransacao: ${idtransacao}, status: ${response.status ?? 'desconhecido'}`
    )

    return { success: true, data: response }
  } catch (error) {
    if (error instanceof BradescoPixError) {
      console.error(
        `[BradescoPixService] Erro na consulta - idtransacao: ${idtransacao}` +
        `, e2eid: ${e2eid}, httpStatus: ${error.httpStatus}`
      )

      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          httpStatus: error.httpStatus,
        },
      }
    }

    console.error(
      `[BradescoPixService] Erro inesperado na consulta - idtransacao: ${idtransacao}`,
      error
    )

    return {
      success: false,
      error: {
        message: 'Erro interno ao consultar transferência Pix',
        httpStatus: 500,
      },
    }
  }
}
