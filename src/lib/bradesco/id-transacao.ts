/**
 * Campo `idtransacao` na API Pix Bradesco / SPI (BCB).
 * Valores com hífen são rejeitados com PgtoTransferenciaOperacaoInvalida ("não respeita o schema").
 * Referência: exemplos oficiais em `bradesco.json` (ex.: Teste00000000000002, 3835678).
 */

const MAX_LEN = 35

/** Mantém apenas A–Z, a–z, 0–9 e limita a 35 caracteres. */
export const normalizeBradescoIdTransacaoInput = (raw: string): string =>
  raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, MAX_LEN)

/**
 * Id único por tentativa, correlacionável ao saque: prefixo `W{id}Z` evita ambiguidade
 * entre ids como 1 e 11 em um simples `startsWith`.
 */
export const buildBradescoPixIdTransacaoForWithdrawal = (
  withdrawalId: number | bigint
): string => {
  const id = String(withdrawalId)
  const ts = Date.now()
  const rnd = Math.random().toString(36).slice(2, 10)
  return normalizeBradescoIdTransacaoInput(`W${id}Z${ts}${rnd}`)
}

/** Prefixo usado para localizar o id de transação de um saque em listas (ex.: lote). */
export const bradescoIdTransacaoWithdrawalPrefix = (withdrawalId: number | bigint): string =>
  `W${withdrawalId}Z`
