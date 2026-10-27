import { getRuntimeBradescoMtlsPaths } from './cert-runtime'

/**
 * Configuração da integração Pix Bradesco
 * Suporta ambiente sandbox e produção via BRADESCO_ENV no .env
 *
 * Sandbox: token, Pix (/v1/spi), lote (/v1.1) e saldo/extrato (/v1) compartilham o mesmo host
 * (openapisandbox.prebanco.com.br). Use BRADESCO_SANDBOX_API_ORIGIN para definir todos de uma vez.
 *
 * Produção: Pix/lote/token usam em geral qrpix.bradesco.com.br; saldo/extrato usam openapi.bradesco.com.br
 * (hosts diferentes). BRADESCO_PROD_API_ORIGIN cobre Pix+lote+token; BRADESCO_PROD_CONTAS_API_ORIGIN
 * cobre apenas a API de contas (padrão openapi.bradesco.com.br se nada for informado).
 */

export type BradescoEnvironment = 'sandbox' | 'production'

export interface BradescoEnvironmentConfig {
  environment: BradescoEnvironment
  clientId: string
  clientSecret: string
  tokenUrl: string
  pixBaseUrl: string
  /** URL base para Pagamento em Lote (v1.1) - opcional */
  batchBaseUrl?: string
  /** URL base v1 para fornecimento de saldos/extratos (openapisandbox / openapi.bradesco) */
  contasApiBaseUrl?: string
  /**
   * OAuth da API de contas (saldo/extrato). Opcional: `BRADESCO_*_CONTAS_CLIENT_ID` / `SECRET`.
   * Se ausentes, reutilizam as credenciais Pix (`clientId` / `clientSecret`).
   */
  contasClientId?: string
  contasClientSecret?: string
  /** Token OAuth para contas; padrão derivado de `contasApiBaseUrl` (host + /auth/server/oauth/token) */
  contasTokenUrl?: string
  /** Tipo da chave PIX do pagador (empresa) */
  pagadorTipoChave: 'EVP' | 'CPFCNPJ' | 'TELEFONE' | 'EMAIL' | 'AGENCIACONTA'
  /** Chave PIX do pagador — preenchido quando tipoChave != AGENCIACONTA */
  pagadorChavePix?: string
  /** Agência — preenchido quando tipoChave = AGENCIACONTA */
  pagadorAgencia?: string
  /** Conta — preenchido quando tipoChave = AGENCIACONTA */
  pagadorConta?: string
  /** Caminho para o certificado do cliente (.pem ou .crt) — obrigatório para mTLS */
  certPath?: string
  /** Caminho para a chave privada do cliente (.key ou .pem) — obrigatório para mTLS */
  keyPath?: string
  /** Caminho para o certificado CA (opcional) */
  caPath?: string
  /** mTLS só para API de contas (saldo/extrato). Se ambos definidos, substituem cert/key do Pix nessas chamadas + token contas. */
  contasCertPath?: string
  contasKeyPath?: string
  contasCaPath?: string
}

const trimTrailingSlash = (url: string): string => url.replace(/\/$/, '')

/**
 * Garante HTTPS e sufixo `/v1` na base de saldo/extrato.
 * - `http://...prebanco.../v1` (41 chars vs 42 em https) costuma gerar **403 MessageBlocked** no gateway.
 * - Typo `.../v` sem `1` monta path errado em `/v/fornecimento-...`.
 */
export const normalizeContasApiV1BaseUrl = (baseUrl: string): string => {
  let u = trimTrailingSlash(baseUrl.trim())
  if (!u) return u
  const lower = u.toLowerCase()
  if (
    lower.startsWith('http://') &&
    (lower.includes('bradesco') || lower.includes('prebanco'))
  ) {
    u = `https://${u.slice('http://'.length)}`
  }
  if (u.endsWith('/v')) return `${u}1`
  if (!u.endsWith('/v1')) return `${u}/v1`
  return u
}

const SANDBOX_HOST_DEFAULT = 'https://openapisandbox.prebanco.com.br'
const SANDBOX_TOKEN_URL = `${SANDBOX_HOST_DEFAULT}/auth/server/oauth/token`
const SANDBOX_PIX_BASE_URL = `${SANDBOX_HOST_DEFAULT}/v1/spi`
const SANDBOX_BATCH_BASE_URL = `${SANDBOX_HOST_DEFAULT}/v1.1`
const SANDBOX_CONTAS_API_BASE_URL = `${SANDBOX_HOST_DEFAULT}/v1`

const PROD_PIX_HOST_DEFAULT = 'https://qrpix.bradesco.com.br'
const PRODUCTION_TOKEN_URL = `${PROD_PIX_HOST_DEFAULT}/auth/server/oauth/token`
const PRODUCTION_PIX_BASE_URL = `${PROD_PIX_HOST_DEFAULT}/v1/spi`
const PRODUCTION_BATCH_BASE_URL = `${PROD_PIX_HOST_DEFAULT}/v1.1`
const PROD_CONTAS_HOST_DEFAULT = 'https://openapi.bradesco.com.br'
const PRODUCTION_CONTAS_API_BASE_URL = `${PROD_CONTAS_HOST_DEFAULT}/v1`

/**
 * Endpoint mTLS v2 exigido pelo gateway Bradesco para tokens aceitos em saldo/extrato.
 * Tokens de `/auth/server/oauth/token` retornam iss errado e são bloqueados (403 MessageBlocked).
 */
const CONTAS_MTLS_TOKEN_PATH = '/auth/server-mtls/v2/token'
const OAUTH_TOKEN_PATH_REGEX = /\/auth\/server\/oauth\/token$/

/**
 * Troca o path de token padrão (server/oauth/token) pelo mTLS v2 exigido para saldo/extrato.
 * Se a URL já usa um path diferente de server/oauth/token, mantém como está.
 */
const toContasMtLsTokenUrl = (url: string): string =>
  OAUTH_TOKEN_PATH_REGEX.test(url) ? url.replace(OAUTH_TOKEN_PATH_REGEX, CONTAS_MTLS_TOKEN_PATH) : url

/** Host da API de contas → URL de token mTLS v2 (obrigatório para saldo/extrato). */
export const resolveContasTokenUrl = (
  explicit: string | undefined,
  contasApiBaseUrl: string | undefined,
  pixTokenFallback: string
): string => {
  if (explicit?.trim()) {
    let t = trimTrailingSlash(explicit.trim())
    const tl = t.toLowerCase()
    if (tl.startsWith('http://') && (tl.includes('bradesco') || tl.includes('prebanco'))) {
      t = `https://${t.slice('http://'.length)}`
    }
    return t
  }
  if (contasApiBaseUrl?.trim()) {
    const trimmed = trimTrailingSlash(contasApiBaseUrl.trim())
    const hostBase = trimTrailingSlash(trimmed.replace(/\/v1\/?$/, '').replace(/\/v$/, ''))
    return `${hostBase}${CONTAS_MTLS_TOKEN_PATH}`
  }
  return toContasMtLsTokenUrl(pixTokenFallback)
}

/** Certificado mTLS para rotas de contas + token OAuth de contas (se contasCert+Key existirem). */
export const resolveContasMtLsAgentPaths = (
  config: BradescoEnvironmentConfig
): { certPath?: string; keyPath?: string; caPath?: string } => {
  const cc = config.contasCertPath?.trim()
  const ck = config.contasKeyPath?.trim()
  if (cc && ck) {
    return {
      certPath: cc,
      keyPath: ck,
      caPath: config.contasCaPath?.trim() || config.caPath,
    }
  }
  return {
    certPath: config.certPath,
    keyPath: config.keyPath,
    caPath: config.caPath,
  }
}

const getRequiredEnv = (key: string, environment: BradescoEnvironment): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `[BradescoLib] Variável de ambiente obrigatória não encontrada: ${key} (ambiente: ${environment})`
    )
  }
  return value
}

/** Uma origem (scheme + host, sem barra final) gera token, Pix, lote e contas no sandbox. */
const resolveSandboxApiUrls = (): {
  tokenUrl: string
  pixBaseUrl: string
  batchBaseUrl: string | undefined
  contasApiBaseUrl: string | undefined
} => {
  const originRaw = process.env.BRADESCO_SANDBOX_API_ORIGIN?.trim()
  const origin = originRaw ? trimTrailingSlash(originRaw) : null

  const fromOrigin = origin
    ? {
        tokenUrl: `${origin}/auth/server/oauth/token`,
        pixBaseUrl: `${origin}/v1/spi`,
        batchBaseUrl: `${origin}/v1.1`,
        contasApiBaseUrl: `${origin}/v1`,
      }
    : null

  return {
    tokenUrl: process.env.BRADESCO_SANDBOX_TOKEN_URL ?? fromOrigin?.tokenUrl ?? SANDBOX_TOKEN_URL,
    pixBaseUrl: process.env.BRADESCO_SANDBOX_PIX_BASE_URL ?? fromOrigin?.pixBaseUrl ?? SANDBOX_PIX_BASE_URL,
    batchBaseUrl:
      process.env.BRADESCO_SANDBOX_BATCH_BASE_URL ?? fromOrigin?.batchBaseUrl ?? SANDBOX_BATCH_BASE_URL,
    contasApiBaseUrl: normalizeContasApiV1BaseUrl(
      process.env.BRADESCO_SANDBOX_CONTAS_BASE_URL ??
        fromOrigin?.contasApiBaseUrl ??
        SANDBOX_CONTAS_API_BASE_URL
    ),
  }
}

const resolveProductionApiUrls = (): {
  tokenUrl: string
  pixBaseUrl: string
  batchBaseUrl: string | undefined
  contasApiBaseUrl: string | undefined
} => {
  const pixOriginRaw = process.env.BRADESCO_PROD_API_ORIGIN?.trim()
  const pixOrigin = pixOriginRaw ? trimTrailingSlash(pixOriginRaw) : null

  const fromPixOrigin = pixOrigin
    ? {
        tokenUrl: `${pixOrigin}/auth/server/oauth/token`,
        pixBaseUrl: `${pixOrigin}/v1/spi`,
        batchBaseUrl: `${pixOrigin}/v1.1`,
      }
    : null

  const contasOriginRaw = process.env.BRADESCO_PROD_CONTAS_API_ORIGIN?.trim()
  const contasOrigin = contasOriginRaw ? trimTrailingSlash(contasOriginRaw) : null
  const contasFromOrigin = contasOrigin ? `${contasOrigin}/v1` : null

  return {
    tokenUrl: process.env.BRADESCO_PROD_TOKEN_URL ?? fromPixOrigin?.tokenUrl ?? PRODUCTION_TOKEN_URL,
    pixBaseUrl: process.env.BRADESCO_PROD_PIX_BASE_URL ?? fromPixOrigin?.pixBaseUrl ?? PRODUCTION_PIX_BASE_URL,
    batchBaseUrl:
      process.env.BRADESCO_PROD_BATCH_BASE_URL ?? fromPixOrigin?.batchBaseUrl ?? PRODUCTION_BATCH_BASE_URL,
    contasApiBaseUrl: normalizeContasApiV1BaseUrl(
      process.env.BRADESCO_PROD_CONTAS_BASE_URL ?? contasFromOrigin ?? PRODUCTION_CONTAS_API_BASE_URL
    ),
  }
}

export const getBradescoConfig = (overrideEnv?: BradescoEnvironment): BradescoEnvironmentConfig => {
  const environment: BradescoEnvironment =
    overrideEnv ?? (process.env.BRADESCO_ENV as BradescoEnvironment) ?? 'sandbox'

  const pagadorTipoChave = (process.env.BRADESCO_PAGADOR_TIPO_CHAVE ?? 'AGENCIACONTA') as
    | 'EVP'
    | 'CPFCNPJ'
    | 'TELEFONE'
    | 'EMAIL'
    | 'AGENCIACONTA'
  const pagadorChavePix = process.env.BRADESCO_PAGADOR_CHAVE_PIX
  const pagadorAgencia = process.env.BRADESCO_PAGADOR_AGENCIA
  const pagadorConta = process.env.BRADESCO_PAGADOR_CONTA

  if (environment === 'production') {
    const runtimeMtls = getRuntimeBradescoMtlsPaths(environment)
    const urls = resolveProductionApiUrls()
    const contasTokenUrl = resolveContasTokenUrl(
      process.env.BRADESCO_PROD_CONTAS_TOKEN_URL,
      urls.contasApiBaseUrl,
      urls.tokenUrl
    )
    return {
      environment,
      clientId: getRequiredEnv('BRADESCO_PROD_CLIENT_ID', environment),
      clientSecret: getRequiredEnv('BRADESCO_PROD_CLIENT_SECRET', environment),
      tokenUrl: urls.tokenUrl,
      pixBaseUrl: urls.pixBaseUrl,
      batchBaseUrl: urls.batchBaseUrl,
      contasApiBaseUrl: urls.contasApiBaseUrl,
      contasClientId: process.env.BRADESCO_PROD_CONTAS_CLIENT_ID?.trim() || undefined,
      contasClientSecret: process.env.BRADESCO_PROD_CONTAS_CLIENT_SECRET?.trim() || undefined,
      contasTokenUrl,
      pagadorTipoChave,
      pagadorChavePix,
      pagadorAgencia,
      pagadorConta,
      certPath: process.env.BRADESCO_PROD_CERT_PATH || runtimeMtls.certPath,
      keyPath: process.env.BRADESCO_PROD_KEY_PATH || runtimeMtls.keyPath,
      caPath: process.env.BRADESCO_PROD_CA_PATH || runtimeMtls.caPath,
      contasCertPath: process.env.BRADESCO_PROD_CONTAS_CERT_PATH || runtimeMtls.contasCertPath,
      contasKeyPath: process.env.BRADESCO_PROD_CONTAS_KEY_PATH || runtimeMtls.contasKeyPath,
      contasCaPath: process.env.BRADESCO_PROD_CONTAS_CA_PATH || runtimeMtls.contasCaPath,
    }
  }

  const runtimeMtls = getRuntimeBradescoMtlsPaths(environment)
  const urls = resolveSandboxApiUrls()
  const contasTokenUrl = resolveContasTokenUrl(
    process.env.BRADESCO_SANDBOX_CONTAS_TOKEN_URL,
    urls.contasApiBaseUrl,
    urls.tokenUrl
  )
  return {
    environment,
    clientId: getRequiredEnv('BRADESCO_SANDBOX_CLIENT_ID', environment),
    clientSecret: getRequiredEnv('BRADESCO_SANDBOX_CLIENT_SECRET', environment),
    tokenUrl: urls.tokenUrl,
    pixBaseUrl: urls.pixBaseUrl,
    batchBaseUrl: urls.batchBaseUrl,
    contasApiBaseUrl: urls.contasApiBaseUrl,
    contasClientId: process.env.BRADESCO_SANDBOX_CONTAS_CLIENT_ID?.trim() || undefined,
    contasClientSecret: process.env.BRADESCO_SANDBOX_CONTAS_CLIENT_SECRET?.trim() || undefined,
    contasTokenUrl,
    pagadorTipoChave,
    pagadorChavePix,
    pagadorAgencia,
    pagadorConta,
    certPath: process.env.BRADESCO_SANDBOX_CERT_PATH || runtimeMtls.certPath,
    keyPath: process.env.BRADESCO_SANDBOX_KEY_PATH || runtimeMtls.keyPath,
    caPath: process.env.BRADESCO_SANDBOX_CA_PATH || runtimeMtls.caPath,
    contasCertPath: process.env.BRADESCO_SANDBOX_CONTAS_CERT_PATH || runtimeMtls.contasCertPath,
    contasKeyPath: process.env.BRADESCO_SANDBOX_CONTAS_KEY_PATH || runtimeMtls.contasKeyPath,
    contasCaPath: process.env.BRADESCO_SANDBOX_CONTAS_CA_PATH || runtimeMtls.contasCaPath,
  }
}
