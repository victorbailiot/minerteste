import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type BradescoEnvironment = 'sandbox' | 'production'

interface BradescoRuntimeMtlsPaths {
  certPath?: string
  keyPath?: string
  caPath?: string
  contasCertPath?: string
  contasKeyPath?: string
  contasCaPath?: string
}

const runtimePathCache = new Map<BradescoEnvironment, BradescoRuntimeMtlsPaths>()

const decodeBase64File = (base64Value: string, envKey: string): Buffer => {
  const normalized = base64Value.replace(/\s+/g, '')
  let decoded: Buffer

  try {
    decoded = Buffer.from(normalized, 'base64')
  } catch (error) {
    throw new Error(
      `[BradescoLib] Valor inválido em ${envKey}: não foi possível decodificar base64 (${(error as Error).message})`
    )
  }

  if (!decoded.length) {
    throw new Error(`[BradescoLib] Valor inválido em ${envKey}: conteúdo base64 vazio`)
  }

  return decoded
}

const persistTempFile = (
  environment: BradescoEnvironment,
  label: string,
  extension: string,
  content: Buffer
): string => {
  const digest = createHash('sha256').update(content).digest('hex').slice(0, 16)
  const directory = join(tmpdir(), 'bradesco-mtls', environment)
  const filePath = join(directory, `${label}-${digest}.${extension}`)
  mkdirSync(directory, { recursive: true })
  writeFileSync(filePath, content)
  return filePath
}

const createPathFromBase64Env = (
  environment: BradescoEnvironment,
  envKey: string,
  label: string,
  extension: string
): string | undefined => {
  const envValue = process.env[envKey]?.trim()
  if (!envValue) return undefined

  const decoded = decodeBase64File(envValue, envKey)
  return persistTempFile(environment, label, extension, decoded)
}

export const getRuntimeBradescoMtlsPaths = (
  environment: BradescoEnvironment
): BradescoRuntimeMtlsPaths => {
  const cached = runtimePathCache.get(environment)
  if (cached) return cached

  const prefix = environment === 'production' ? 'BRADESCO_PROD' : 'BRADESCO_SANDBOX'
  const paths: BradescoRuntimeMtlsPaths = {
    certPath: createPathFromBase64Env(environment, `${prefix}_CERT_BASE64`, 'pix-cert', 'pem'),
    keyPath: createPathFromBase64Env(environment, `${prefix}_KEY_BASE64`, 'pix-key', 'key'),
    caPath: createPathFromBase64Env(environment, `${prefix}_CA_BASE64`, 'pix-ca', 'crt'),
    contasCertPath: createPathFromBase64Env(
      environment,
      `${prefix}_CONTAS_CERT_BASE64`,
      'contas-cert',
      'pem'
    ),
    contasKeyPath: createPathFromBase64Env(
      environment,
      `${prefix}_CONTAS_KEY_BASE64`,
      'contas-key',
      'key'
    ),
    contasCaPath: createPathFromBase64Env(environment, `${prefix}_CONTAS_CA_BASE64`, 'contas-ca', 'crt'),
  }

  runtimePathCache.set(environment, paths)
  return paths
}
