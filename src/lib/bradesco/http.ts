/**
 * Cliente HTTP genérico para a API Bradesco
 * Encapsula chamadas com tratamento de erros, log seguro e suporte a mTLS via undici.
 */

import { getBradescoConfig, BradescoEnvironment } from './config'
import { getBradescoAgent } from './agent'
import { BradescoApiErrorPayload } from './types'
import { BradescoPixError } from './errors'
import { fetch } from 'undici'
import { resolve } from 'node:path'

interface RequestBradescoOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  accessToken: string
  body?: unknown
  overrideEnv?: BradescoEnvironment
}

/**
 * Realiza uma requisição autenticada para a API Pix Bradesco.
 * Usa mTLS (undici Agent) se os certificados estiverem configurados no .env.
 */
export const requestBradesco = async <T>(
  path: string,
  options: RequestBradescoOptions
): Promise<T> => {
  const config = getBradescoConfig(options.overrideEnv)
  const url = `${config.pixBaseUrl}${path}`
  const method = options.method ?? 'GET'

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.accessToken}`,
    'Content-Type': 'application/json',
  }

  const agent = getBradescoAgent(config.certPath, config.keyPath, config.caPath)

  console.log(`[BradescoLib] ${method} ${url} - ambiente: ${config.environment}`)

  // cURL completo com caminhos absolutos para execução em tempo real
  const cwd = process.cwd()
  const absCert = config.certPath ? resolve(cwd, config.certPath) : null
  const absKey = config.keyPath ? resolve(cwd, config.keyPath) : null
  const certFlags = absCert && absKey ? `--cert '${absCert}' --key '${absKey}' -k ` : ''
  const bodyStr = options.body !== undefined ? JSON.stringify(options.body) : undefined
  const curlHeaders = Object.entries(headers)
    .map(([k, v]) => `-H '${k}: ${v}'`)
    .join(' \\\n  ')
  const curlBody = bodyStr ? ` \\\n  -d '${bodyStr}'` : ''
  console.log(
    `\n[BradescoLib] ============ cURL ============\ncurl ${certFlags}\\\n  -X ${method} '${url}' \\\n  ${curlHeaders}${curlBody}\n[BradescoLib] ====================================\n`
  )

  let response: Awaited<ReturnType<typeof fetch>>
  try {
    response = await fetch(url, {
      method,
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(agent !== undefined ? { dispatcher: agent } : {}),
    })
  } catch (networkError) {
    throw new Error(
      `[BradescoLib] Erro de rede ao chamar ${url}: ${(networkError as Error).message}`
    )
  }

  let responseBody: unknown
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    responseBody = await response.json()
  } else {
    responseBody = await response.text()
  }

  if (!response.ok) {
    console.error(
      `[BradescoLib] Resposta de erro HTTP ${response.status} em ${method} ${path}`,
      JSON.stringify(responseBody, null, 2)
    )

    throw BradescoPixError.fromHttpError(
      response.status,
      responseBody as BradescoApiErrorPayload | string
    )
  }

  console.log(`[BradescoLib] Resposta HTTP ${response.status} - ${method} ${path}`)

  return responseBody as T
}
