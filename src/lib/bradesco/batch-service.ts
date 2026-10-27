/**
 * Serviço de Pagamento em Lote (Pagamentos Lote) - API Bradesco
 * POST /v1.1/pagamentos-lote
 */

import { fetch } from 'undici'
import { getBradescoAccessToken } from './auth'
import { getBradescoConfig } from './config'
import { getBradescoAgent } from './agent'
import type { PagamentoLoteRequest, PagamentoLoteResponse } from './batch-types'

const BATCH_PATH = '/pagamentos-lote'

export interface BatchTransferResult {
  success: boolean
  data?: PagamentoLoteResponse
  error?: {
    message: string
    code?: string
    httpStatus?: number
  }
}

/**
 * Envia pagamentos PIX em lote para o Bradesco.
 * Monta o payload conforme documentação: idLote, tipoPagamento: 05, dataPagamento, listaPagamentos.
 */
export const enviarPagamentoLote = async (
  request: PagamentoLoteRequest
): Promise<BatchTransferResult> => {
  const config = getBradescoConfig()
  const batchBaseUrl = config.batchBaseUrl

  if (!batchBaseUrl) {
    return {
      success: false,
      error: {
        message: 'BRADESCO_BATCH_BASE_URL não configurado',
      },
    }
  }

  try {
    const accessToken = await getBradescoAccessToken()
    const url = `${batchBaseUrl}${BATCH_PATH}`
    const agent = getBradescoAgent(config.certPath, config.keyPath, config.caPath)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      dispatcher: agent,
    })

    const body = await res.json().catch(() => ({})) as PagamentoLoteResponse

    if (!res.ok) {
      console.error('[BradescoBatch] Erro HTTP', res.status, JSON.stringify(body, null, 2))
      return {
        success: false,
        error: {
          message: (body as { msg?: string; mensagem?: string })?.msg ?? (body as { msg?: string; mensagem?: string })?.mensagem ?? `HTTP ${res.status}`,
          httpStatus: res.status,
        },
      }
    }

    console.log('[BradescoBatch] Lote enviado - idLote:', request.idLote, 'itens:', request.listaPagamentos.length)
    return { success: true, data: body }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[BradescoBatch] Erro ao enviar lote:', msg)
    return {
      success: false,
      error: { message: msg },
    }
  }
}
