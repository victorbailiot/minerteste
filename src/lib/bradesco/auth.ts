/**
 * Módulo de autenticação OAuth2 para a API Bradesco
 * Utiliza Client Credentials Flow (grant_type=client_credentials)
 * com suporte a mTLS (autenticação mútua TLS) via undici Agent.
 */

import { getBradescoConfig, BradescoEnvironment, resolveContasMtLsAgentPaths } from './config'
import { getBradescoAgent } from './agent'
import { BradescoTokenResponse } from './types'
import { fetch } from 'undici'

interface TokenCache {
  accessToken: string
  expiresAt: number
}

const tokenCache = new Map<string, TokenCache>()

const EXPIRATION_BUFFER_SECONDS = 60

const getCacheKey = (environment: BradescoEnvironment): string => `bradesco_token_${environment}`

const getContasCacheKey = (environment: BradescoEnvironment, scope: string): string =>
  `bradesco_token_${environment}_contas_${scope || '_'}`

/** Escopo do token só para API de contas. Padrão vazio (igual ao Pix). Defina CTAS via env se o portal/JWT exigir. */
const getContasOAuthScope = (): string => {
  if (process.env.BRADESCO_CONTAS_OAUTH_SCOPE !== undefined) {
    return process.env.BRADESCO_CONTAS_OAUTH_SCOPE.trim()
  }
  return ''
}

/**
 * Obtém um access token OAuth2 do Bradesco.
 * O token é armazenado em cache em memória até 60 segundos antes da expiração.
 * Usa mTLS se os caminhos de certificado estiverem configurados no .env.
 */
export const getBradescoAccessToken = async (
  overrideEnv?: BradescoEnvironment
): Promise<string> => {
  const config = getBradescoConfig(overrideEnv)
  const cacheKey = getCacheKey(config.environment)

  const cached = tokenCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: '',
  })

  const agent = getBradescoAgent(config.certPath, config.keyPath, config.caPath)

  const pixFetchInit: Parameters<typeof fetch>[1] = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    ...(agent !== undefined ? { dispatcher: agent } : {}),
  }

  try {
    const response = await fetch(config.tokenUrl, pixFetchInit)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `[BradescoLib] Falha ao obter token OAuth2 (${response.status}): ${errorText}`
      )
    }

    const data = await response.json() as BradescoTokenResponse

    if (!data.access_token) {
      throw new Error('[BradescoLib] Resposta do token inválida: access_token não encontrado')
    }

    const expiresInMs = (data.expires_in - EXPIRATION_BUFFER_SECONDS) * 1000
    tokenCache.set(cacheKey, {
      accessToken: data.access_token,
      expiresAt: Date.now() + expiresInMs,
    })

    console.log(
      `[BradescoLib] Token OAuth2 obtido com sucesso - ambiente: ${config.environment}, expira em: ${data.expires_in}s`
    )

    return data.access_token
  } catch (error) {
    throw new Error(
      `[BradescoLib] Não foi possível obter token de acesso: ${(error as Error).message}`
    )
  }
}

/**
 * Token OAuth2 para API de saldo/extrato (fornecimento de contas).
 * Sempre usa `contasTokenUrl` (derivado para /auth/server-mtls/v2/token),
 * pois o gateway Bradesco exige iss do endpoint mTLS v2 para liberar saldo/extrato.
 * Credenciais: `contasClientId/Secret` se definidos no .env; caso contrário reutiliza as do Pix.
 */
export const getBradescoContasAccessToken = async (
  overrideEnv?: BradescoEnvironment
): Promise<string> => {
  const config = getBradescoConfig(overrideEnv)

  const contasOAuthScope = getContasOAuthScope()
  const cacheKey = getContasCacheKey(config.environment, contasOAuthScope)
  const cached = tokenCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken
  }

  // Sempre usa contasTokenUrl (mTLS v2) — mesmo sem creds separadas de contas.
  // Usar config.tokenUrl (server/oauth/token) gera iss errado e 403 no saldo/extrato.
  const tokenUrl = config.contasTokenUrl ?? config.tokenUrl
  const clientId = config.contasClientId ?? config.clientId
  const clientSecret = config.contasClientSecret ?? config.clientSecret

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: contasOAuthScope,
  })

  const { certPath, keyPath, caPath } = resolveContasMtLsAgentPaths(config)
  const agent = getBradescoAgent(certPath, keyPath, caPath)

  const contasTokenRequiresMtls = (() => {
    try {
      const u = new URL(tokenUrl)
      if (/\/auth\/server-mtls\//i.test(u.pathname)) return true
      if (u.hostname === 'openapi.bradesco.com.br') return true
      return false
    } catch {
      return /\/server-mtls\//i.test(tokenUrl)
    }
  })()

  if (contasTokenRequiresMtls && agent === undefined) {
    const hint =
      config.environment === 'production'
        ? 'BRADESCO_PROD_CERT_PATH + BRADESCO_PROD_KEY_PATH (ou BRADESCO_PROD_CONTAS_CERT_PATH + BRADESCO_PROD_CONTAS_KEY_PATH)'
        : 'BRADESCO_SANDBOX_CERT_PATH + BRADESCO_SANDBOX_KEY_PATH (ou BRADESCO_SANDBOX_CONTAS_CERT_PATH + BRADESCO_SANDBOX_CONTAS_KEY_PATH)'
    throw new Error(
      `[BradescoLib] Token OAuth (saldo/extrato) exige certificado cliente (mTLS) em ${tokenUrl}, ` +
        `mas nenhum agente mTLS foi criado. Verifique se os arquivos existem e não estão vazios; defina ${hint} e reinicie o servidor.`
    )
  }

  const contasFetchInit: Parameters<typeof fetch>[1] = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    ...(agent !== undefined ? { dispatcher: agent } : {}),
  }

  try {
    const response = await fetch(tokenUrl, contasFetchInit)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `[BradescoLib] Falha ao obter token OAuth2 (contas) (${response.status}): ${errorText}`
      )
    }

    const data = (await response.json()) as BradescoTokenResponse

    if (!data.access_token) {
      throw new Error('[BradescoLib] Resposta do token (contas) inválida: access_token não encontrado')
    }

    const expiresInMs = (data.expires_in - EXPIRATION_BUFFER_SECONDS) * 1000
    tokenCache.set(cacheKey, {
      accessToken: data.access_token,
      expiresAt: Date.now() + expiresInMs,
    })

    console.log(
      `[BradescoLib] Token OAuth2 (contas) obtido - ambiente: ${config.environment}, tokenUrl: ${tokenUrl}, scope: ${contasOAuthScope || '(vazio)'}, expira em: ${data.expires_in}s`
    )

    return data.access_token
  } catch (error) {
    throw new Error(
      `[BradescoLib] Não foi possível obter token de acesso (contas): ${(error as Error).message}`
    )
  }
}

/**
 * Invalida o cache do token para forçar nova autenticação na próxima chamada.
 */
export const invalidateBradescoTokenCache = (overrideEnv?: BradescoEnvironment): void => {
  const config = getBradescoConfig(overrideEnv)
  tokenCache.delete(getCacheKey(config.environment))
}

export const invalidateBradescoContasTokenCache = (overrideEnv?: BradescoEnvironment): void => {
  const config = getBradescoConfig(overrideEnv)
  tokenCache.delete(getContasCacheKey(config.environment, getContasOAuthScope()))
}
