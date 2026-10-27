/**
 * Fornecimento de saldos e extratos de contas — API v1 (coleção Postman Saldo/Extrato).
 */

import { fetch } from 'undici'
import type {
  ConsultaExtratoParams,
  ConsultaExtratoResponse,
  ConsultaSaldoParams,
  ConsultaSaldoResponse,
} from '@/model/bradesco-contas'
import { getBradescoContasAccessToken } from './auth'
import type { BradescoEnvironment } from './config'
import { getBradescoConfig, resolveContasMtLsAgentPaths } from './config'
import { BradescoPixError } from './errors'
import { getBradescoAgent } from './agent'
import type { BradescoApiErrorPayload } from './types'

const PATH_SALDOS = '/fornecimento-saldos-contas/saldos'
const PATH_EXTRATOS = '/fornecimento-extratos-contas/extratos'

const DDMMYYYY = /^\d{8}$/

export interface ConsultaContasOptions {
  overrideEnv?: BradescoEnvironment
}

/** Formata Date para parâmetro dataInicio/dataFim (DDMMYYYY). */
export const formatBradescoDataParam = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear().toString()
  return `${d}${m}${y}`
}

/** Aceita Date ou string já no formato DDMMYYYY. */
export const normalizeBradescoDataParam = (value: Date | string): string => {
  if (value instanceof Date) {
    return formatBradescoDataParam(value)
  }
  const s = value.trim()
  if (!DDMMYYYY.test(s)) {
    throw new Error(
      `[BradescoContas] dataInicio/dataFim deve ser DDMMYYYY (8 dígitos) ou Date; recebido: ${value}`
    )
  }
  return s
}

const parseJsonResponse = async (res: Awaited<ReturnType<typeof fetch>>): Promise<unknown> => {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

const throwIfHttpError = (status: number, body: unknown): void => {
  if (status >= 400) {
    throw BradescoPixError.fromHttpError(
      status,
      typeof body === 'string' ? body : (body as BradescoApiErrorPayload)
    )
  }
}

const throwIfRootApiError = (body: Record<string, unknown>): void => {
  const codigoErro = body.codigoErro
  if (codigoErro != null && String(codigoErro).length > 0) {
    throw BradescoPixError.fromHttpError(400, body as BradescoApiErrorPayload)
  }
}

/** Produção Bradesco (ex.: CTAS0673) pode retornar codigoRetorno "0"; sandbox/postman costuma usar "00". */
const isOkRetorno = (codigo: string | number | null | undefined): boolean => {
  if (codigo == null) return false
  const s = String(codigo).trim()
  return s === '00' || s === '0'
}

function assertSaldoNegocioOk(data: ConsultaSaldoResponse): void {
  const blocos = [data.saldoCC, data.saldoCP, data.saldoAplicacaoCC].filter(
    (b): b is NonNullable<typeof b> => b != null
  )
  if (blocos.length === 0) return

  const algumSucesso = blocos.some((b) => isOkRetorno(b.codigoRetorno ?? undefined))
  if (!algumSucesso) {
    const primeiro = blocos.find((b) => b.mensagem)
    const msg =
      primeiro?.mensagem ?? primeiro?.codigoRetorno ?? 'Consulta de saldo sem retorno de sucesso (00)'
    throw new BradescoPixError(`[BradescoContas] ${msg}`, 200, primeiro?.codigoRetorno ?? undefined, {
      mensagem: msg,
    })
  }
}

function assertExtratoNegocioOk(data: ConsultaExtratoResponse): void {
  const blocos = [
    data.extratoUltimosLancamentos,
    data.extratoLancamentosFuturos,
    data.extratoPorPeriodo,
  ].filter((b): b is NonNullable<typeof b> => b != null)

  if (blocos.length === 0) return

  const algumSucesso = blocos.some((b) => isOkRetorno(b.codigoRetorno ?? undefined))
  if (!algumSucesso) {
    const primeiro = blocos.find((b) => b.mensagem)
    const msg =
      primeiro?.mensagem ?? primeiro?.codigoRetorno ?? 'Consulta de extrato sem retorno de sucesso (00)'
    throw new BradescoPixError(`[BradescoContas] ${msg}`, 200, primeiro?.codigoRetorno ?? undefined, {
      mensagem: msg,
    })
  }
}

/** Indica se há pelo menos um bloco com codigoRetorno de sucesso ("00" ou "0", mesma regra de `consultarExtratoConta`). */
export const isExtratoSucesso = (data: ConsultaExtratoResponse): boolean => {
  const blocos = [
    data.extratoUltimosLancamentos,
    data.extratoLancamentosFuturos,
    data.extratoPorPeriodo,
  ].filter((b): b is NonNullable<typeof b> => b != null)
  if (blocos.length === 0) return true
  return blocos.some((b) => isOkRetorno(b.codigoRetorno ?? undefined))
}

export const consultarSaldoConta = async (
  params: ConsultaSaldoParams,
  options?: ConsultaContasOptions
): Promise<ConsultaSaldoResponse> => {
  const config = getBradescoConfig(options?.overrideEnv)
  const baseUrl = (config.contasApiBaseUrl ?? '').replace(/\/$/, '')
  if (!baseUrl) {
    throw new Error('[BradescoContas] contasApiBaseUrl não configurado')
  }

  const search = new URLSearchParams({ agencia: params.agencia, conta: params.conta })
  if (params.tipoOperacao?.trim()) {
    search.set('tipoOperacao', params.tipoOperacao.trim())
  }
  const url = `${baseUrl}${PATH_SALDOS}?${search.toString()}`
  const accessToken = await getBradescoContasAccessToken(options?.overrideEnv)
  const authorizationHeader = accessToken.replace(/^Bearer\s+/i, '')
  const { certPath, keyPath, caPath } = resolveContasMtLsAgentPaths(config)
  const agent = getBradescoAgent(certPath, keyPath, caPath)

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: authorizationHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MinerStone-BradescoContas/1.0',
    },
    ...(agent !== undefined ? { dispatcher: agent } : {}),
  })

  const body = await parseJsonResponse(res)
  throwIfHttpError(res.status, body)

  const data = body as ConsultaSaldoResponse & Record<string, unknown>
  if (typeof data === 'object' && data !== null) {
    throwIfRootApiError(data as Record<string, unknown>)
  }

  assertSaldoNegocioOk(data)
  return data
}

export const consultarExtratoConta = async (
  params: ConsultaExtratoParams,
  options?: ConsultaContasOptions
): Promise<ConsultaExtratoResponse> => {
  const config = getBradescoConfig(options?.overrideEnv)
  const baseUrl = (config.contasApiBaseUrl ?? '').replace(/\/$/, '')
  if (!baseUrl) {
    throw new Error('[BradescoContas] contasApiBaseUrl não configurado')
  }

  const dataInicio = normalizeBradescoDataParam(params.dataInicio)
  const dataFim = normalizeBradescoDataParam(params.dataFim)

  const search = new URLSearchParams({
    agencia: params.agencia,
    conta: params.conta,
    tipo: params.tipo,
    dataInicio,
    dataFim,
  })
  const url = `${baseUrl}${PATH_EXTRATOS}?${search.toString()}`
  const accessToken = await getBradescoContasAccessToken(options?.overrideEnv)
  const authorizationHeader = accessToken.replace(/^Bearer\s+/i, '')
  const { certPath, keyPath, caPath } = resolveContasMtLsAgentPaths(config)
  const agent = getBradescoAgent(certPath, keyPath, caPath)

  console.log(`[BradescoContas] GET extrato ${baseUrl}${PATH_EXTRATOS} — ${dataInicio} a ${dataFim}`)

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: authorizationHeader,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MinerStone-BradescoContas/1.0',
    },
    ...(agent !== undefined ? { dispatcher: agent } : {}),
  })

  const body = await parseJsonResponse(res)
  throwIfHttpError(res.status, body)

  const data = body as ConsultaExtratoResponse & Record<string, unknown>
  if (typeof data === 'object' && data !== null) {
    throwIfRootApiError(data as Record<string, unknown>)
  }

  assertExtratoNegocioOk(data)
  return data
}
