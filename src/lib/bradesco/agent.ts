/**
 * Cria um agente HTTPS com suporte a mTLS (autenticação mútua TLS)
 * exigido pela API Bradesco.
 *
 * Usa `undici` (disponível nativamente no Node.js 18+) para criar um agente
 * que apresenta o certificado do cliente durante o handshake TLS.
 */

import { Agent } from 'undici'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Cache de agents por configuração para evitar recriar a cada requisição
const agentCache = new Map<string, Agent>()

/**
 * Retorna um agente undici configurado com mTLS.
 * Se certPath/keyPath não forem fornecidos, retorna undefined (sem mTLS).
 */
export const getBradescoAgent = (
  certPath?: string,
  keyPath?: string,
  caPath?: string
): Agent | undefined => {
  if (!certPath || !keyPath) return undefined

  const cacheKey = `${certPath}::${keyPath}::${caPath ?? ''}`
  if (agentCache.has(cacheKey)) return agentCache.get(cacheKey)!

  const cwd = process.cwd()

  let cert: Buffer
  let key: Buffer
  let ca: Buffer | undefined

  try {
    cert = readFileSync(resolve(cwd, certPath))
    key = readFileSync(resolve(cwd, keyPath))
    if (caPath) ca = readFileSync(resolve(cwd, caPath))
  } catch (err) {
    throw new Error(
      `[BradescoLib] Erro ao ler certificados mTLS: ${(err as Error).message}\n` +
      `  cert: ${certPath}\n  key: ${keyPath}${caPath ? `\n  ca: ${caPath}` : ''}`
    )
  }

  if (!cert.length || !key.length) {
    throw new Error(
      `[BradescoLib] Arquivo de certificado ou chave privada está vazio (0 bytes).\n` +
        `  cert: ${certPath}\n  key: ${keyPath}`
    )
  }

  const agent = new Agent({
    connect: {
      cert,
      key,
      ...(ca ? { ca } : {}),
      // Desativa verificação do hostname no sandbox (certificado auto-assinado)
      rejectUnauthorized: process.env.BRADESCO_ENV !== 'sandbox'
        ? true
        : (process.env.BRADESCO_SANDBOX_REJECT_UNAUTHORIZED !== 'false'),
    },
  })

  agentCache.set(cacheKey, agent)

  console.log(`[BradescoLib] Agente mTLS criado - cert: ${certPath}`)

  return agent
}
